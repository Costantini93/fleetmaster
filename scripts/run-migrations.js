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

async function ensureDailyReportsRifornimento() {
  const info = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_reports'");
  if (info && info.sql) {
    if (!info.sql.includes('metodo_rifornimento')) {
      await run("ALTER TABLE daily_reports ADD COLUMN metodo_rifornimento TEXT CHECK(metodo_rifornimento IN ('IP', 'DKV', 'Nessuno'))");
      console.log('✓ Aggiunta colonna daily_reports.metodo_rifornimento');
    } else {
      console.log('✓ daily_reports.metodo_rifornimento già presente');
    }
    
    if (!info.sql.includes('importo_rifornimento')) {
      await run("ALTER TABLE daily_reports ADD COLUMN importo_rifornimento REAL");
      console.log('✓ Aggiunta colonna daily_reports.importo_rifornimento');
    } else {
      console.log('✓ daily_reports.importo_rifornimento già presente');
    }
    
    if (!info.sql.includes('numero_tessera_dkv')) {
      await run("ALTER TABLE daily_reports ADD COLUMN numero_tessera_dkv TEXT");
      console.log('✓ Aggiunta colonna daily_reports.numero_tessera_dkv');
    } else {
      console.log('✓ daily_reports.numero_tessera_dkv già presente');
    }
  }
}

(async () => {
  try {
    await ensureVehiclesStato();
    await ensureMaintenanceLetta();
    await ensureDailyReportsRifornimento();
    console.log('✅ Migrazioni schema completate');
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore migrazioni:', err);
    process.exit(1);
  }
})();
