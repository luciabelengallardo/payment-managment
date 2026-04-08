import db from "./src/db.js";

console.log("\n=== VERIFICANDO USUARIOS EN LA BASE DE DATOS ===\n");

try {
  const users = await db.prepare("SELECT * FROM usuarios").all();

  console.log(`Total de usuarios: ${users.length}\n`);

  if (users.length === 0) {
    console.log("❌ NO HAY USUARIOS EN LA BASE DE DATOS");
    console.log(
      "   El backend debería crear usuarios automáticamente al inicializarse.",
    );
    console.log(
      "   Verifica que el backend se haya reiniciado después del deploy.\n",
    );
  } else {
    console.log("Usuarios encontrados:\n");
    users.forEach((user) => {
      console.log(`👤 Usuario: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Tenant: ${user.tenant}`);
      console.log(`   Activo: ${user.isActive ? "✅ SÍ" : "❌ NO"}`);
      console.log(`   Creado: ${user.createdAt}`);
      console.log("");
    });
  }

  // Verificar específicamente el usuario demo
  const demoUser = await db
    .prepare("SELECT * FROM usuarios WHERE username = ?")
    .get("demo");

  if (demoUser) {
    console.log("=== USUARIO DEMO ===");
    console.log(`Username: ${demoUser.username}`);
    console.log(`isActive: ${demoUser.isActive}`);
    console.log(`isActive type: ${typeof demoUser.isActive}`);
    console.log(`isActive === 1: ${demoUser.isActive === 1}`);
    console.log(`isActive == 1: ${demoUser.isActive == 1}`);
    console.log(`Boolean(isActive): ${Boolean(demoUser.isActive)}`);
    console.log(`!isActive: ${!demoUser.isActive}`);
  } else {
    console.log("❌ Usuario 'demo' no existe en la base de datos");
  }
} catch (error) {
  console.error("❌ Error al verificar usuarios:", error);
  process.exit(1);
}

process.exit(0);
