# 💰 Payment Manager

Aplicación para administrar pagos de clientes. Registro, edición, seguimiento de pagos con forma de pago, monto y fechas.

## 📁 Estructura

```
payment-manager/
├── frontend/         # React + Vite (puerto 5173)
├── backend/          # Node.js + Express (puerto 8000)
└── README.md
```

## 🚀 Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

## 📊 Funcionalidades

- ✅ Registrar pagos (fecha, monto, forma de pago, cliente)
- ✅ Editar pagos existentes
- ✅ Eliminar pagos
- ✅ Listar pagos por cliente
- ✅ Dashboard con resumen de pagos
- ✅ Filtrar por fecha y forma de pago
- ✅ Gestión de documentos (facturas/remitos)
- ✅ Pagos múltiples por factura
- ✅ Sistema de autenticación

## 🔐 Credenciales

**Demo:**

- Usuario: `demo` / `demo123`

**Admin:**

- Usuario: `admin` / `admin123`

**Cliente:**

- Usuario: `juliogallardo` / `dk1958`

## 🛠️ Scripts

```bash
cd backend

# Ver estado de datos
npm run verify

# Backup
npm run backup

# Limpiar demo
npm run clean-demo
```
