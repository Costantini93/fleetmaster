require('dotenv').config();
const { db } = require('../config/database');
const bcrypt = require('bcrypt');

async function initDatabase() {
  console.log('🔄 Inizializzazione database...');

  try {
    // Tabella utenti
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        telefono TEXT,
        ruolo TEXT CHECK(ruolo IN ('admin', 'rider')) NOT NULL,
        attivo INTEGER DEFAULT 1,
        primo_accesso INTEGER DEFAULT 1,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultima_modifica DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella veicoli
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        targa TEXT UNIQUE NOT NULL,
        modello TEXT NOT NULL,
        anno INTEGER NOT NULL,
        km_attuali INTEGER DEFAULT 0,
        attivo INTEGER DEFAULT 1,
        note_manutenzione TEXT,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultima_modifica DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella contratti noleggio
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rental_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        data_inizio DATE NOT NULL,
        data_scadenza DATE NOT NULL,
        fornitore TEXT,
        costo_mensile REAL,
        note TEXT,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      )
    `);

    // Tabella scadenzario manutenzioni
    await db.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        tipo_manutenzione TEXT NOT NULL,
        km_previsti INTEGER NOT NULL,
        ultima_manutenzione_km INTEGER DEFAULT 0,
        prossima_manutenzione_km INTEGER NOT NULL,
        note TEXT,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      )
    `);

    // Tabella roster (turni)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS roster (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        data DATE NOT NULL,
        turno TEXT NOT NULL,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, data, turno)
      )
    `);

    // Tabella assegnazioni veicoli
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        vehicle_id INTEGER NOT NULL,
        data DATE NOT NULL,
        turno TEXT NOT NULL,
        assegnazione_automatica INTEGER DEFAULT 1,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        UNIQUE(vehicle_id, data, turno)
      )
    `);

    // Tabella rapporti giornalieri
    await db.execute(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        vehicle_id INTEGER NOT NULL,
        data DATE NOT NULL,
        
        -- Dati partenza
        codice_giro TEXT,
        km_partenza INTEGER NOT NULL,
        ora_partenza DATETIME,
        orario_partenza TIME,
        orario_partenza_effettivo DATETIME,
        numero_ditta TEXT,
        tipo_carburante TEXT CHECK(tipo_carburante IN ('IP', 'DKV')),
        numero_carta_dkv TEXT,
        metodo_rifornimento TEXT,
        importo_rifornimento REAL,
        pacchi_ritirati INTEGER DEFAULT 0,
        firma_partenza TEXT,
        foto_frontale TEXT,
        foto_posteriore TEXT,
        foto_destra TEXT,
        foto_sinistra TEXT,
        
        -- Dati ritorno
        km_arrivo INTEGER,
        ora_arrivo DATETIME,
        orario_rientro TIME,
        pacchi_consegnati INTEGER DEFAULT 0,
        pacchi_resi INTEGER DEFAULT 0,
        carburante_finale TEXT,
        
        -- Sistema sostituzione veicolo
        is_substitution INTEGER DEFAULT 0,
        original_driver_id INTEGER,
        substitution_reason TEXT,
        sostituzione_vehicle INTEGER DEFAULT 0,
        
        -- Stato e metadati
        stato TEXT CHECK(stato IN ('preparazione', 'in_preparazione', 'partito', 'completato', 'interrotto')) DEFAULT 'preparazione',
        distanza_percorsa INTEGER,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultima_modifica DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      )
    `);

    // Tabella richieste manutenzione
    await db.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        descrizione TEXT NOT NULL,
        priorita TEXT CHECK(priorita IN ('bassa', 'media', 'alta', 'critica')) DEFAULT 'media',
        stato TEXT CHECK(stato IN ('in_attesa', 'in_lavorazione', 'completata')) DEFAULT 'in_attesa',
        note_risoluzione TEXT,
        data_richiesta DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_risoluzione DATETIME,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabella sostituzioni
    await db.execute(`
      CREATE TABLE IF NOT EXISTS substitutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_assente_id INTEGER NOT NULL,
        user_sostituto_id INTEGER NOT NULL,
        data_sostituzione DATE NOT NULL,
        motivo TEXT CHECK(motivo IN ('malattia', 'ferie', 'altro')) NOT NULL,
        note TEXT,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_assente_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_sostituto_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabella log attività
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        azione TEXT NOT NULL,
        dettagli TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ Tabelle create con successo!');

    // Crea utente admin di default
    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
    
    const existingAdmin = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [defaultUsername]
    });

    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await db.execute({
        sql: `INSERT INTO users (nome, cognome, username, password, ruolo, attivo, primo_accesso) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: ['Admin', 'Sistema', defaultUsername, hashedPassword, 'admin', 1, 1]
      });
      console.log(`✅ Utente admin creato: ${defaultUsername}`);
      console.log(`🔑 Password temporanea: ${defaultPassword}`);
      console.log('⚠️  IMPORTANTE: Cambia la password al primo accesso!');
    } else {
      console.log('ℹ️  Utente admin già esistente');
    }

    console.log('\n🎉 Inizializzazione database completata!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione:', error);
    process.exit(1);
  }
}

initDatabase();
