import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usar Turso si las variables están configuradas, sino SQLite local
const useTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;

let db;

async function initializeDatabase() {
  if (useTurso) {
    console.log("🌐 Conectando a Turso (base de datos persistente en la nube)...");
    const dbModule = await import("./db-adapter.js");
    db = dbModule.default;
  } else {
    console.log("💻 Usando SQLite local (desarrollo)...");
    const dbPath = path.join(__dirname, "..", "payment-manager.db");
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
  }

  // Inicializar tablas
  const initSQL = `
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

    CREATE TABLE IF NOT EXISTS pagos_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pagoId INTEGER NOT NULL,
      formaPago TEXT NOT NULL,
      monto REAL NOT NULL,
      FOREIGN KEY (pagoId) REFERENCES pagos(id) ON DELETE CASCADE
    );
  `;

  if (useTurso) {
    await db.exec(initSQL);
    console.log("✅ Tablas de Turso inicializadas");
  } else {
    db.exec(initSQL);
    console.log("✅ Tablas SQLite inicializadas");
  }

if (useTurso) {
  await db.exec(initSQL);
  console.log("✅ Tablas de Turso inicializadas");
} else {
  db.exec(initSQL);
  console.log("✅ Tablas SQLite inicializadas");
}

  // Migraciones (solo para SQLite local, Turso ya tiene las tablas correctas)
  if (!useTurso) {
    try {
      const tableInfo = db.prepare("PRAGMA table_info(clientes)").all();
      const tieneFecha = tableInfo.some((col) => col.name === "fecha");
      if (!tieneFecha) {
        db.exec("ALTER TABLE clientes ADD COLUMN fecha TEXT");
        console.log("✅ Migración: columna 'fecha' agregada");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      const tableInfo = db.prepare("PRAGMA table_info(pagos)").all();
      const tieneDocumentoId = tableInfo.some((col) => col.name === "documentoId");
      if (!tieneDocumentoId) {
        db.exec("ALTER TABLE pagos ADD COLUMN documentoId INTEGER REFERENCES documentos(id) ON DELETE SET NULL");
        console.log("✅ Migración: columna 'documentoId' agregada");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_nombre_empresa ON clientes (nombre, empresa)`);
      console.log("✅ Índice único creado");
    } catch (error) {
      // Ignorar si ya existe
    }
  }

  return db;
}

// Inicializar y exportar la base de datos
await initializeDatabase();

export default db;
