require('dotenv').config();
const { all, run, query } = require('../config/database');

async function updateSchema() {
  console.log('🔄 Aggiornamento schema daily_reports...');

  try {
    // Ottieni colonne attuali
    const columns = await all("PRAGMA table_info(daily_reports)");
    const columnNames = columns.map(col => col.name);
    
    console.log('📋 Colonne attuali:', columnNames);

    // Colonne da aggiungere se mancano
    const newColumns = [
      { name: 'orario_partenza', type: 'TIME' },
      { name: 'orario_partenza_effettivo', type: 'DATETIME' },
      { name: 'metodo_rifornimento', type: 'TEXT' },
      { name: 'importo_rifornimento', type: 'REAL' },
      { name: 'orario_rientro', type: 'TIME' },
      { name: 'pacchi_resi', type: 'INTEGER DEFAULT 0' },
      { name: 'is_substitution', type: 'INTEGER DEFAULT 0' },
      { name: 'original_driver_id', type: 'INTEGER' },
      { name: 'substitution_reason', type: 'TEXT' },
      { name: 'sostituzione_vehicle', type: 'INTEGER DEFAULT 0' }
    ];

    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`➕ Aggiunta colonna: ${col.name}`);
        await run(`ALTER TABLE daily_reports ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`✓ Colonna ${col.name} già esistente`);
      }
    }

    console.log('\n✅ Schema aggiornato con successo!');
    console.log('\n📋 Nuove colonne aggiunte:');
    console.log('  • orario_partenza (TIME)');
    console.log('  • orario_partenza_effettivo (DATETIME)');
    console.log('  • orario_rientro (TIME)');
    console.log('  • metodo_rifornimento (TEXT - IP/DKV)');
    console.log('  • importo_rifornimento (REAL)');
    console.log('  • pacchi_resi (INTEGER)');
    console.log('  • is_substitution (INTEGER) - Flag sostituzione veicolo');
    console.log('  • original_driver_id (INTEGER) - Driver originale sostituito');
    console.log('  • substitution_reason (TEXT) - Motivo sostituzione');
    console.log('  • sostituzione_vehicle (INTEGER) - Flag sostituzione veicolo');

  } catch (error) {
    console.error('❌ Errore:', error);
    throw error;
  }
}

updateSchema()
  .then(() => {
    console.log('\n🎉 Migrazione completata!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migrazione fallita:', err);
    process.exit(1);
  });
