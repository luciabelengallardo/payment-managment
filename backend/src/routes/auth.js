import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "payment-manager-secret-2026";
const JWT_EXPIRES_IN = "24h";

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Usuario y contraseña son requeridos",
      });
    }

    // Buscar usuario en la base de datos
    const user = await db
      .prepare("SELECT * FROM usuarios WHERE username = ? OR email = ?")
      .get(username, username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Usuario inactivo",
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenant: user.tenant,
        name: `${user.firstName} ${user.lastName}`,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenant: user.tenant,
          name: `${user.firstName} ${user.lastName}`,
        },
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
});

// Verificar token
router.get("/verify", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      success: true,
      data: {
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
          name: decoded.name,
        },
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
});

// Logout (opcional - el cliente elimina el token)
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logout exitoso",
  });
});

// Crear nuevo usuario (solo admin)
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

router.post("/register", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, tenant } =
      req.body;

    // Validaciones
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = db
      .prepare("SELECT * FROM usuarios WHERE username = ? OR email = ?")
      .get(username, email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un usuario con ese username o email",
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = db
      .prepare(
        `INSERT INTO usuarios (username, email, password, firstName, lastName, role, tenant, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        username,
        email,
        hashedPassword,
        firstName,
        lastName,
        role || "cliente",
        tenant || "cliente",
        1,
      );

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: {
        id: result.lastInsertRowid,
        username,
        email,
        role: role || "cliente",
        tenant: tenant || "cliente",
        name: `${firstName} ${lastName}`,
      },
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
});

// Listar usuarios (solo admin)
router.get("/users", authMiddleware, requireAdmin, (req, res) => {
  try {
    const users = db
      .prepare(
        "SELECT id, username, email, firstName, lastName, role, tenant, isActive, createdAt FROM usuarios",
      )
      .all();

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
});

export default router;
