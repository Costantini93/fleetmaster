const { createClient } = require('@libsql/client');

const db = createClient({
  url: 'file:database.db'
});

async function addFirmaColumn() {
  try {
    console.log('🔄 Aggiunta colonna firma a daily_reports...');

    // Verifica se la colonna esiste già
    const tableInfo = await db.execute('PRAGMA table_info(daily_reports)');
    const columns = tableInfo.rows.map(row => row[1]);

    if (!columns.includes('firma')) {
      await db.execute(`
        ALTER TABLE daily_reports ADD COLUMN firma TEXT
      `);
      console.log('✓ Colonna firma aggiunta a daily_reports');
    } else {
      console.log('⚠ Colonna firma già presente in daily_reports');
    }

  } catch (error) {
    console.error('Errore durante la migrazione:', error.message);
  } finally {
    db.close();
  }
}

addFirmaColumn();
