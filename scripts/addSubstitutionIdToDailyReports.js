const { run, get } = require('../config/database');

async function addSubstitutionIdColumn() {
  try {
    console.log('🔄 Aggiunta colonna substitution_id a daily_reports...');
    
    const tableInfo = await get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_reports'"
    );
    
    if (tableInfo && !tableInfo.sql.includes('substitution_id')) {
      await run('ALTER TABLE daily_reports ADD COLUMN substitution_id INTEGER');
      console.log('✓ Colonna substitution_id aggiunta con successo');
    } else {
      console.log('✓ Colonna già presente');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
}

addSubstitutionIdColumn();
