import express from "express";
import db from "../db.js";

const router = express.Router();

// GET - Obtener todos los documentos
router.get("/", (req, res) => {
  try {
    const documentos = db
      .prepare("SELECT * FROM documentos ORDER BY fecha DESC")
      .all();
    res.json({ success: true, data: documentos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener documentos pendientes de un cliente
router.get("/cliente/:clienteId", (req, res) => {
  try {
    const { clienteId } = req.params;
    const documentos = db
      .prepare(
        "SELECT * FROM documentos WHERE clienteId = ? AND saldoPendiente > 0 ORDER BY fecha DESC",
      )
      .all(clienteId);
    res.json({ success: true, data: documentos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Crear documento
router.post("/", (req, res) => {
  try {
    const { clienteId, tipo, numero, empresa, monto, fecha } = req.body;

    if (!clienteId || !tipo || !numero || !empresa || !monto) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    // Redondear a 2 decimales para evitar problemas de precisión
    const montoRedondeado = Math.round(parseFloat(monto) * 100) / 100;

    const resultado = db
      .prepare(
        "INSERT INTO documentos (clienteId, tipo, numero, empresa, monto, saldoPendiente, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        clienteId,
        tipo,
        numero,
        empresa,
        montoRedondeado,
        montoRedondeado,
        fecha,
      );

    const documento = db
      .prepare("SELECT * FROM documentos WHERE id = ?")
      .get(resultado.lastInsertRowid);

    res.json({ success: true, data: documento });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Actualizar documento
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { saldoPendiente } = req.body;

    // Redondear a 2 decimales para evitar problemas de precisión
    const saldoRedondeado = Math.round(parseFloat(saldoPendiente) * 100) / 100;

    const resultado = db
      .prepare("UPDATE documentos SET saldoPendiente = ? WHERE id = ?")
      .run(saldoRedondeado, id);

    if (resultado.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Documento no encontrado" });
    }

    const documento = db
      .prepare("SELECT * FROM documentos WHERE id = ?")
      .get(id);

    res.json({ success: true, data: documento });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Eliminar documento
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const resultado = db.prepare("DELETE FROM documentos WHERE id = ?").run(id);

    if (resultado.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Documento no encontrado" });
    }

    res.json({ success: true, message: "Documento eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
