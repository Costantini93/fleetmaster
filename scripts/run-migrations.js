const { run, get } = require('../config/database');

async function ensureColumn(table, column, definition, defaultValue = null) {
  const info = await get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`);
  if (info && info.sql && !info.sql.includes(column)) {
    const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}${defaultValue ? ` DEFAULT ${defaultValue}` : ''}`;
    await run(sql);
    console.log(`✓ Aggiunta colonna ${table}.${column}`);
    return true;
  } else {
    console.log(`✓ ${table}.${column} già presente`);
    return false;
  }
}

(async () => {
  try {
    console.log('🔄 Esecuzione migrazioni complete...\n');
    
    // VEHICLES
    await ensureColumn('vehicles', 'stato', 'TEXT', "'attivo'");
    
    // USERS
    await ensureColumn('users', 'fixed_vehicle_id', 'INTEGER REFERENCES vehicles(id) ON DELETE SET NULL');
    
    // MAINTENANCE_REQUESTS
    await ensureColumn('maintenance_requests', 'letta', 'INTEGER', '0');
    
    // DAILY_REPORTS
    await ensureColumn('daily_reports', 'metodo_rifornimento', "TEXT CHECK(metodo_rifornimento IN ('IP', 'DKV', 'Nessuno'))");
    await ensureColumn('daily_reports', 'importo_rifornimento', 'REAL');
    await ensureColumn('daily_reports', 'numero_tessera_dkv', 'TEXT');
    await ensureColumn('daily_reports', 'substitution_id', 'INTEGER');
    await ensureColumn('daily_reports', 'firma', 'TEXT');
    await ensureColumn('daily_reports', 'foto_cruscotto', 'TEXT');
    
    // SUBSTITUTIONS
    await ensureColumn('substitutions', 'assignment_id', 'INTEGER');
    await ensureColumn('substitutions', 'vehicle_originale_id', 'INTEGER REFERENCES vehicles(id)');
    await ensureColumn('substitutions', 'compilata', 'INTEGER', '0');
    
    console.log('\n✅ Migrazioni schema completate');
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore migrazioni:', err);
    process.exit(1);
  }
})();
