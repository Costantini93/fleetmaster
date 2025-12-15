// Script per aggiungere colonna fixed_vehicle_id alla tabella users
require('dotenv').config();
const { db } = require('../config/database');

async function addFixedVehicleColumn() {
  console.log('🔄 Aggiunta colonna fixed_vehicle_id alla tabella users...');

  try {
    // Verifica se la colonna esiste già
    const result = await db.execute('PRAGMA table_info(users)');
    const columns = result.rows.map(col => col.name);
    
    if (columns.includes('fixed_vehicle_id')) {
      console.log('✅ La colonna fixed_vehicle_id esiste già');
      return;
    }

    // Aggiungi la colonna
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN fixed_vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL
    `);

    console.log('✅ Colonna fixed_vehicle_id aggiunta con successo!');

    // Verifica finale
    const finalResult = await db.execute('PRAGMA table_info(users)');
    console.log('\n📋 Struttura aggiornata tabella users:');
    finalResult.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta della colonna:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

addFixedVehicleColumn();
