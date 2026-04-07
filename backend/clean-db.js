import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "payment-manager.db");
const db = new Database(dbPath);

console.log("🗑️  Limpiando datos DEMO...\n");
console.log("⚠️  IMPORTANTE: Este script SOLO elimina datos del tenant 'demo'");
console.log("⚠️  Los datos de producción (tenant 'cliente') NUNCA se tocan\n");

// Eliminar SOLO datos DEMO en orden (debido a foreign keys)
db.exec(
  "DELETE FROM pagos_detalle WHERE pagoId IN (SELECT id FROM pagos WHERE tenant = 'demo')",
);
console.log("✅ Detalles de pagos DEMO eliminados");

db.exec("DELETE FROM pagos WHERE tenant = 'demo'");
console.log("✅ Pagos DEMO eliminados");

db.exec("DELETE FROM documentos WHERE tenant = 'demo'");
console.log("✅ Documentos DEMO eliminados");

db.exec("DELETE FROM clientes WHERE tenant = 'demo'");
console.log("✅ Clientes DEMO eliminados");

// Mostrar resumen de datos de producción (para verificar que no se tocaron)
const clientesProduccion = db
  .prepare("SELECT COUNT(*) as count FROM clientes WHERE tenant = 'cliente'")
  .get();
const documentosProduccion = db
  .prepare("SELECT COUNT(*) as count FROM documentos WHERE tenant = 'cliente'")
  .get();
const pagosProduccion = db
  .prepare("SELECT COUNT(*) as count FROM pagos WHERE tenant = 'cliente'")
  .get();

console.log("\n📊 DATOS DE PRODUCCIÓN (INTACTOS):");
console.log(`   Clientes: ${clientesProduccion.count}`);
console.log(`   Documentos: ${documentosProduccion.count}`);
console.log(`   Pagos: ${pagosProduccion.count}`);

console.log("\n🎉 Datos DEMO limpiados exitosamente!");
console.log("✅ Datos de producción NO fueron modificados");

db.close();
