const { run, get } = require('../config/database');

async function ensureVehiclesStato() {
  const info = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='vehicles'");
  if (info && info.sql && !info.sql.includes('stato')) {
    await run("ALTER TABLE vehicles ADD COLUMN stato TEXT DEFAULT 'attivo'");
    console.log('✓ Aggiunta colonna vehicles.stato');
  } else {
    console.log('✓ vehicles.stato già presente');
  }
}

async function ensureMaintenanceLetta() {
  const info = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='maintenance_requests'");
  if (info && info.sql && !info.sql.includes('letta')) {
    await run("ALTER TABLE maintenance_requests ADD COLUMN letta INTEGER DEFAULT 0");
    console.log('✓ Aggiunta colonna maintenance_requests.letta');
  } else {
    console.log('✓ maintenance_requests.letta già presente');
  }
}

(async () => {
  try {
    await ensureVehiclesStato();
    await ensureMaintenanceLetta();
    console.log('✅ Migrazioni schema completate');
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore migrazioni:', err);
    process.exit(1);
  }
})();
