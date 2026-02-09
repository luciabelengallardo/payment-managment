import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const useTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;

let db;

if (useTurso) {
  console.log("🌐 Conectando a Turso (base de datos en la nube)...");
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  console.log("💻 Usando SQLite local (desarrollo)...");
  const Database = (await import("better-sqlite3")).default;
  const path = (await import("path")).default;
  const { fileURLToPath } = await import("url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.join(__dirname, "..", "payment-manager.db");

  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma("foreign_keys = ON");

  // Wrapper para hacer que better-sqlite3 sea compatible con la API de Turso
  db = {
    execute: async (sql, params = []) => {
      try {
        const stmt = sqliteDb.prepare(sql);
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
          const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
          return { rows };
        } else {
          const info = params.length > 0 ? stmt.run(...params) : stmt.run();
          return {
            rows: [],
            rowsAffected: info.changes || 0,
            lastInsertRowid: info.lastInsertRowid,
          };
        }
      } catch (error) {
        console.error("Error en execute:", error);
        throw error;
      }
    },
    batch: async (statements) => {
      const transaction = sqliteDb.transaction(() => {
        for (const stmt of statements) {
          sqliteDb.prepare(stmt).run();
        }
      });
      transaction();
    },
  };
}

// Inicializar tablas
const initTables = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      empresa TEXT NOT NULL,
      tipoDocumento TEXT DEFAULT 'Factura',
      numeroDocumento TEXT,
      saldo REAL DEFAULT 0,
      fecha TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS documentos (
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
    )`,
    `CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER NOT NULL,
      documentoId INTEGER,
      monto REAL NOT NULL,
      formaPago TEXT DEFAULT 'Transferencia',
      descripcion TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE,
      FOREIGN KEY (documentoId) REFERENCES documentos(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pagos_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pagoId INTEGER NOT NULL,
      formaPago TEXT NOT NULL,
      monto REAL NOT NULL,
      FOREIGN KEY (pagoId) REFERENCES pagos(id) ON DELETE CASCADE
    )`,
  ];

  try {
    for (const sql of statements) {
      await db.execute(sql);
    }
    console.log("✅ Tablas inicializadas correctamente");

    // Intentar crear índice único si no existe
    try {
      await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_nombre_empresa
        ON clientes (nombre, empresa)
      `);
      console.log("✅ Índice único creado");
    } catch (error) {
      console.log("ℹ️  Índice único ya existe o no se pudo crear");
    }
  } catch (error) {
    console.error("❌ Error inicializando tablas:", error);
  }
};

// Inicializar al importar
await initTables();

export default db;
