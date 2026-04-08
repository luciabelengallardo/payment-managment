import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pagoRoutes from "./routes/pagos.js";
import clienteRoutes from "./routes/clientes.js";
import documentoRoutes from "./routes/documentos.js";
import authRoutes from "./routes/auth.js";
import db from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como Postman, curl, apps móviles)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("❌ Origen no permitido:", origin);
        callback(new Error("No permitido por CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/documentos", documentoRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Payment Manager API funcionando correctamente",
    version: "1.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend funcionando correctamente" });
});

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`✅ Backend corriendo en puerto ${PORT}`);
  console.log(`🔍 Versión desplegada: ${new Date().toISOString()}`);

  // Verificar usuarios en la base de datos
  try {
    const userCount = await db
      .prepare("SELECT COUNT(*) as count FROM usuarios")
      .get();
    console.log(`👥 Usuarios en base de datos: ${userCount?.count ?? 0}`);

    if (userCount && userCount.count > 0) {
      const users = await db.prepare("SELECT username, isActive FROM usuarios").all();
      users.forEach((u) =>
        console.log(
          `   - ${u.username}: ${u.isActive ? "✅ activo" : "❌ inactivo"}`,
        ),
      );
    } else {
      console.log(
        "⚠️  NO HAY USUARIOS - deberían haberse creado en la inicialización",
      );
    }
  } catch (err) {
    console.error("❌ Error verificando usuarios:", err);
  }
});

// Manejo de errores del servidor
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
    console.log("💡 Solución: Ejecuta este comando para liberar el puerto:");
    console.log(`   lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error("❌ Error del servidor:", error);
    process.exit(1);
  }
});

// Cierre graceful del servidor
const gracefulShutdown = () => {
  console.log("\n🔄 Cerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor cerrado correctamente");
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error("❌ Forzando cierre del servidor");
    process.exit(1);
  }, 10000);
};

// Escuchar señales de terminación
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
