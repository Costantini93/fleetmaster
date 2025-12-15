const { run, get, all } = require('../config/database');

async function migrateSubstitutions() {
  try {
    console.log('🔄 Verifica struttura tabella substitutions...');
    
    // Verifica se la tabella esiste già e che struttura ha
    const tableInfo = await get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='substitutions'"
    );
    
    if (tableInfo) {
      console.log('📋 Tabella substitutions esistente trovata');
      console.log('🗑️  Eliminazione vecchia tabella...');
      
      // Elimina la vecchia tabella
      await run('DROP TABLE IF EXISTS substitutions');
      console.log('✓ Vecchia tabella eliminata');
    }

    // Crea nuova tabella per sostituzioni veicoli
    console.log('🆕 Creazione nuova tabella per sostituzioni veicoli...');
    await run(`
      CREATE TABLE substitutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_originale_id INTEGER NOT NULL,
        vehicle_sostituto_id INTEGER NOT NULL,
        data_inizio DATE NOT NULL,
        data_fine DATE,
        motivo TEXT NOT NULL,
        note TEXT,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_originale_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (vehicle_sostituto_id) REFERENCES vehicles(id) ON DELETE CASCADE
      )
    `);

    console.log('✓ Nuova tabella substitutions creata con successo');
    console.log('');
    console.log('📝 Struttura tabella:');
    console.log('   - vehicle_originale_id: veicolo in riparazione/manutenzione');
    console.log('   - vehicle_sostituto_id: veicolo sostitutivo assegnato');
    console.log('   - data_inizio: data inizio sostituzione');
    console.log('   - data_fine: data fine sostituzione (NULL se ancora attiva)');
    console.log('   - motivo: motivo della sostituzione');
    console.log('   - note: note aggiuntive');

    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  }
}

migrateSubstitutions();
