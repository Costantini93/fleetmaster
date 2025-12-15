const { createClient } = require('@libsql/client');
require('dotenv').config();

// Usa database locale SQLite per sviluppo se Turso non è configurato
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:database.db'
});

// Funzione helper per eseguire query
async function query(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Funzione per ottenere una singola riga
async function get(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database get error:', error);
    throw error;
  }
}

// Funzione per ottenere tutte le righe
async function all(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    return result.rows;
  } catch (error) {
    console.error('Database all error:', error);
    throw error;
  }
}

// Funzione per eseguire operazioni di scrittura
async function run(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.rowsAffected
    };
  } catch (error) {
    console.error('Database run error:', error);
    throw error;
  }
}

module.exports = {
  db,
  query,
  get,
  all,
  run
};
