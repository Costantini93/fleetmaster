const { run, get } = require('../config/database');

async function addLettaColumn() {
  try {
    console.log('Verifica colonna letta in maintenance_requests...');
    
    const tableInfo = await get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='maintenance_requests'"
    );
    
    if (tableInfo && !tableInfo.sql.includes('letta')) {
      console.log('Aggiunta colonna letta...');
      await run('ALTER TABLE maintenance_requests ADD COLUMN letta INTEGER DEFAULT 0');
      console.log('✓ Colonna letta aggiunta con successo');
    } else {
      console.log('✓ Colonna letta gi\u00e0 presente');
    }

    process.exit(0);
  } catch (error) {
    console.error('Errore:', error);
    process.exit(1);
  }
}

addLettaColumn();
