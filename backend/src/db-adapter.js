// Adaptador para unificar la API de better-sqlite3 y @libsql/client
import dbInstance from "./db-turso.js";

const isAsync = !!process.env.TURSO_DATABASE_URL;

const db = {
  // Para consultas SELECT que retornan múltiples filas
  prepare: (sql) => ({
    all: async (...params) => {
      if (isAsync) {
        const result = await dbInstance.execute(sql, params);
        return result.rows || [];
      } else {
        return dbInstance.execute(sql, params).then((r) => r.rows);
      }
    },
    get: async (...params) => {
      if (isAsync) {
        const result = await dbInstance.execute(sql, params);
        return result.rows?.[0] || null;
      } else {
        return dbInstance.execute(sql, params).then((r) => r.rows[0] || null);
      }
    },
    run: async (...params) => {
      if (isAsync) {
        const result = await dbInstance.execute(sql, params);
        return {
          changes: result.rowsAffected || 0,
          lastInsertRowid: result.lastInsertRowid || 0,
        };
      } else {
        return dbInstance.execute(sql, params).then((r) => ({
          changes: r.rowsAffected || 0,
          lastInsertRowid: r.lastInsertRowid || 0,
        }));
      }
    },
  }),

  // Para ejecutar múltiples statements (migraciones, etc.)
  exec: async (sql) => {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await dbInstance.execute(stmt);
    }
  },

  // Para transacciones
  transaction: (fn) => {
    return async () => {
      // En Turso, ejecutamos las queries secuencialmente
      // Para SQLite local, el wrapper ya maneja esto
      return await fn();
    };
  },

  pragma: () => {
    // No-op para Turso, solo relevante para SQLite local
  },
};

export default db;
