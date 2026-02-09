# Configuración de Turso para Persistencia de Datos

## 🚀 Pasos para configurar Turso

### 1. Instalar Turso CLI

En tu terminal local (macOS):

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 2. Autenticarse en Turso

```bash
turso auth signup
```

Esto abrirá tu navegador para crear una cuenta (es gratis).

### 3. Crear la base de datos

```bash
turso db create payment-manager
```

### 4. Obtener la URL de la base de datos

```bash
turso db show payment-manager --url
```

Copia la URL que se muestra (algo como: `libsql://payment-manager-xxxxx.turso.io`)

### 5. Crear un token de autenticación

```bash
turso db tokens create payment-manager
```

Copia el token que se genera.

### 6. Configurar variables de entorno

**En tu archivo `.env` local (backend/):**

```bash
TURSO_DATABASE_URL=libsql://payment-manager-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbG...tu-token-aqui
```

**En Vercel (para producción):**

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `TURSO_DATABASE_URL` = tu URL de Turso
   - `TURSO_AUTH_TOKEN` = tu token de Turso

### 7. Redeploy en Vercel

Después de agregar las variables de entorno en Vercel:

- Ve a Deployments
- Click en los "..." del último deployment
- Click en "Redeploy"

## ✅ Verificación

- **Local**: Si NO tienes las variables de entorno, usará SQLite local
- **Producción**: Si tienes las variables, usará Turso (persistente)

## 🔄 Migrar datos existentes (opcional)

Si tienes datos en tu SQLite local que quieres migrar:

```bash
# Exportar datos de SQLite local
sqlite3 backend/payment-manager.db .dump > backup.sql

# Importar a Turso
turso db shell payment-manager < backup.sql
```

## 📊 Ver datos en Turso

```bash
# Abrir shell interactivo
turso db shell payment-manager

# Comandos útiles:
# .tables          - Ver todas las tablas
# .schema          - Ver estructura de tablas
# SELECT * FROM clientes;  - Ver datos
```

## 💰 Plan Gratuito de Turso

- 9 GB de almacenamiento
- 1 billón de lecturas/mes
- 25 millones de escrituras/mes
- Más que suficiente para tu aplicación

## 🆘 Solución de Problemas

**Error: "TURSO_DATABASE_URL is not set"**

- Verifica que las variables de entorno estén configuradas
- En producción, asegúrate de haber hecho redeploy después de agregar las variables

**Los datos no persisten en Vercel**

- Confirma que las variables de entorno estén en Vercel
- Verifica en los logs que diga "🌐 Conectando a Turso" y no "💻 Usando SQLite local"
