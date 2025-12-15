const { all } = require('../config/database');

async function checkRoster() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('\n=== VERIFICA ROSTER PER OGGI:', today, '===\n');
    
    const rosterEntries = await all(`
      SELECT r.id, r.user_id, r.data, r.turno, u.nome, u.cognome, u.attivo
      FROM roster r
      JOIN users u ON r.user_id = u.id
      WHERE r.data = ?
      ORDER BY u.cognome, u.nome
    `, [today]);
    
    if (rosterEntries.length === 0) {
      console.log('❌ Nessun driver nel roster per oggi');
    } else {
      console.log(`✓ ${rosterEntries.length} driver nel roster:\n`);
      rosterEntries.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.nome} ${entry.cognome} (ID: ${entry.user_id}) - Turno: ${entry.turno} - Attivo: ${entry.attivo === 1 ? 'Sì' : 'No'}`);
      });
    }
    
    console.log('\n=== VERIFICA ASSEGNAZIONI PER OGGI ===\n');
    
    const assignments = await all(`
      SELECT a.id, a.user_id, a.vehicle_id, a.turno, u.nome, u.cognome, v.targa
      FROM assignments a
      JOIN users u ON a.user_id = u.id
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.data = ?
      ORDER BY a.turno, u.cognome, u.nome
    `, [today]);
    
    if (assignments.length === 0) {
      console.log('❌ Nessuna assegnazione per oggi');
    } else {
      console.log(`✓ ${assignments.length} assegnazioni create:\n`);
      assignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.nome} ${assignment.cognome} → ${assignment.targa} (Turno: ${assignment.turno})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Errore:', error);
    process.exit(1);
  }
}

checkRoster();
