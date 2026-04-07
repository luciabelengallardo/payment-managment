import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "payment-manager.db");
const db = new Database(dbPath);

console.log("💾 Creando backup de datos de PRODUCCIÓN...\n");

// Obtener timestamp para el nombre del backup
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
const backupPath = path.join(__dirname, `backup-produccion-${timestamp}.db`);

// Hacer una copia completa de la base de datos
db.backup(backupPath)
  .then(() => {
    console.log(
      `✅ Backup completo creado: backup-produccion-${timestamp}.db\n`,
    );

    // Mostrar resumen de datos de producción
    const clientesProduccion = db
      .prepare(
        "SELECT COUNT(*) as count FROM clientes WHERE tenant = 'cliente'",
      )
      .get();
    const documentosProduccion = db
      .prepare(
        "SELECT COUNT(*) as count FROM documentos WHERE tenant = 'cliente'",
      )
      .get();
    const pagosProduccion = db
      .prepare("SELECT COUNT(*) as count FROM pagos WHERE tenant = 'cliente'")
      .get();
    const pagoDetallesProduccion = db
      .prepare(
        "SELECT COUNT(*) as count FROM pagos_detalle WHERE pagoId IN (SELECT id FROM pagos WHERE tenant = 'cliente')",
      )
      .get();

    console.log("📊 DATOS DE PRODUCCIÓN RESPALDADOS:");
    console.log(`   👥 Clientes: ${clientesProduccion.count}`);
    console.log(`   📄 Documentos/Facturas: ${documentosProduccion.count}`);
    console.log(`   💰 Pagos: ${pagosProduccion.count}`);
    console.log(`   📋 Detalles de pago: ${pagoDetallesProduccion.count}`);

    console.log("\n✅ Backup completado exitosamente!");
    console.log(`📁 Ubicación: ${backupPath}`);

    db.close();
  })
  .catch((err) => {
    console.error("❌ Error al crear backup:", err);
    db.close();
    process.exit(1);
  });
