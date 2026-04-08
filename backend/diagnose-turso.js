import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function diagnose() {
  try {
    console.log("\n=== DIAGNÓSTICO TURSO ===\n");

    // Verificar cada tabla
    const tables = ["usuarios", "clientes", "documentos", "pagos", "pagos_detalle"];

    for (const table of tables) {
      console.log(`\n📋 Tabla: ${table}`);
      try {
        const info = await db.execute(`PRAGMA table_info(${table})`);
        console.log(`  Columnas (${info.rows.length}):`);
        info.rows.forEach((col) => {
          console.log(`    - ${col.name} (${col.type})`);
        });
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
      }
    }

    // Contar registros
    console.log("\n\n=== CONTEO DE REGISTROS ===\n");
    for (const table of tables) {
      try {
        const count = await db.execute(`SELECT COUNT(*) as total FROM ${table}`);
        console.log(`${table}: ${count.rows[0].total}`);
      } catch (err) {
        console.error(`${table}: ERROR - ${err.message}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

diagnose();
