import dotenv from "dotenv";
dotenv.config();
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createUsers() {
  try {
    console.log("Conectando a SQLite...");
    const dbPath = path.join(__dirname, "payment-manager.db");
    const db = new Database(dbPath);
    console.log("✓ Conectado a SQLite\n");

    // Verificar si ya existen usuarios
    const existingUsers = db.prepare("SELECT * FROM usuarios").all();

    if (existingUsers.length > 0) {
      console.log("✓ Usuarios ya existen:");
      existingUsers.forEach((u) => {
        console.log(`  - ${u.email} (${u.username}) [${u.role}]`);
      });
      console.log(
        "\n⚠️  Si necesitas recrearlos, elimina la tabla usuarios primero\n",
      );
      process.exit(0);
    }

    // Crear admin
    console.log("Creando usuario admin...");
    const adminPassword = await bcrypt.hash("admin123", 10);

    db.prepare(
      `
      INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "admin",
      "admin@paymentmanager.com",
      adminPassword,
      "Administrador",
      "Sistema",
      "admin",
      "cliente",
      1,
    );
    console.log("✓ Usuario admin creado");
    console.log("  Email: admin@paymentmanager.com");
    console.log("  Username: admin");
    console.log("  Contraseña: admin123");

    // Crear cliente
    console.log("\nCreando usuario cliente...");
    const clientePassword = await bcrypt.hash("dk1958", 10);

    db.prepare(
      `
      INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "juliogallardo",
      "gallardojulio21@yahoo.com.ar",
      clientePassword,
      "Julio",
      "Gallardo",
      "cliente",
      "cliente",
      1,
    );
    console.log("✓ Usuario cliente creado");
    console.log("  Email: gallardojulio21@yahoo.com.ar");
    console.log("  Username: juliogallardo");
    console.log("  Contraseña: dk1958");

    // Crear demo
    console.log("\nCreando usuario demo...");
    const demoPassword = await bcrypt.hash("demo123", 10);

    db.prepare(
      `
      INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "demo",
      "demo@paymentmanager.com",
      demoPassword,
      "Usuario",
      "Demo",
      "demo",
      "demo",
      1,
    );
    console.log("✓ Usuario demo creado");
    console.log("  Email: demo@paymentmanager.com");
    console.log("  Username: demo");
    console.log("  Contraseña: demo123");

    console.log("\n📋 Resumen de usuarios creados:");
    const allUsers = db
      .prepare("SELECT id, username, email, role, tenant FROM usuarios")
      .all();
    allUsers.forEach((u) => {
      console.log(
        `  ${u.id}. ${u.email} (${u.username}) [${u.role}] - Vista: ${u.tenant}`,
      );
    });

    console.log("\n✅ Usuarios creados exitosamente\n");
    db.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createUsers();
