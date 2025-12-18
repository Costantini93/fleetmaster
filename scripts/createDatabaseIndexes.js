const { run, get } = require('../config/database');

async function createDatabaseIndexes() {
  console.log('📊 Creazione indici database...');

  try {
    // Check se indici già esistono (per evitare errori su re-run)
    const existingIndexes = [];
    try {
      const indexes = await get(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND sql NOT NULL
      `);
      if (indexes) existingIndexes.push(indexes.name);
    } catch (err) {
      // Turso potrebbe non supportare sqlite_master, continuiamo
    }

    const indexes = [
      {
        name: 'idx_vehicles_attivo',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vehicles_attivo ON vehicles(attivo)'
      },
      {
        name: 'idx_vehicles_targa',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vehicles_targa ON vehicles(targa)'
      },
      {
        name: 'idx_daily_reports_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(data)'
      },
      {
        name: 'idx_daily_reports_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_daily_reports_user ON daily_reports(user_id)'
      },
      {
        name: 'idx_daily_reports_vehicle',
        sql: 'CREATE INDEX IF NOT EXISTS idx_daily_reports_vehicle ON daily_reports(vehicle_id)'
      },
      {
        name: 'idx_notifications_user_letta',
        sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_user_letta ON notifications(user_id, letta)'
      },
      {
        name: 'idx_notifications_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)'
      },
      {
        name: 'idx_assignments_data',
        sql: 'CREATE INDEX IF NOT EXISTS idx_assignments_data ON assignments(data)'
      },
      {
        name: 'idx_assignments_employee',
        sql: 'CREATE INDEX IF NOT EXISTS idx_assignments_employee ON assignments(employee_id)'
      },
      {
        name: 'idx_assignments_vehicle',
        sql: 'CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id)'
      },
      {
        name: 'idx_users_username',
        sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'
      },
      {
        name: 'idx_users_ruolo_attivo',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_ruolo_attivo ON users(ruolo, attivo)'
      },
      {
        name: 'idx_vehicle_maintenance_vehicle',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id)'
      },
      {
        name: 'idx_vehicle_maintenance_data',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_data ON vehicle_maintenance(data_manutenzione)'
      },
      {
        name: 'idx_activity_logs_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)'
      },
      {
        name: 'idx_activity_logs_timestamp',
        sql: 'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)'
      },
      {
        name: 'idx_push_subscriptions_user',
        sql: 'CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)'
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const index of indexes) {
      try {
        await run(index.sql);
        console.log(`✅ Creato indice: ${index.name}`);
        created++;
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⏭️  Indice già esistente: ${index.name}`);
          skipped++;
        } else {
          console.error(`❌ Errore creazione ${index.name}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Riepilogo:`);
    console.log(`   ✅ Creati: ${created}`);
    console.log(`   ⏭️  Già esistenti: ${skipped}`);
    console.log(`   📈 Totale indici: ${indexes.length}`);
    console.log('\n✨ Indici database ottimizzati!');

  } catch (error) {
    console.error('❌ Errore generale creazione indici:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  createDatabaseIndexes()
    .then(() => {
      console.log('\n✅ Script completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script fallito:', error);
      process.exit(1);
    });
}

module.exports = { createDatabaseIndexes };
