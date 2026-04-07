import express from "express";
import db from "../db.js";
import { filterByTenant, addTenantToData } from "../middleware/tenant.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);
router.use(filterByTenant);

router.get("/", async (req, res) => {
  try {
    const query = `SELECT * FROM clientes WHERE tenant = '${req.userTenant}' ORDER BY createdAt DESC`;
    const clientes = await db.prepare(query).all();
    res.json({ success: true, data: clientes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Obtener cliente por ID
router.get("/:id", async (req, res) => {
  try {
    const query = `SELECT * FROM clientes WHERE id = ? AND tenant = '${req.userTenant}'`;
    const cliente = await db.prepare(query).get(req.params.id);
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
router.post("/", async (req, res) => {
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

    let duplicadoQuery =
      "SELECT id FROM clientes WHERE nombre = ? AND empresa = ? AND tenant = ?";
    const duplicado = await db
      .prepare(duplicadoQuery)
      .get(nombreNormalizado, empresaNormalizada, req.userTenant);

    if (duplicado) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un cliente con ese nombre y empresa",
      });
    }

    if (numeroDocumento && numeroDocumento.trim && numeroDocumento.trim()) {
      const docQuery =
        "SELECT * FROM clientes WHERE tipoDocumento = ? AND numeroDocumento = ? AND tenant = ?";
      const documentoExistente = await db
        .prepare(docQuery)
        .get(
          tipoDocumento || "Factura",
          numeroDocumento.trim(),
          req.userTenant,
        );

      if (documentoExistente) {
        return res.status(400).json({
          success: false,
          message: "Este número de documento ya existe",
        });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO clientes (nombre, empresa, tipoDocumento, numeroDocumento, saldo, fecha, tenant)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Redondear el saldo a 2 decimales
    const saldoRedondeado = Math.round((parseFloat(saldo) || 0) * 100) / 100;

    const result = await stmt.run(
      nombreNormalizado,
      empresaNormalizada,
      tipoDocumento || "Factura",
      numeroDocumento ? numeroDocumento.trim() : "",
      saldoRedondeado,
      fecha || null,
      req.userTenant,
    );

    const nuevoCliente = await db
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
router.put("/:id", async (req, res) => {
  try {
    const { nombre, empresa, tipoDocumento, numeroDocumento, saldo, fecha } =
      req.body;

    // Validación de duplicado (nombre + empresa) excluyendo el mismo id y dentro del mismo tenant
    if (nombre && empresa) {
      const nombreNormalizado = nombre.trim();
      const empresaNormalizada = empresa.trim();

      let duplicadoQuery =
        "SELECT id FROM clientes WHERE nombre = ? AND empresa = ? AND id != ? AND tenant = ?";
      const duplicado = await db
        .prepare(duplicadoQuery)
        .get(
          nombreNormalizado,
          empresaNormalizada,
          req.params.id,
          req.userTenant,
        );

      if (duplicado) {
        return res.status(400).json({
          success: false,
          message: "Ya existe un cliente con ese nombre y empresa",
        });
      }
    }

    // Verificar si ya existe otro documento con el mismo tipo y número dentro del mismo tenant
    if (numeroDocumento && numeroDocumento.trim && numeroDocumento.trim()) {
      const docQuery =
        "SELECT * FROM clientes WHERE tipoDocumento = ? AND numeroDocumento = ? AND id != ? AND tenant = ?";
      const documentoExistente = await db
        .prepare(docQuery)
        .get(
          tipoDocumento || "Factura",
          numeroDocumento.trim(),
          req.params.id,
          req.userTenant,
        );

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

    // Redondear el saldo si se proporciona
    const saldoRedondeado =
      saldo !== undefined ? Math.round(parseFloat(saldo) * 100) / 100 : null;

    await stmt.run(
      nombre || null,
      empresa || null,
      tipoDocumento || null,
      numeroDocumento || null,
      saldoRedondeado,
      fecha || null,
      req.params.id,
    );

    const clienteActualizado = await db
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
router.delete("/:id", async (req, res) => {
  try {
    // Verificar si el cliente existe
    const clienteQuery = `SELECT * FROM clientes WHERE id = ? AND tenant = '${req.userTenant}'`;
    const cliente = await db.prepare(clienteQuery).get(req.params.id);

    if (!cliente) {
      return res
        .status(404)
        .json({ success: false, message: "Cliente no encontrado" });
    }

    // Verificar si tiene documentos asociados
    const documentos = await db
      .prepare("SELECT COUNT(*) as count FROM documentos WHERE clienteId = ?")
      .get(req.params.id);

    if (documentos.count > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el cliente porque tiene ${documentos.count} documento(s) asociado(s). Elimina primero los documentos.`,
      });
    }

    // Verificar si tiene pagos asociados
    const pagos = await db
      .prepare("SELECT COUNT(*) as count FROM pagos WHERE clienteId = ?")
      .get(req.params.id);

    if (pagos.count > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el cliente porque tiene ${pagos.count} pago(s) asociado(s). Elimina primero los pagos.`,
      });
    }

    // Si no tiene documentos ni pagos, eliminar el cliente
    const deleteQuery = `DELETE FROM clientes WHERE id = ? AND tenant = '${req.userTenant}'`;
    await db.prepare(deleteQuery).run(req.params.id);

    res.json({ success: true, message: "Cliente eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
