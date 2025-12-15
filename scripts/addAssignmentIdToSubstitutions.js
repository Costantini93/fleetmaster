const { run, get } = require('../config/database');

async function addAssignmentIdColumn() {
  try {
    console.log('🔄 Aggiunta colonna assignment_id a substitutions...');
    
    const tableInfo = await get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='substitutions'"
    );
    
    if (tableInfo && !tableInfo.sql.includes('assignment_id')) {
      await run('ALTER TABLE substitutions ADD COLUMN assignment_id INTEGER');
      await run('ALTER TABLE substitutions ADD COLUMN compilata INTEGER DEFAULT 0');
      console.log('✓ Colonne aggiunte con successo');
      console.log('  - assignment_id: collegamento all\'assegnazione');
      console.log('  - compilata: 0=non compilata dal driver, 1=compilata');
    } else {
      console.log('✓ Colonne già presenti');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
}

addAssignmentIdColumn();
