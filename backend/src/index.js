import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pagoRoutes from "./routes/pagos.js";
import clienteRoutes from "./routes/clientes.js";
import documentoRoutes from "./routes/documentos.js";
import dbPromise from "./db.js";

dotenv.config();

// Esperar a que la base de datos se inicialice antes de arrancar el servidor
const db = await dbPromise;

const app = express();
const PORT = process.env.PORT || 8000;

// Configuración CORS para producción y desarrollo
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // URL de Vercel que configuraremos
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
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

// Middleware
app.use(express.json());

// Routes
app.use("/api/pagos", pagoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/documentos", documentoRoutes);

// Health check
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend corriendo en puerto ${PORT}`);
});
