import express from "express";
import db from "../db.js";
import { filterByTenant } from "../middleware/tenant.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);
router.use(filterByTenant);

router.get("/", async (req, res) => {
  try {
    const query = `SELECT * FROM documentos WHERE tenant = '${req.userTenant}' ORDER BY fecha DESC`;
    const documentos = await db.prepare(query).all();
    res.json({ success: true, data: documentos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener documentos pendientes de un cliente
router.get("/cliente/:clienteId", async (req, res) => {
  try {
    const { clienteId } = req.params;
    const query = `SELECT * FROM documentos WHERE clienteId = ? AND tenant = '${req.userTenant}' ORDER BY fecha DESC`;
    const documentos = await db.prepare(query).all(clienteId);
    res.json({ success: true, data: documentos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener saldo a favor total del cliente
router.get("/cliente/:clienteId/saldo-favor", async (req, res) => {
  try {
    const { clienteId } = req.params;
    const query = `SELECT * FROM documentos WHERE clienteId = ? AND saldoPendiente < 0 AND tenant = '${req.userTenant}'`;
    const documentos = await db.prepare(query).all(clienteId);

    const saldoFavorTotal = documentos.reduce(
      (sum, doc) => sum + Math.abs(doc.saldoPendiente),
      0,
    );

    res.json({
      success: true,
      data: {
        saldoFavorTotal: Math.round(saldoFavorTotal * 100) / 100,
        documentos,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Crear documento
router.post("/", async (req, res) => {
  try {
    const { clienteId, tipo, numero, empresa, monto, fecha } = req.body;

    if (!clienteId || !tipo || !numero || !empresa || !monto) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    const montoRedondeado = Math.round(parseFloat(monto) * 100) / 100;

    const resultado = await db
      .prepare(
        "INSERT INTO documentos (clienteId, tipo, numero, empresa, monto, saldoPendiente, fecha, tenant) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        clienteId,
        tipo,
        numero,
        empresa,
        montoRedondeado,
        montoRedondeado,
        fecha,
        req.userTenant,
      );

    const documento = await db
      .prepare("SELECT * FROM documentos WHERE id = ?")
      .get(resultado.lastInsertRowid);

    res.json({ success: true, data: documento });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Actualizar documento
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { saldoPendiente } = req.body;

    // Redondear a 2 decimales para evitar problemas de precisión
    const saldoRedondeado = Math.round(parseFloat(saldoPendiente) * 100) / 100;

    const query = `UPDATE documentos SET saldoPendiente = ? WHERE id = ? AND tenant = '${req.userTenant}'`;
    const resultado = await db.prepare(query).run(saldoRedondeado, id);

    if (resultado.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Documento no encontrado" });
    }

    const documento = await db
      .prepare("SELECT * FROM documentos WHERE id = ?")
      .get(id);

    res.json({ success: true, data: documento });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Eliminar documento
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el documento existe
    const docQuery = `SELECT * FROM documentos WHERE id = ? AND tenant = '${req.userTenant}'`;
    const documento = await db.prepare(docQuery).get(id);

    if (!documento) {
      return res
        .status(404)
        .json({ success: false, message: "Documento no encontrado" });
    }

    // Buscar pagos asociados a este documento (tanto directos como en detalles)
    const pagosDirectos = await db
      .prepare("SELECT id FROM pagos WHERE documentoId = ?")
      .all(id);

    const pagosConDetalles = await db
      .prepare(
        "SELECT DISTINCT pagoId FROM pagos_detalle WHERE documentoId = ?",
      )
      .all(id);

    // Verificar si hay pagos asociados
    const totalPagos = pagosDirectos.length + pagosConDetalles.length;

    if (totalPagos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el documento porque tiene ${totalPagos} pago(s) asociado(s). Elimina primero los pagos.`,
      });
    }

    // Si no hay pagos asociados, eliminar el documento
    const deleteQuery = `DELETE FROM documentos WHERE id = ? AND tenant = '${req.userTenant}'`;
    await db.prepare(deleteQuery).run(id);

    res.json({ success: true, message: "Documento eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
