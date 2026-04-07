import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "payment-manager.db");
const db = new Database(dbPath);

console.log("🔍 VERIFICACIÓN DE INTEGRIDAD DE DATOS\n");
console.log("=".repeat(60));

// PRODUCCIÓN (tenant = 'cliente')
console.log("\n📊 DATOS DE PRODUCCIÓN (tenant = 'cliente'):");
console.log("-".repeat(60));

const clientesProduccion = db
  .prepare("SELECT COUNT(*) as count FROM clientes WHERE tenant = 'cliente'")
  .get();
const documentosProduccion = db
  .prepare("SELECT COUNT(*) as count FROM documentos WHERE tenant = 'cliente'")
  .get();
const pagosProduccion = db
  .prepare("SELECT COUNT(*) as count FROM pagos WHERE tenant = 'cliente'")
  .get();
const pagoDetallesProduccion = db
  .prepare(
    "SELECT COUNT(*) as count FROM pagos_detalle WHERE pagoId IN (SELECT id FROM pagos WHERE tenant = 'cliente')",
  )
  .get();

console.log(`   👥 Clientes: ${clientesProduccion.count}`);
console.log(`   📄 Documentos/Facturas: ${documentosProduccion.count}`);
console.log(`   💰 Pagos: ${pagosProduccion.count}`);
console.log(`   📋 Detalles de pago: ${pagoDetallesProduccion.count}`);

// Últimas modificaciones
const ultimoPago = db
  .prepare(
    "SELECT fecha FROM pagos WHERE tenant = 'cliente' ORDER BY fecha DESC LIMIT 1",
  )
  .get();
const ultimoDocumento = db
  .prepare(
    "SELECT fecha FROM documentos WHERE tenant = 'cliente' ORDER BY fecha DESC LIMIT 1",
  )
  .get();

if (ultimoPago) {
  console.log(`   📅 Último pago registrado: ${ultimoPago.fecha}`);
}
if (ultimoDocumento) {
  console.log(`   📅 Última factura registrada: ${ultimoDocumento.fecha}`);
}

// Totales monetarios
const totales = db
  .prepare(
    `
  SELECT 
    SUM(d.monto) as totalFacturado,
    SUM(p.monto) as totalPagado
  FROM documentos d
  LEFT JOIN pagos p ON p.clienteId = d.clienteId AND p.tenant = 'cliente'
  WHERE d.tenant = 'cliente'
`,
  )
  .get();

console.log(
  `   💵 Total facturado: $${(totales.totalFacturado || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
);
console.log(
  `   💰 Total pagado: $${(totales.totalPagado || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
);

// DEMO (tenant = 'demo')
console.log("\n📊 DATOS DE DEMO (tenant = 'demo'):");
console.log("-".repeat(60));

const clientesDemo = db
  .prepare("SELECT COUNT(*) as count FROM clientes WHERE tenant = 'demo'")
  .get();
const documentosDemo = db
  .prepare("SELECT COUNT(*) as count FROM documentos WHERE tenant = 'demo'")
  .get();
const pagosDemo = db
  .prepare("SELECT COUNT(*) as count FROM pagos WHERE tenant = 'demo'")
  .get();

console.log(`   👥 Clientes: ${clientesDemo.count}`);
console.log(`   📄 Documentos: ${documentosDemo.count}`);
console.log(`   💰 Pagos: ${pagosDemo.count}`);

// USUARIOS
console.log("\n👤 USUARIOS:");
console.log("-".repeat(60));

const usuarios = db
  .prepare(
    "SELECT username, role, tenant, isActive FROM usuarios ORDER BY role, username",
  )
  .all();
usuarios.forEach((user) => {
  const status = user.isActive ? "✅" : "❌";
  console.log(
    `   ${status} ${user.username} (${user.role}) - tenant: ${user.tenant}`,
  );
});

// VERIFICACIÓN DE INTEGRIDAD
console.log("\n🔒 VERIFICACIÓN DE INTEGRIDAD:");
console.log("-".repeat(60));

// Verificar que no hay datos huérfanos
const documentosHuerfanos = db
  .prepare(
    `
  SELECT COUNT(*) as count 
  FROM documentos d 
  WHERE d.tenant = 'cliente' 
  AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.id = d.clienteId AND c.tenant = 'cliente')
`,
  )
  .get();

const pagosHuerfanos = db
  .prepare(
    `
  SELECT COUNT(*) as count 
  FROM pagos p 
  WHERE p.tenant = 'cliente' 
  AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.id = p.clienteId AND c.tenant = 'cliente')
`,
  )
  .get();

if (documentosHuerfanos.count === 0 && pagosHuerfanos.count === 0) {
  console.log(
    "   ✅ No hay datos huérfanos (todas las relaciones son válidas)",
  );
} else {
  console.log(`   ⚠️  Documentos huérfanos: ${documentosHuerfanos.count}`);
  console.log(`   ⚠️  Pagos huérfanos: ${pagosHuerfanos.count}`);
}

// Verificar aislamiento de tenants
const cruceClientes = db
  .prepare(
    `
  SELECT COUNT(*) as count 
  FROM clientes c1, clientes c2 
  WHERE c1.tenant = 'cliente' AND c2.tenant = 'demo' 
  AND c1.nombre = c2.nombre
`,
  )
  .get();

if (cruceClientes.count === 0) {
  console.log(
    "   ✅ Aislamiento de tenants verificado (no hay cruce de datos)",
  );
} else {
  console.log(`   ⚠️  Posibles cruces detectados: ${cruceClientes.count}`);
}

console.log("\n" + "=".repeat(60));
console.log("✅ Verificación completada\n");

db.close();
