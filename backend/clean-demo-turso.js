import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("❌ Error: Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN");
  console.log("Define estas variables en tu archivo .env");
  process.exit(1);
}

const db = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

console.log("🗑️  Limpiando datos DEMO en Turso...\n");
console.log("⚠️  IMPORTANTE: Este script SOLO elimina datos del tenant 'demo'");
console.log("⚠️  Los datos de 'cliente' (juliogallardo) NUNCA se tocan\n");

async function limpiarDemo() {
  try {
    // Eliminar SOLO datos DEMO en orden (debido a foreign keys)
    await db.execute(
      "DELETE FROM pagos_detalle WHERE pagoId IN (SELECT id FROM pagos WHERE tenant = 'demo')",
    );
    console.log("✅ Detalles de pagos DEMO eliminados");

    await db.execute("DELETE FROM pagos WHERE tenant = 'demo'");
    console.log("✅ Pagos DEMO eliminados");

    await db.execute("DELETE FROM documentos WHERE tenant = 'demo'");
    console.log("✅ Documentos DEMO eliminados");

    await db.execute("DELETE FROM clientes WHERE tenant = 'demo'");
    console.log("✅ Clientes DEMO eliminados");

    // Verificar que los datos de producción están intactos
    const clientesProduccion = await db.execute(
      "SELECT COUNT(*) as count FROM clientes WHERE tenant = 'cliente'",
    );
    const documentosProduccion = await db.execute(
      "SELECT COUNT(*) as count FROM documentos WHERE tenant = 'cliente'",
    );
    const pagosProduccion = await db.execute(
      "SELECT COUNT(*) as count FROM pagos WHERE tenant = 'cliente'",
    );

    console.log("\n📊 DATOS DE PRODUCCIÓN (INTACTOS):");
    console.log(`   Clientes: ${clientesProduccion.rows[0].count}`);
    console.log(`   Documentos: ${documentosProduccion.rows[0].count}`);
    console.log(`   Pagos: ${pagosProduccion.rows[0].count}`);

    console.log("\n🎉 Datos DEMO limpiados exitosamente!");
    console.log("✅ Usuario 'demo' sigue existiendo y puede volver a usarse");
  } catch (error) {
    console.error("❌ Error limpiando datos:", error.message);
    process.exit(1);
  }
}

limpiarDemo();
