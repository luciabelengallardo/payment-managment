import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "payment-manager.db");
const db = new Database(dbPath);

// Habilitar claves foráneas
db.pragma("foreign_keys = ON");

// Inicializar tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    empresa TEXT NOT NULL,
    tipoDocumento TEXT DEFAULT 'Factura',
    numeroDocumento TEXT,
    saldo REAL DEFAULT 0,
    fecha TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clienteId INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    numero TEXT NOT NULL,
    empresa TEXT NOT NULL,
    monto REAL NOT NULL,
    saldoPendiente REAL NOT NULL,
    fecha TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clienteId INTEGER NOT NULL,
    documentoId INTEGER,
    monto REAL NOT NULL,
    formaPago TEXT DEFAULT 'Transferencia',
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (documentoId) REFERENCES documentos(id) ON DELETE SET NULL
  );
`);

// Migración: agregar columna fecha a clientes si no existe
try {
  const tableInfo = db.prepare("PRAGMA table_info(clientes)").all();
  const tieneFecha = tableInfo.some((col) => col.name === "fecha");
  if (!tieneFecha) {
    db.exec("ALTER TABLE clientes ADD COLUMN fecha TEXT");
    console.log("✅ Migración: columna 'fecha' agregada a tabla 'clientes'");
  }
} catch (error) {
  console.error("Error en migración:", error.message);
}

// Migración: agregar columna documentoId a pagos si no existe
try {
  const tableInfo = db.prepare("PRAGMA table_info(pagos)").all();
  const tieneDocumentoId = tableInfo.some((col) => col.name === "documentoId");
  if (!tieneDocumentoId) {
    db.exec(
      "ALTER TABLE pagos ADD COLUMN documentoId INTEGER REFERENCES documentos(id) ON DELETE SET NULL",
    );
    console.log("✅ Migración: columna 'documentoId' agregada a tabla 'pagos'");
  }
} catch (error) {
  console.error("Error en migración:", error.message);
}

// Migración: Índice único nombre + empresa (con manejo de duplicados)
try {
  // Verificar si el índice ya existe
  const indices = db.prepare("PRAGMA index_list(clientes)").all();
  const indexExists = indices.some(
    (idx) => idx.name === "idx_clientes_nombre_empresa",
  );

  if (!indexExists) {
    // Limpiar duplicados antes de crear el índice
    console.log("🔍 Verificando duplicados en tabla clientes...");

    const duplicados = db
      .prepare(
        `
      SELECT nombre, empresa, COUNT(*) as count
      FROM clientes
      GROUP BY nombre, empresa
      HAVING count > 1
    `,
      )
      .all();

    if (duplicados.length > 0) {
      console.log(
        `⚠️  Encontrados ${duplicados.length} grupos de clientes duplicados. Limpiando...`,
      );

      // Para cada grupo duplicado, mantener solo el más reciente
      for (const dup of duplicados) {
        const clientesDuplicados = db
          .prepare(
            `
          SELECT id FROM clientes 
          WHERE nombre = ? AND empresa = ?
          ORDER BY createdAt DESC
        `,
          )
          .all(dup.nombre, dup.empresa);

        // Mantener el primero (más reciente), eliminar el resto
        const idsAEliminar = clientesDuplicados.slice(1).map((c) => c.id);

        if (idsAEliminar.length > 0) {
          const placeholders = idsAEliminar.map(() => "?").join(",");
          db.prepare(`DELETE FROM clientes WHERE id IN (${placeholders})`).run(
            ...idsAEliminar,
          );
          console.log(
            `   ✓ Eliminados ${idsAEliminar.length} duplicados de "${dup.nombre}" - "${dup.empresa}"`,
          );
        }
      }
    }

    // Ahora crear el índice único
    db.exec(`
      CREATE UNIQUE INDEX idx_clientes_nombre_empresa
      ON clientes (nombre, empresa);
    `);
    console.log(
      "✅ Índice único 'idx_clientes_nombre_empresa' creado exitosamente",
    );
  }
} catch (error) {
  console.error("⚠️  Error al crear índice único:", error.message);
  console.log(
    "   El sistema funcionará sin el índice único, pero la validación se hará a nivel de aplicación",
  );
}

export default db;
