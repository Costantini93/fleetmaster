require('dotenv').config();
const { db } = require('../config/database');

async function addVehicleDocumentsColumns() {
  console.log('🔄 Aggiunta colonne documenti veicoli...');

  try {
    // Aggiungi colonne per i documenti PDF
    const columns = [
      { name: 'libretto_pdf', type: 'TEXT' },
      { name: 'assicurazione_pdf', type: 'TEXT' },
      { name: 'contratto_pdf', type: 'TEXT' }
    ];

    for (const column of columns) {
      try {
        await db.execute(`ALTER TABLE vehicles ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Colonna ${column.name} aggiunta con successo`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(`⚠️ Colonna ${column.name} già esistente, skip...`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Migrazione completata con successo!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  }
}

addVehicleDocumentsColumns();
