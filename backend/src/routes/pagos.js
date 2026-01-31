import express from "express";
import db from "../db.js";

const router = express.Router();

// GET - Obtener todos los pagos
router.get("/", (req, res) => {
  try {
    const pagos = db
      .prepare(
        `
      SELECT p.id, p.monto, p.formaPago, p.descripcion, p.fecha, p.documentoId,
             c.nombre as clienteNombre, c.id as clienteId,
             d.tipo as documentoTipo, d.numero as documentoNumero, d.empresa as documentoEmpresa
      FROM pagos p
      JOIN clientes c ON p.clienteId = c.id
      LEFT JOIN documentos d ON p.documentoId = d.id
      ORDER BY p.fecha DESC
    `,
      )
      .all();
    res.json({ success: true, data: pagos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener pago por ID
router.get("/:id", (req, res) => {
  try {
    const pago = db
      .prepare(
        `
      SELECT p.id, p.monto, p.formaPago, p.descripcion, p.fecha, p.documentoId,
             c.nombre as clienteNombre, c.id as clienteId,
             d.tipo as documentoTipo, d.numero as documentoNumero, d.empresa as documentoEmpresa
      FROM pagos p
      JOIN clientes c ON p.clienteId = c.id
      LEFT JOIN documentos d ON p.documentoId = d.id
      WHERE p.id = ?
    `,
      )
      .get(req.params.id);

    if (!pago)
      return res
        .status(404)
        .json({ success: false, message: "Pago no encontrado" });
    res.json({ success: true, data: pago });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Crear nuevo pago
router.post("/", (req, res) => {
  try {
    const { clienteId, documentoId, monto, formaPago, fecha, descripcion } =
      req.body;

    if (!clienteId || !monto) {
      return res
        .status(400)
        .json({ success: false, message: "clienteId y monto son requeridos" });
    }

    // Verificar que el cliente existe
    const cliente = db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(clienteId);
    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, message: "Cliente no encontrado" });
    }

    // Verificar que el documento existe si se proporciona
    let validDocumentoId = null;
    if (documentoId) {
      const documento = db
        .prepare("SELECT * FROM documentos WHERE id = ?")
        .get(documentoId);
      if (!documento) {
        return res
          .status(404)
          .json({ success: false, message: "Documento no encontrado" });
      }
      validDocumentoId = documentoId;
    }

    const stmt = db.prepare(`
      INSERT INTO pagos (clienteId, documentoId, monto, formaPago, fecha, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      clienteId,
      validDocumentoId,
      monto,
      formaPago || "Transferencia",
      fecha || new Date().toISOString().split("T")[0],
      descripcion || "",
    );

    // Actualizar el saldo del cliente (restar el monto del pago)
    const nuevoSaldo = cliente.saldo - monto;
    db.prepare("UPDATE clientes SET saldo = ? WHERE id = ?").run(
      nuevoSaldo,
      clienteId,
    );

    // Actualizar el saldo pendiente del documento si existe
    if (validDocumentoId) {
      const documento = db
        .prepare("SELECT saldoPendiente FROM documentos WHERE id = ?")
        .get(validDocumentoId);

      if (documento) {
        const nuevoSaldoPendiente = Math.max(
          0,
          documento.saldoPendiente - monto,
        );
        db.prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?").run(
          nuevoSaldoPendiente,
          validDocumentoId,
        );
      }
    }

    const nuevoPago = db
      .prepare(
        `
      SELECT p.id, p.monto, p.formaPago, p.descripcion, p.fecha, p.documentoId,
             c.nombre as clienteNombre, c.id as clienteId,
             d.tipo as documentoTipo, d.numero as documentoNumero, d.empresa as documentoEmpresa
      FROM pagos p
      JOIN clientes c ON p.clienteId = c.id
      LEFT JOIN documentos d ON p.documentoId = d.id
      WHERE p.id = ?
    `,
      )
      .get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: nuevoPago });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Actualizar pago
router.put("/:id", (req, res) => {
  try {
    const { monto, formaPago, fecha, descripcion, documentoId } = req.body;

    // Verificar que el documento existe si se proporciona
    let validDocumentoId = documentoId || null;
    if (documentoId) {
      const documento = db
        .prepare("SELECT * FROM documentos WHERE id = ?")
        .get(documentoId);
      if (!documento) {
        return res
          .status(404)
          .json({ success: false, message: "Documento no encontrado" });
      }
    }

    const stmt = db.prepare(`
      UPDATE pagos
      SET monto = COALESCE(?, monto),
          formaPago = COALESCE(?, formaPago),
          fecha = COALESCE(?, fecha),
          descripcion = COALESCE(?, descripcion),
          documentoId = COALESCE(?, documentoId)
      WHERE id = ?
    `);

    stmt.run(
      monto || null,
      formaPago || null,
      fecha || null,
      descripcion || null,
      validDocumentoId,
      req.params.id,
    );

    const pagoActualizado = db
      .prepare(
        `
      SELECT p.id, p.monto, p.formaPago, p.descripcion, p.fecha, p.documentoId,
             c.nombre as clienteNombre, c.id as clienteId,
             d.tipo as documentoTipo, d.numero as documentoNumero, d.empresa as documentoEmpresa
      FROM pagos p
      JOIN clientes c ON p.clienteId = c.id
      LEFT JOIN documentos d ON p.documentoId = d.id
      WHERE p.id = ?
    `,
      )
      .get(req.params.id);

    if (!pagoActualizado)
      return res
        .status(404)
        .json({ success: false, message: "Pago no encontrado" });

    res.json({ success: true, data: pagoActualizado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Eliminar pago
router.delete("/:id", (req, res) => {
  try {
    const pago = db
      .prepare("SELECT * FROM pagos WHERE id = ?")
      .get(req.params.id);
    if (!pago)
      return res
        .status(404)
        .json({ success: false, message: "Pago no encontrado" });

    // Revertir el saldo del cliente (sumar el monto al reversar el pago)
    const cliente = db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(pago.clienteId);
    const nuevoSaldo = cliente.saldo + pago.monto;
    db.prepare("UPDATE clientes SET saldo = ? WHERE id = ?").run(
      nuevoSaldo,
      pago.clienteId,
    );

    db.prepare("DELETE FROM pagos WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Pago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
