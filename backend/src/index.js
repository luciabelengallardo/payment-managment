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
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
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

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend corriendo en puerto ${PORT}`);
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
