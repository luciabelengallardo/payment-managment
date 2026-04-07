import dotenv from "dotenv";
dotenv.config();
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createDemoData() {
  try {
    console.log("Conectando a SQLite...");
    const dbPath = path.join(__dirname, "payment-manager.db");
    const db = new Database(dbPath);
    console.log("✓ Conectado a SQLite\n");

    // Crear clientes para el demo
    console.log("Creando clientes de demostración...");

    // Verificar si ya existen clientes demo
    const existingClientes = db
      .prepare("SELECT * FROM clientes WHERE tenant = 'demo'")
      .all();

    let clienteIds = [];
    if (existingClientes.length > 0) {
      console.log(
        `✓ Ya existen ${existingClientes.length} clientes demo, usando esos`,
      );
      clienteIds = existingClientes.map((c) => c.id);
    } else {
      const clientes = [
        {
          nombre: "ABC S.A.",
          empresa: "ABC",
          tipoDocumento: "Factura",
          numeroDocumento: "001-00123",
          saldo: 15000,
          fecha: "2026-03-01",
          tenant: "demo",
        },
        {
          nombre: "Servicio Técnico XYZ",
          empresa: "XYZ",
          tipoDocumento: "Factura",
          numeroDocumento: "001-00124",
          saldo: 8500,
          fecha: "2026-03-05",
          tenant: "demo",
        },
        {
          nombre: "Servicio Tech",
          empresa: "Tech",
          tipoDocumento: "Factura",
          numeroDocumento: "001-00125",
          saldo: 12000,
          fecha: "2026-03-10",
          tenant: "demo",
        },
      ];

      for (const cliente of clientes) {
        const result = db
          .prepare(
            `
        INSERT INTO clientes (nombre, empresa, tipoDocumento, numeroDocumento, saldo, fecha, tenant)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
          )
          .run(
            cliente.nombre,
            cliente.empresa,
            cliente.tipoDocumento,
            cliente.numeroDocumento,
            cliente.saldo,
            cliente.fecha,
            cliente.tenant,
          );
        clienteIds.push(result.lastInsertRowid);
        console.log(
          `✓ Cliente creado: ${cliente.nombre} (ID: ${result.lastInsertRowid})`,
        );
      }
    }

    // Crear documentos para los clientes
    console.log("\nCreando documentos de demostración...");

    const documentos = [
      {
        clienteId: clienteIds[0],
        tipo: "Factura",
        numero: "001-00123",
        empresa: "ABC",
        monto: 15000,
        saldoPendiente: 15000,
        fecha: "2026-03-01",
        tenant: "demo",
      },
      {
        clienteId: clienteIds[0],
        tipo: "Factura",
        numero: "001-00456",
        empresa: "ABC",
        monto: 5000,
        saldoPendiente: 5000,
        fecha: "2026-03-15",
        tenant: "demo",
      },
      {
        clienteId: clienteIds[1],
        tipo: "Factura",
        numero: "001-00124",
        empresa: "XYZ",
        monto: 8500,
        saldoPendiente: 8500,
        fecha: "2026-03-05",
        tenant: "demo",
      },
      {
        clienteId: clienteIds[2],
        tipo: "Factura",
        numero: "001-00125",
        empresa: "Tech",
        monto: 12000,
        saldoPendiente: 9000,
        fecha: "2026-03-10",
        tenant: "demo",
      },
    ];

    const documentoIds = [];
    for (const doc of documentos) {
      const result = db
        .prepare(
          `
        INSERT INTO documentos (clienteId, tipo, numero, empresa, monto, saldoPendiente, fecha, tenant)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          doc.clienteId,
          doc.tipo,
          doc.numero,
          doc.empresa,
          doc.monto,
          doc.saldoPendiente,
          doc.fecha,
          doc.tenant,
        );
      documentoIds.push(result.lastInsertRowid);
      console.log(
        `✓ Documento creado: ${doc.numero} (ID: ${result.lastInsertRowid})`,
      );
    }

    // Crear algunos pagos
    console.log("\nCreando pagos de demostración...");

    const pagos = [
      {
        clienteId: clienteIds[2],
        documentoId: documentoIds[3],
        monto: 3000,
        formaPago: "Transferencia",
        descripcion: "Pago parcial factura 001-00125",
        fecha: "2026-03-20",
        tenant: "demo",
      },
    ];

    for (const pago of pagos) {
      const result = db
        .prepare(
          `
        INSERT INTO pagos (clienteId, documentoId, monto, formaPago, descripcion, fecha, tenant)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          pago.clienteId,
          pago.documentoId,
          pago.monto,
          pago.formaPago,
          pago.descripcion,
          pago.fecha,
          pago.tenant,
        );

      // Crear detalle del pago
      db.prepare(
        `
        INSERT INTO pagos_detalle (pagoId, formaPago, monto, fecha)
        VALUES (?, ?, ?, ?)
      `,
      ).run(result.lastInsertRowid, pago.formaPago, pago.monto, pago.fecha);

      console.log(
        `✓ Pago creado: $${pago.monto} (ID: ${result.lastInsertRowid})`,
      );
    }

    console.log("\n✅ Datos de demostración creados exitosamente");
    console.log("\n📋 Resumen:");
    console.log(`  - 3 clientes`);
    console.log(`  - 4 documentos`);
    console.log(`  - 1 pago(s)`);
    console.log("\n💡 Estos datos solo son visibles para el usuario 'demo'\n");

    db.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createDemoData();
