import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import db from "./src/db.js";

async function createUsers() {
  try {
    console.log("🔧 Inicializando usuarios...\n");

    // Verificar si ya existen usuarios
    const existingUsers = await db.prepare("SELECT * FROM usuarios").all();

    if (existingUsers.length > 0) {
      console.log("✓ Usuarios ya existen:");
      existingUsers.forEach((u) => {
        const status = u.isActive ? "✅" : "❌";
        console.log(
          `  ${status} ${u.username} (${u.role}) - tenant: ${u.tenant}`,
        );
      });
      console.log("\n✅ No es necesario crear usuarios\n");
      process.exit(0);
    }

    console.log("Creando usuarios...\n");

    // Crear admin
    const adminPassword = await bcrypt.hash("admin123", 10);
    await db
      .prepare(
        `INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "admin",
        "admin@paymentmanager.com",
        adminPassword,
        "Administrador",
        "Sistema",
        "admin",
        "cliente",
        1,
      );
    console.log("✅ admin creado (admin123)");

    // Crear juliogallardo
    const clientePassword = await bcrypt.hash("dk1958", 10);
    await db
      .prepare(
        `INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "juliogallardo",
        "gallardojulio21@yahoo.com.ar",
        clientePassword,
        "Julio",
        "Gallardo",
        "cliente",
        "cliente",
        1,
      );
    console.log("✅ juliogallardo creado (dk1958)");

    // Crear demo
    const demoPassword = await bcrypt.hash("demo123", 10);
    await db
      .prepare(
        `INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "demo",
        "demo@paymentmanager.com",
        demoPassword,
        "Usuario",
        "Demo",
        "demo",
        "demo",
        1,
      );
    console.log("✅ demo creado (demo123)");

    console.log("\n✅ Usuarios inicializados correctamente\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err);
    process.exit(1);
  }
}

createUsers();
