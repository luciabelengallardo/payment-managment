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

console.log("⚠️  ⚠️  ⚠️  ADVERTENCIA ⚠️  ⚠️  ⚠️");
console.log("🗑️  Limpiando datos de PRODUCCIÓN (tenant 'cliente')...\n");
console.log(
  "⚠️  IMPORTANTE: Este script elimina datos REALES de juliogallardo",
);
console.log("⚠️  Los datos de 'demo' NO se tocan\n");
console.log("Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n");

await new Promise((resolve) => setTimeout(resolve, 5000));

async function limpiarCliente() {
  try {
    console.log("Eliminando datos...\n");

    // Eliminar SOLO datos del tenant 'cliente' en orden (debido a foreign keys)
    await db.execute(
      "DELETE FROM pagos_detalle WHERE pagoId IN (SELECT id FROM pagos WHERE tenant = 'cliente')",
    );
    console.log("✅ Detalles de pagos de CLIENTE eliminados");

    await db.execute("DELETE FROM pagos WHERE tenant = 'cliente'");
    console.log("✅ Pagos de CLIENTE eliminados");

    await db.execute("DELETE FROM documentos WHERE tenant = 'cliente'");
    console.log("✅ Documentos de CLIENTE eliminados");

    await db.execute("DELETE FROM clientes WHERE tenant = 'cliente'");
    console.log("✅ Clientes de CLIENTE eliminados");

    // Verificar que los datos de demo están intactos
    const clientesDemo = await db.execute(
      "SELECT COUNT(*) as count FROM clientes WHERE tenant = 'demo'",
    );
    const documentosDemo = await db.execute(
      "SELECT COUNT(*) as count FROM documentos WHERE tenant = 'demo'",
    );
    const pagosDemo = await db.execute(
      "SELECT COUNT(*) as count FROM pagos WHERE tenant = 'demo'",
    );

    console.log("\n📊 DATOS DE DEMO (INTACTOS):");
    console.log(`   Clientes: ${clientesDemo.rows[0].count}`);
    console.log(`   Documentos: ${documentosDemo.rows[0].count}`);
    console.log(`   Pagos: ${pagosDemo.rows[0].count}`);

    console.log(
      "\n🎉 Datos de CLIENTE (juliogallardo) limpiados exitosamente!",
    );
    console.log(
      "✅ Usuario 'juliogallardo' sigue existiendo y puede volver a usarse",
    );
  } catch (error) {
    console.error("❌ Error limpiando datos:", error.message);
    process.exit(1);
  }
}

limpiarCliente();
