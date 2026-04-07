import express from "express";
import db from "../db.js";
import { filterByTenant } from "../middleware/tenant.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);
router.use(filterByTenant);

router.get("/", async (req, res) => {
  try {
    const baseQuery = `
      SELECT p.id, p.monto, p.formaPago, p.descripcion, p.fecha, p.documentoId,
             c.nombre as clienteNombre, c.id as clienteId,
             d.tipo as documentoTipo, d.numero as documentoNumero, d.empresa as documentoEmpresa
      FROM pagos p
      JOIN clientes c ON p.clienteId = c.id
      LEFT JOIN documentos d ON p.documentoId = d.id
      WHERE p.tenant = '${req.userTenant}'
      ORDER BY p.id DESC`;

    const pagos = await db.prepare(baseQuery).all();

    const pagosConDetalles = await Promise.all(
      pagos.map(async (pago) => {
        const detalles = await db
          .prepare(
            `SELECT id, formaPago, monto, numeroCheque, fechaCobro, banco, fecha, documentoId, documentoTipo, documentoNumero FROM pagos_detalle WHERE pagoId = ?`,
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
    const baseQuery = `
      SELECT p.id, p.monto, p.formaPago, p.descripcion, p.fecha, p.documentoId,
             c.nombre as clienteNombre, c.id as clienteId,
             d.tipo as documentoTipo, d.numero as documentoNumero, d.empresa as documentoEmpresa
      FROM pagos p
      JOIN clientes c ON p.clienteId = c.id
      LEFT JOIN documentos d ON p.documentoId = d.id
      WHERE p.id = ? AND p.tenant = '${req.userTenant}'`;

    const pago = await db.prepare(baseQuery).get(req.params.id);

    if (!pago)
      return res
        .status(404)
        .json({ success: false, message: "Pago no encontrado" });

    // Obtener detalles de pago
    const detalles = await db
      .prepare(
        `SELECT id, formaPago, monto, numeroCheque, fechaCobro, banco, fecha FROM pagos_detalle WHERE pagoId = ?`,
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

    // Verificar que el cliente existe y pertenece al tenant
    const clienteQuery = `SELECT * FROM clientes WHERE id = ? AND tenant = '${req.userTenant}'`;
    const cliente = await db.prepare(clienteQuery).get(clienteId);
    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, message: "Cliente no encontrado" });
    }

    // Verificar que el documento existe y pertenece al tenant si se proporciona
    let validDocumentoId = null;
    if (documentoId) {
      let docQuery = "SELECT * FROM documentos WHERE id = ?";
      if (!req.isAdmin) {
        docQuery += ` AND tenant = '${req.userTenant}'`;
      }
      const documento = await db.prepare(docQuery).get(documentoId);
      if (!documento) {
        return res
          .status(404)
          .json({ success: false, message: "Documento no encontrado" });
      }
      validDocumentoId = documentoId;
    }

    const montoRedondeado = Math.round(parseFloat(monto) * 100) / 100;

    const insertPago = db.prepare(`
      INSERT INTO pagos (clienteId, documentoId, monto, formaPago, fecha, descripcion, tenant)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await insertPago.run(
      clienteId,
      validDocumentoId,
      montoRedondeado,
      formaPago || "Transferencia",
      fecha || new Date().toISOString().split("T")[0],
      descripcion || "",
      req.userTenant,
    );

    const pagoId = result.lastInsertRowid;

    const insertDetalle = db.prepare(`
      INSERT INTO pagos_detalle (pagoId, formaPago, monto, numeroCheque, fechaCobro, banco, fecha, documentoId, documentoTipo, documentoNumero)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (
      detallesPago &&
      Array.isArray(detallesPago) &&
      detallesPago.length > 0
    ) {
      for (const detalle of detallesPago) {
        const montoDetalleRedondeado =
          Math.round(parseFloat(detalle.monto) * 100) / 100;

        let docTipo = null;
        let docNumero = null;
        if (detalle.documentoId) {
          const doc = await db
            .prepare("SELECT tipo, numero FROM documentos WHERE id = ?")
            .get(detalle.documentoId);
          if (doc) {
            docTipo = doc.tipo;
            docNumero = doc.numero;
          }
        }

        await insertDetalle.run(
          pagoId,
          detalle.formaPago,
          montoDetalleRedondeado,
          detalle.numeroCheque || null,
          detalle.fechaCobro || null,
          detalle.banco || null,
          detalle.fecha || null,
          detalle.documentoId || null,
          docTipo,
          docNumero,
        );
      }
    } else {
      let docTipo = null;
      let docNumero = null;
      if (validDocumentoId) {
        const doc = await db
          .prepare("SELECT tipo, numero FROM documentos WHERE id = ?")
          .get(validDocumentoId);
        if (doc) {
          docTipo = doc.tipo;
          docNumero = doc.numero;
        }
      }

      await insertDetalle.run(
        pagoId,
        formaPago || "Transferencia",
        montoRedondeado,
        null,
        null,
        null,
        null,
        validDocumentoId,
        docTipo,
        docNumero,
      );
    }

    const nuevoSaldo =
      Math.round((cliente.saldo - montoRedondeado) * 100) / 100;
    await db
      .prepare("UPDATE clientes SET saldo = ? WHERE id = ?")
      .run(nuevoSaldo, clienteId);

    const saldoFavorUsado = detallesPago?.find(
      (d) => d.formaPago === "Saldo a Favor",
    );
    if (saldoFavorUsado && saldoFavorUsado.monto > 0) {
      const saldoFavorQuery = `SELECT * FROM documentos WHERE clienteId = ? AND saldoPendiente < 0 AND tenant = '${req.userTenant}' ORDER BY fecha ASC`;

      const facturasConSaldoFavor = await db
        .prepare(saldoFavorQuery)
        .all(clienteId);

      let montoRestante =
        Math.round(parseFloat(saldoFavorUsado.monto) * 100) / 100;

      for (const factura of facturasConSaldoFavor) {
        if (montoRestante <= 0) break;

        const saldoNegativo = Math.abs(factura.saldoPendiente);
        const montoAAplicar = Math.min(montoRestante, saldoNegativo);

        const nuevoSaldoFactura =
          Math.round((factura.saldoPendiente + montoAAplicar) * 100) / 100;
        await db
          .prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?")
          .run(nuevoSaldoFactura, factura.id);

        montoRestante = Math.round((montoRestante - montoAAplicar) * 100) / 100;
      }
    }

    const documentosConPago =
      detallesPago?.filter((d) => d.documentoId && d.monto > 0) || [];

    if (documentosConPago.length > 0) {
      for (const detalle of documentosConPago) {
        const documento = await db
          .prepare("SELECT saldoPendiente FROM documentos WHERE id = ?")
          .get(detalle.documentoId);

        if (documento) {
          const montoAplicado =
            Math.round(parseFloat(detalle.monto) * 100) / 100;
          const nuevoSaldoPendiente =
            Math.round((documento.saldoPendiente - montoAplicado) * 100) / 100;
          await db
            .prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?")
            .run(nuevoSaldoPendiente, detalle.documentoId);
        }
      }
    } else if (validDocumentoId) {
      const documento = await db
        .prepare("SELECT saldoPendiente FROM documentos WHERE id = ?")
        .get(validDocumentoId);

      if (documento) {
        const nuevoSaldoPendiente =
          Math.round((documento.saldoPendiente - montoRedondeado) * 100) / 100;
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

    // Verificar que el documento existe y pertenece al tenant si se proporciona
    let validDocumentoId = documentoId || null;
    if (documentoId) {
      const docQuery = `SELECT * FROM documentos WHERE id = ? AND tenant = '${req.userTenant}'`;
      const documento = await db.prepare(docQuery).get(documentoId);
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
      WHERE id = ? AND tenant = '${req.userTenant}'
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
    const pagoQuery = `SELECT * FROM pagos WHERE id = ? AND tenant = '${req.userTenant}'`;
    const pago = await db.prepare(pagoQuery).get(req.params.id);
    if (!pago)
      return res
        .status(404)
        .json({ success: false, message: "Pago no encontrado" });

    // Obtener detalles del pago para revertir los saldos de documentos
    const detallesPago = await db
      .prepare("SELECT * FROM pagos_detalle WHERE pagoId = ?")
      .all(req.params.id);

    // Revertir saldos de documentos (sumar el monto pagado de vuelta al saldo pendiente)
    if (detallesPago && detallesPago.length > 0) {
      for (const detalle of detallesPago) {
        // Solo revertir si no es "Saldo a Favor" y tiene documentoId
        if (detalle.formaPago !== "Saldo a Favor" && detalle.documentoId) {
          const documento = await db
            .prepare("SELECT saldoPendiente FROM documentos WHERE id = ?")
            .get(detalle.documentoId);

          if (documento) {
            const montoARevertir =
              Math.round(parseFloat(detalle.monto) * 100) / 100;
            const nuevoSaldoPendiente =
              Math.round((documento.saldoPendiente + montoARevertir) * 100) /
              100;
            await db
              .prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?")
              .run(nuevoSaldoPendiente, detalle.documentoId);
          }
        }
      }
    } else if (pago.documentoId) {
      // Pago simple sin detalles
      const documento = await db
        .prepare("SELECT saldoPendiente FROM documentos WHERE id = ?")
        .get(pago.documentoId);

      if (documento) {
        const montoARevertir = Math.round(parseFloat(pago.monto) * 100) / 100;
        const nuevoSaldoPendiente =
          Math.round((documento.saldoPendiente + montoARevertir) * 100) / 100;
        await db
          .prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?")
          .run(nuevoSaldoPendiente, pago.documentoId);
      }
    }

    // Revertir el saldo del cliente (sumar el monto al reversar el pago)
    const cliente = await db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(pago.clienteId);
    const nuevoSaldo = Math.round((cliente.saldo + pago.monto) * 100) / 100;
    await db
      .prepare("UPDATE clientes SET saldo = ? WHERE id = ?")
      .run(nuevoSaldo, pago.clienteId);

    // Eliminar detalles del pago
    await db
      .prepare("DELETE FROM pagos_detalle WHERE pagoId = ?")
      .run(req.params.id);

    // Eliminar el pago
    await db.prepare("DELETE FROM pagos WHERE id = ?").run(req.params.id);

    res.json({ success: true, message: "Pago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
