import express from "express";
import db from "../db.js";

const router = express.Router();

// GET - Obtener todos los pagos
router.get("/", async (req, res) => {
  try {
    const pagos = await db
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

    // Obtener detalles de pago para cada pago
    const pagosConDetalles = await Promise.all(
      pagos.map(async (pago) => {
        const detalles = await db
          .prepare(
            `SELECT id, formaPago, monto FROM pagos_detalle WHERE pagoId = ?`,
          )
          .all(pago.id);
        return { ...pago, detallesPago: detalles };
      }),
    );

    res.json({ success: true, data: pagosConDetalles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener pago por ID
router.get("/:id", async (req, res) => {
  try {
    const pago = await db
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

    // Obtener detalles de pago
    const detalles = await db
      .prepare(
        `SELECT id, formaPago, monto FROM pagos_detalle WHERE pagoId = ?`,
      )
      .all(pago.id);

    res.json({ success: true, data: { ...pago, detallesPago: detalles } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Crear nuevo pago
router.post("/", async (req, res) => {
  try {
    const {
      clienteId,
      documentoId,
      monto,
      formaPago,
      fecha,
      descripcion,
      detallesPago,
    } = req.body;

    if (!clienteId || !monto) {
      return res
        .status(400)
        .json({ success: false, message: "clienteId y monto son requeridos" });
    }

    // Verificar que el cliente existe
    const cliente = await db
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
      const documento = await db
        .prepare("SELECT * FROM documentos WHERE id = ?")
        .get(documentoId);
      if (!documento) {
        return res
          .status(404)
          .json({ success: false, message: "Documento no encontrado" });
      }
      validDocumentoId = documentoId;
    }

    // Redondear montos a 2 decimales para evitar problemas de precisión
    const montoRedondeado = Math.round(parseFloat(monto) * 100) / 100;

    // Insertar pago principal
    const insertPago = db.prepare(`
      INSERT INTO pagos (clienteId, documentoId, monto, formaPago, fecha, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = await insertPago.run(
      clienteId,
      validDocumentoId,
      montoRedondeado,
      formaPago || "Transferencia",
      fecha || new Date().toISOString().split("T")[0],
      descripcion || "",
    );

    const pagoId = result.lastInsertRowid;

    // Insertar detalles de pago
    const insertDetalle = db.prepare(`
      INSERT INTO pagos_detalle (pagoId, formaPago, monto)
      VALUES (?, ?, ?)
    `);

    if (
      detallesPago &&
      Array.isArray(detallesPago) &&
      detallesPago.length > 0
    ) {
      for (const detalle of detallesPago) {
        const montoDetalleRedondeado =
          Math.round(parseFloat(detalle.monto) * 100) / 100;
        await insertDetalle.run(
          pagoId,
          detalle.formaPago,
          montoDetalleRedondeado,
        );
      }
    } else {
      // Si no hay detalles, crear uno con el monto total
      await insertDetalle.run(
        pagoId,
        formaPago || "Transferencia",
        montoRedondeado,
      );
    }

    // Actualizar el saldo del cliente (restar el monto del pago)
    const nuevoSaldo =
      Math.round((cliente.saldo - montoRedondeado) * 100) / 100;
    await db
      .prepare("UPDATE clientes SET saldo = ? WHERE id = ?")
      .run(nuevoSaldo, clienteId);

    // Actualizar el saldo pendiente del documento si existe
    if (validDocumentoId) {
      const documento = await db
        .prepare("SELECT saldoPendiente FROM documentos WHERE id = ?")
        .get(validDocumentoId);

      if (documento) {
        const nuevoSaldoPendiente = Math.max(
          0,
          Math.round((documento.saldoPendiente - montoRedondeado) * 100) / 100,
        );
        await db
          .prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?")
          .run(nuevoSaldoPendiente, validDocumentoId);
      }
    }

    // Obtener el pago creado con sus detalles
    const nuevoPago = await db
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
      .get(pagoId);

    const detalles = await db
      .prepare(
        `SELECT id, formaPago, monto FROM pagos_detalle WHERE pagoId = ?`,
      )
      .all(pagoId);

    res
      .status(201)
      .json({ success: true, data: { ...nuevoPago, detallesPago: detalles } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Actualizar pago
router.put("/:id", async (req, res) => {
  try {
    const { monto, formaPago, fecha, descripcion, documentoId } = req.body;

    // Verificar que el documento existe si se proporciona
    let validDocumentoId = documentoId || null;
    if (documentoId) {
      const documento = await db
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

    await stmt.run(
      monto || null,
      formaPago || null,
      fecha || null,
      descripcion || null,
      validDocumentoId,
      req.params.id,
    );

    const pagoActualizado = await db
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
router.delete("/:id", async (req, res) => {
  try {
    const pago = await db
      .prepare("SELECT * FROM pagos WHERE id = ?")
      .get(req.params.id);
    if (!pago)
      return res
        .status(404)
        .json({ success: false, message: "Pago no encontrado" });

    // Revertir el saldo del cliente (sumar el monto al reversar el pago)
    const cliente = await db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(pago.clienteId);
    const nuevoSaldo = cliente.saldo + pago.monto;
    await db
      .prepare("UPDATE clientes SET saldo = ? WHERE id = ?")
      .run(nuevoSaldo, pago.clienteId);

    await db.prepare("DELETE FROM pagos WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Pago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
