const { createClient } = require('@libsql/client');

const db = createClient({
  url: 'file:database.db'
});

async function addRifornimentoColumns() {
  try {
    console.log('🔧 Aggiunta colonne rifornimento alla tabella daily_reports...');

    // Verifica colonne esistenti
    const tableInfo = await db.execute('PRAGMA table_info(daily_reports)');
    const columns = tableInfo.rows.map(row => row.name);
    
    // Aggiungi metodo_rifornimento
    if (!columns.includes('metodo_rifornimento')) {
      await db.execute(`
        ALTER TABLE daily_reports 
        ADD COLUMN metodo_rifornimento TEXT CHECK(metodo_rifornimento IN ('IP', 'DKV', 'Nessuno'))
      `);
      console.log('✅ Colonna metodo_rifornimento aggiunta');
    } else {
      console.log('ℹ️  Colonna metodo_rifornimento già esistente');
    }

    // Aggiungi importo_rifornimento
    if (!columns.includes('importo_rifornimento')) {
      await db.execute(`
        ALTER TABLE daily_reports 
        ADD COLUMN importo_rifornimento REAL
      `);
      console.log('✅ Colonna importo_rifornimento aggiunta');
    } else {
      console.log('ℹ️  Colonna importo_rifornimento già esistente');
    }

    // Aggiungi numero_tessera_dkv
    if (!columns.includes('numero_tessera_dkv')) {
      await db.execute(`
        ALTER TABLE daily_reports 
        ADD COLUMN numero_tessera_dkv TEXT
      `);
      console.log('✅ Colonna numero_tessera_dkv aggiunta');
    } else {
      console.log('ℹ️  Colonna numero_tessera_dkv già esistente');
    }

    console.log('🎉 Migrazione completata con successo!');

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  } finally {
    await db.close();
  }
}

addRifornimentoColumns();
