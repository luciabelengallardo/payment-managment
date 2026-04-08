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
    console.log(
      "🌐 Conectando a Turso (base de datos persistente en la nube)...",
    );
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
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cliente',
      tenant TEXT NOT NULL DEFAULT 'cliente',
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      empresa TEXT NOT NULL,
      tipoDocumento TEXT DEFAULT 'Factura',
      numeroDocumento TEXT,
      saldo REAL DEFAULT 0,
      fecha TEXT,
      tenant TEXT NOT NULL DEFAULT 'cliente',
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
      tenant TEXT NOT NULL DEFAULT 'cliente',
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
      tenant TEXT NOT NULL DEFAULT 'cliente',
      FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE,
      FOREIGN KEY (documentoId) REFERENCES documentos(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pagos_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pagoId INTEGER NOT NULL,
      formaPago TEXT NOT NULL,
      monto REAL NOT NULL,
      numeroCheque TEXT,
      fechaCobro TEXT,
      banco TEXT,
      fecha TEXT,
      documentoId INTEGER,
      documentoTipo TEXT,
      documentoNumero TEXT,
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

    // Migración: Agregar columna tenant a tablas existentes
    try {
      const usuariosInfo = db.prepare("PRAGMA table_info(usuarios)").all();
      const tieneTenantUsuarios = usuariosInfo.some(
        (col) => col.name === "tenant",
      );
      if (!tieneTenantUsuarios) {
        db.exec(
          "ALTER TABLE usuarios ADD COLUMN tenant TEXT NOT NULL DEFAULT 'cliente'",
        );
        console.log("✅ Migración: columna 'tenant' agregada a usuarios");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      const clientesInfo = db.prepare("PRAGMA table_info(clientes)").all();
      const tieneTenantClientes = clientesInfo.some(
        (col) => col.name === "tenant",
      );
      if (!tieneTenantClientes) {
        db.exec(
          "ALTER TABLE clientes ADD COLUMN tenant TEXT NOT NULL DEFAULT 'cliente'",
        );
        console.log("✅ Migración: columna 'tenant' agregada a clientes");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      const documentosInfo = db.prepare("PRAGMA table_info(documentos)").all();
      const tieneTenantDocumentos = documentosInfo.some(
        (col) => col.name === "tenant",
      );
      if (!tieneTenantDocumentos) {
        db.exec(
          "ALTER TABLE documentos ADD COLUMN tenant TEXT NOT NULL DEFAULT 'cliente'",
        );
        console.log("✅ Migración: columna 'tenant' agregada a documentos");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      const pagosInfo = db.prepare("PRAGMA table_info(pagos)").all();
      const tieneTenantPagos = pagosInfo.some((col) => col.name === "tenant");
      if (!tieneTenantPagos) {
        db.exec(
          "ALTER TABLE pagos ADD COLUMN tenant TEXT NOT NULL DEFAULT 'cliente'",
        );
        console.log("✅ Migración: columna 'tenant' agregada a pagos");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      const tableInfo = db.prepare("PRAGMA table_info(pagos)").all();
      const tieneDocumentoId = tableInfo.some(
        (col) => col.name === "documentoId",
      );
      if (!tieneDocumentoId) {
        db.exec(
          "ALTER TABLE pagos ADD COLUMN documentoId INTEGER REFERENCES documentos(id) ON DELETE SET NULL",
        );
        console.log("✅ Migración: columna 'documentoId' agregada");
      }
    } catch (error) {
      // Ignorar si ya existe
    }

    try {
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_nombre_empresa ON clientes (nombre, empresa)`,
      );
      console.log("✅ Índice único creado");
    } catch (error) {
      // Ignorar si ya existe
    }

    // Migración: Agregar nuevas columnas a pagos_detalle
    try {
      const tableInfo = db.prepare("PRAGMA table_info(pagos_detalle)").all();
      console.log(
        "📋 Columnas actuales en pagos_detalle:",
        tableInfo.map((c) => c.name),
      );
      const tieneNumeroCheque = tableInfo.some(
        (col) => col.name === "numeroCheque",
      );
      const tieneDocumentoId = tableInfo.some(
        (col) => col.name === "documentoId",
      );

      if (!tieneNumeroCheque) {
        console.log("➕ Agregando columnas adicionales a pagos_detalle...");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN numeroCheque TEXT");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN fechaCobro TEXT");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN banco TEXT");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN fecha TEXT");
        console.log(
          "✅ Migración: columnas adicionales agregadas a pagos_detalle",
        );
      } else {
        console.log("ℹ️  Columnas adicionales ya existen en pagos_detalle");
      }

      if (!tieneDocumentoId) {
        console.log("➕ Agregando columnas de documento a pagos_detalle...");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN documentoId INTEGER");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN documentoTipo TEXT");
        db.exec("ALTER TABLE pagos_detalle ADD COLUMN documentoNumero TEXT");
        console.log(
          "✅ Migración: columnas de documento agregadas a pagos_detalle",
        );
      } else {
        console.log("ℹ️  Columnas de documento ya existen en pagos_detalle");
      }
    } catch (error) {
      console.error("❌ Error en migración de pagos_detalle:", error);
    }
  }

  // Crear usuarios iniciales si no existen
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM usuarios").get();
    
    if (userCount.count === 0) {
      console.log("👥 Creando usuarios iniciales...");
      const bcrypt = await import("bcryptjs");
      
      const adminPass = await bcrypt.default.hash("admin123", 10);
      const clientePass = await bcrypt.default.hash("dk1958", 10);
      const demoPass = await bcrypt.default.hash("demo123", 10);
      
      db.prepare(`INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("admin", "admin@paymentmanager.com", adminPass, "Admin", "Sistema", "admin", "cliente", 1);
      
      db.prepare(`INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("juliogallardo", "gallardojulio21@yahoo.com.ar", clientePass, "Julio", "Gallardo", "cliente", "cliente", 1);
      
      db.prepare(`INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("demo", "demo@paymentmanager.com", demoPass, "Demo", "User", "demo", "demo", 1);
      
      console.log("✅ Usuarios creados");
    }
  } catch (err) {
    console.error("Error al verificar usuarios:", err);
  }

  return db;
}

// Inicializar y exportar la base de datos
await initializeDatabase();

export default db;
