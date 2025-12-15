const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:database.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function checkAssignments() {
  try {
    console.log('🔍 Controllo assegnazioni...\n');

    // Veicoli attivi
    const vehicles = await db.execute('SELECT id, targa, attivo FROM vehicles WHERE attivo = 1');
    console.log('📌 VEICOLI ATTIVI:', vehicles.rows.length);
    vehicles.rows.forEach(v => console.log(`   - ID ${v.id}: ${v.targa}`));

    // Drivers (riders)
    const drivers = await db.execute(`SELECT id, nome, cognome, fixed_vehicle_id FROM users WHERE ruolo = 'rider' AND attivo = 1`);
    console.log('\n📌 DRIVERS ATTIVI:', drivers.rows.length);
    drivers.rows.forEach(d => console.log(`   - ID ${d.id}: ${d.nome} ${d.cognome} (fixed_vehicle: ${d.fixed_vehicle_id || 'Nessuno'})`));

    // Roster oggi e futuro
    const roster = await db.execute(`SELECT * FROM roster WHERE data >= date('now') ORDER BY data`);
    console.log('\n📌 ROSTER (oggi e futuro):', roster.rows.length);
    roster.rows.forEach(r => console.log(`   - Data: ${r.data}, User ID: ${r.user_id}, Turno: ${r.turno}`));

    // Assegnazioni oggi e futuro
    const assignments = await db.execute(`SELECT a.*, u.nome, u.cognome, v.targa FROM assignments a JOIN users u ON a.user_id = u.id JOIN vehicles v ON a.vehicle_id = v.id WHERE a.data >= date('now') ORDER BY a.data`);
    console.log('\n📌 ASSEGNAZIONI ESISTENTI (oggi e futuro):', assignments.rows.length);
    assignments.rows.forEach(a => console.log(`   - Data: ${a.data}, ${a.nome} ${a.cognome} -> ${a.targa}, Turno: ${a.turno}`));

    console.log('\n✅ Verifica completata');

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await db.close();
  }
}

checkAssignments();
