import dotenv from "dotenv";
dotenv.config();
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createNewUser() {
  try {
    console.log("\n=== Crear Nuevo Usuario ===\n");

    // Conectar a la base de datos
    const dbPath = path.join(__dirname, "payment-manager.db");
    const db = new Database(dbPath);

    // Solicitar datos del usuario
    const username = await question("Username: ");
    const email = await question("Email: ");
    const password = await question("Contraseña: ");
    const firstName = await question("Nombre: ");
    const lastName = await question("Apellido: ");
    const role = await question("Rol (admin/cliente) [cliente]: ");

    // Validaciones
    if (!username || !email || !password || !firstName || !lastName) {
      console.log("\n❌ Todos los campos son obligatorios");
      process.exit(1);
    }

    // Verificar si el usuario ya existe
    const existingUser = db
      .prepare("SELECT * FROM usuarios WHERE username = ? OR email = ?")
      .get(username, email);

    if (existingUser) {
      console.log("\n❌ Ya existe un usuario con ese username o email");
      process.exit(1);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    db.prepare(
      `
      INSERT INTO usuarios (username, email, password, firstName, lastName, role, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      username,
      email,
      hashedPassword,
      firstName,
      lastName,
      role || "cliente",
      1,
    );

    console.log("\n✅ Usuario creado exitosamente!");
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Rol: ${role || "cliente"}`);
    console.log(`   Contraseña: ${password}`);

    console.log("\n📋 Lista de usuarios:");
    const allUsers = db
      .prepare("SELECT id, username, email, role FROM usuarios")
      .all();
    allUsers.forEach((u) => {
      console.log(`   ${u.id}. ${u.email} (${u.username}) [${u.role}]`);
    });

    db.close();
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    rl.close();
    process.exit(1);
  }
}

createNewUser();
