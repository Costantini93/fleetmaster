const { run, get } = require('../config/database');

async function addStatoColumn() {
  try {
    console.log('Verifica colonna stato in vehicles...');
    
    const tableInfo = await get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='vehicles'"
    );
    
    if (tableInfo && !tableInfo.sql.includes('stato')) {
      console.log('Aggiunta colonna stato...');
      await run("ALTER TABLE vehicles ADD COLUMN stato TEXT DEFAULT 'attivo'");
      console.log('✓ Colonna stato aggiunta con successo alla tabella vehicles');
      console.log('  Valori possibili: attivo, in_riparazione, fuori_servizio');
    } else {
      console.log('✓ Colonna stato già presente');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta della colonna:', error);
    process.exit(1);
  }
}

addStatoColumn();
