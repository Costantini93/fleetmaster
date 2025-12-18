require('dotenv').config();
const { db } = require('../config/database');

async function addNotificationsTable() {
  console.log('🔄 Creazione tabella notifications...');

  try {
    // Tabella notifiche
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tipo TEXT CHECK(tipo IN ('scadenza_documento', 'scadenza_contratto', 'manutenzione_km', 'manutenzione_urgente', 'info', 'warning', 'error')) NOT NULL,
        titolo TEXT NOT NULL,
        messaggio TEXT NOT NULL,
        link TEXT,
        letta INTEGER DEFAULT 0,
        inviata_email INTEGER DEFAULT 0,
        inviata_push INTEGER DEFAULT 0,
        priorita TEXT CHECK(priorita IN ('bassa', 'media', 'alta', 'critica')) DEFAULT 'media',
        metadata TEXT,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_lettura DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tabella notifications creata con successo!');

    // Tabella per push subscriptions
    await db.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        attivo INTEGER DEFAULT 1,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tabella push_subscriptions creata con successo!');

    // Indici per performance
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_user_letta ON notifications(user_id, letta)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_data ON notifications(data_creazione)`);

    console.log('✅ Migrazione completata!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  }
}

addNotificationsTable();
