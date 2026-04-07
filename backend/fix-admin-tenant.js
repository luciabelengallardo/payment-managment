import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "payment-manager.db");
const db = new Database(dbPath);

console.log("🔧 Corrigiendo tenant del admin...\n");

// Actualizar admin para que tenga tenant 'cliente'
db.prepare(
  "UPDATE usuarios SET tenant = 'cliente' WHERE username = 'admin'",
).run();
console.log("✅ Admin actualizado: ahora tiene tenant 'cliente'");

// Mostrar todos los usuarios
const users = db
  .prepare("SELECT username, email, role, tenant FROM usuarios")
  .all();
console.log("\n📋 Usuarios actuales:");
users.forEach((u) => {
  console.log(`  - ${u.username}: role=${u.role}, tenant=${u.tenant}`);
});

console.log("\n✅ Configuración correcta:");
console.log("  - admin: Ve los datos de 'cliente' (juliogallardo)");
console.log("  - juliogallardo: Ve sus propios datos ('cliente')");
console.log("  - demo: Ve solo sus datos ('demo') - COMPLETAMENTE AISLADO");

db.close();
