const { createClient } = require('@libsql/client');

const db = createClient({
  url: 'file:database.db'
});

async function addFotoCruscottoColumn() {
  try {
    console.log('🔧 Aggiunta colonna foto_cruscotto alla tabella daily_reports...');

    // Verifica se la colonna esiste già
    const tableInfo = await db.execute('PRAGMA table_info(daily_reports)');
    const columns = tableInfo.rows.map(row => row.name);
    
    if (columns.includes('foto_cruscotto')) {
      console.log('✅ Colonna foto_cruscotto già esistente.');
      return;
    }

    // Aggiungi colonna
    await db.execute(`
      ALTER TABLE daily_reports 
      ADD COLUMN foto_cruscotto TEXT
    `);

    console.log('✅ Colonna foto_cruscotto aggiunta con successo!');

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  } finally {
    await db.close();
  }
}

addFotoCruscottoColumn();
