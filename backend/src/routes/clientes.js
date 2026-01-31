import express from "express";
import db from "../db.js";

const router = express.Router();

// GET - Obtener todos los clientes
router.get("/", (req, res) => {
  try {
    const clientes = db
      .prepare("SELECT * FROM clientes ORDER BY createdAt DESC")
      .all();
    res.json({ success: true, data: clientes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener cliente por ID
router.get("/:id", (req, res) => {
  try {
    const cliente = db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(req.params.id);
    if (!cliente)
      return res
        .status(404)
        .json({ success: false, message: "Cliente no encontrado" });
    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Crear cliente
router.post("/", (req, res) => {
  try {
    const { nombre, empresa, tipoDocumento, numeroDocumento, saldo, fecha } =
      req.body;

    if (!nombre || !empresa) {
      return res
        .status(400)
        .json({ success: false, message: "Nombre y empresa son requeridos" });
    }

    const nombreNormalizado = nombre.trim();
    const empresaNormalizada = empresa.trim();

    // Validación de duplicado (nombre + empresa)
    const duplicado = db
      .prepare("SELECT id FROM clientes WHERE nombre = ? AND empresa = ?")
      .get(nombreNormalizado, empresaNormalizada);

    if (duplicado) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un cliente con ese nombre y empresa",
      });
    }

    // Verificar si ya existe un documento con el mismo tipo y número
    if (numeroDocumento && numeroDocumento.trim && numeroDocumento.trim()) {
      const documentoExistente = db
        .prepare(
          "SELECT * FROM clientes WHERE tipoDocumento = ? AND numeroDocumento = ?",
        )
        .get(tipoDocumento || "Factura", numeroDocumento.trim());

      if (documentoExistente) {
        return res.status(400).json({
          success: false,
          message: "Este número de documento ya existe",
        });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO clientes (nombre, empresa, tipoDocumento, numeroDocumento, saldo, fecha)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      nombreNormalizado,
      empresaNormalizada,
      tipoDocumento || "Factura",
      numeroDocumento ? numeroDocumento.trim() : "",
      saldo || 0,
      fecha || null,
    );

    const nuevoCliente = db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: nuevoCliente });
  } catch (error) {
    // Si el índice único dispara, devolvemos 400 con mensaje claro
    if (String(error.message || "").includes("SQLITE_CONSTRAINT")) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un cliente con ese nombre y empresa",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Actualizar cliente
router.put("/:id", (req, res) => {
  try {
    const { nombre, empresa, tipoDocumento, numeroDocumento, saldo, fecha } =
      req.body;

    // Validación de duplicado (nombre + empresa) excluyendo el mismo id
    if (nombre && empresa) {
      const nombreNormalizado = nombre.trim();
      const empresaNormalizada = empresa.trim();

      const duplicado = db
        .prepare(
          "SELECT id FROM clientes WHERE nombre = ? AND empresa = ? AND id != ?",
        )
        .get(nombreNormalizado, empresaNormalizada, req.params.id);

      if (duplicado) {
        return res.status(400).json({
          success: false,
          message: "Ya existe un cliente con ese nombre y empresa",
        });
      }
    }

    // Verificar si ya existe otro documento con el mismo tipo y número
    if (numeroDocumento && numeroDocumento.trim && numeroDocumento.trim()) {
      const documentoExistente = db
        .prepare(
          "SELECT * FROM clientes WHERE tipoDocumento = ? AND numeroDocumento = ? AND id != ?",
        )
        .get(tipoDocumento || "Factura", numeroDocumento.trim(), req.params.id);

      if (documentoExistente) {
        return res.status(400).json({
          success: false,
          message: "Este número de documento ya existe",
        });
      }
    }

    const stmt = db.prepare(`
      UPDATE clientes
      SET nombre = COALESCE(?, nombre),
          empresa = COALESCE(?, empresa),
          tipoDocumento = COALESCE(?, tipoDocumento),
          numeroDocumento = COALESCE(?, numeroDocumento),
          saldo = COALESCE(?, saldo),
          fecha = COALESCE(?, fecha),
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      nombre || null,
      empresa || null,
      tipoDocumento || null,
      numeroDocumento || null,
      saldo !== undefined ? saldo : null,
      fecha || null,
      req.params.id,
    );

    const clienteActualizado = db
      .prepare("SELECT * FROM clientes WHERE id = ?")
      .get(req.params.id);
    if (!clienteActualizado)
      return res
        .status(404)
        .json({ success: false, message: "Cliente no encontrado" });

    res.json({ success: true, data: clienteActualizado });
  } catch (error) {
    if (String(error.message || "").includes("SQLITE_CONSTRAINT")) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un cliente con ese nombre y empresa",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Eliminar cliente
router.delete("/:id", (req, res) => {
  try {
    const stmt = db.prepare("DELETE FROM clientes WHERE id = ?");
    const result = stmt.run(req.params.id);

    if (result.changes === 0)
      return res
        .status(404)
        .json({ success: false, message: "Cliente no encontrado" });

    res.json({ success: true, message: "Cliente eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
