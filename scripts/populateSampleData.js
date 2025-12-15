/**
 * Script per popolare il database con dati di esempio
 * Esegui dopo aver inizializzato il database con initDatabase.js
 * 
 * Comando: node scripts/populateSampleData.js
 */

const { run, all } = require('../config/database');
const bcrypt = require('bcrypt');

async function populateSampleData() {
  console.log('🔄 Popolamento database con dati di esempio...\n');

  try {
    // ========== UTENTI DI ESEMPIO ==========
    console.log('👥 Creazione utenti di esempio...');
    
    const riders = [
      { username: 'mario.rossi', nome: 'Mario', cognome: 'Rossi', telefono: '3331234567' },
      { username: 'luca.bianchi', nome: 'Luca', cognome: 'Bianchi', telefono: '3337654321' },
      { username: 'paolo.verdi', nome: 'Paolo', cognome: 'Verdi', telefono: '3339876543' },
      { username: 'giuseppe.neri', nome: 'Giuseppe', cognome: 'Neri', telefono: '3332468135' },
      { username: 'franco.blu', nome: 'Franco', cognome: 'Blu', telefono: '3335791234' }
    ];

    const hashedPassword = await bcrypt.hash('Rider123!', 10);

    for (const rider of riders) {
      await run(`
        INSERT INTO users (username, password, nome, cognome, telefono, ruolo, attivo)
        VALUES (?, ?, ?, ?, ?, 'rider', 1)
      `, [rider.username, hashedPassword, rider.nome, rider.cognome, rider.telefono]);
    }

    console.log(`✅ ${riders.length} rider creati`);
    console.log('🔑 Password per tutti i rider: Rider123!\n');

    // ========== VEICOLI DI ESEMPIO ==========
    console.log('🚗 Creazione veicoli di esempio...');
    
    const vehicles = [
      { targa: 'AB123CD', modello: 'Fiat Ducato L2H2', anno: 2022, km_attuali: 45000, note: 'Cambio olio ogni 15000km' },
      { targa: 'EF456GH', modello: 'Mercedes Sprinter 314', anno: 2021, km_attuali: 68000, note: 'Tagliando ogni 20000km' },
      { targa: 'IJ789KL', modello: 'Iveco Daily 35S', anno: 2023, km_attuali: 12000, note: 'Veicolo nuovo, primo tagliando a 30000km' },
      { targa: 'MN012OP', modello: 'Fiat Ducato L3H2', anno: 2020, km_attuali: 95000, note: 'Revisione ogni 2 anni' },
      { targa: 'QR345ST', modello: 'Volkswagen Crafter', anno: 2022, km_attuali: 38000, note: 'Controllo freni ogni 10000km' },
      { targa: 'UV678WX', modello: 'Renault Master L3H2', anno: 2021, km_attuali: 72000, note: 'Cambio filtri aria ogni 20000km' }
    ];

    for (const vehicle of vehicles) {
      await run(`
        INSERT INTO vehicles (targa, modello, anno, km_attuali, note_manutenzione, attivo)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [vehicle.targa, vehicle.modello, vehicle.anno, vehicle.km_attuali, vehicle.note]);
    }

    console.log(`✅ ${vehicles.length} veicoli creati\n`);

    // ========== CONTRATTI NOLEGGIO ==========
    console.log('📄 Creazione contratti noleggio...');
    
    const today = new Date();
    const vehiclesList = await all('SELECT id FROM vehicles LIMIT 4');

    const contracts = [
      {
        vehicle_id: vehiclesList[0].id,
        data_inizio: new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString().split('T')[0],
        data_scadenza: new Date(today.getFullYear(), today.getMonth() + 6, 1).toISOString().split('T')[0],
        fornitore: 'LeasePlan Italia',
        costo_mensile: 580.00,
        note: 'Contratto 12 mesi rinnovabile'
      },
      {
        vehicle_id: vehiclesList[1].id,
        data_inizio: new Date(today.getFullYear(), today.getMonth() - 12, 15).toISOString().split('T')[0],
        data_scadenza: new Date(today.getFullYear(), today.getMonth() + 12, 15).toISOString().split('T')[0],
        fornitore: 'Arval Service Lease',
        costo_mensile: 650.00,
        note: 'Contratto 24 mesi con manutenzione inclusa'
      },
      {
        vehicle_id: vehiclesList[2].id,
        data_inizio: new Date(today.getFullYear(), 0, 10).toISOString().split('T')[0],
        data_scadenza: new Date(today.getFullYear() + 1, 0, 10).toISOString().split('T')[0],
        fornitore: 'Alphabet Fleet',
        costo_mensile: 520.00,
        note: 'Contratto 12 mesi senza opzione rinnovo'
      },
      {
        vehicle_id: vehiclesList[3].id,
        data_inizio: new Date(today.getFullYear() - 1, 6, 1).toISOString().split('T')[0],
        data_scadenza: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0],
        fornitore: 'Leasys Rent',
        costo_mensile: 490.00,
        note: 'In scadenza - valutare rinnovo'
      }
    ];

    for (const contract of contracts) {
      await run(`
        INSERT INTO rental_contracts (vehicle_id, data_inizio, data_scadenza, fornitore, costo_mensile, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [contract.vehicle_id, contract.data_inizio, contract.data_scadenza, contract.fornitore, contract.costo_mensile, contract.note]);
    }

    console.log(`✅ ${contracts.length} contratti creati\n`);

    // ========== SCADENZARIO MANUTENZIONI ==========
    console.log('🔧 Creazione scadenzario manutenzioni...');
    
    const maintenanceSchedules = [
      {
        vehicle_id: vehiclesList[0].id,
        tipo_manutenzione: 'Tagliando',
        intervallo_km: 15000,
        ultima_manutenzione_km: 45000,
        prossima_manutenzione_km: 60000,
        note: 'Cambio olio + filtri'
      },
      {
        vehicle_id: vehiclesList[0].id,
        tipo_manutenzione: 'Revisione',
        intervallo_km: 40000,
        ultima_manutenzione_km: 40000,
        prossima_manutenzione_km: 80000,
        note: 'Controllo completo officina autorizzata'
      },
      {
        vehicle_id: vehiclesList[1].id,
        tipo_manutenzione: 'Tagliando',
        intervallo_km: 20000,
        ultima_manutenzione_km: 60000,
        prossima_manutenzione_km: 80000,
        note: 'Servizio completo Mercedes'
      },
      {
        vehicle_id: vehiclesList[2].id,
        tipo_manutenzione: 'Primo Tagliando',
        intervallo_km: 30000,
        ultima_manutenzione_km: 0,
        prossima_manutenzione_km: 30000,
        note: 'Primo tagliando veicolo nuovo'
      },
      {
        vehicle_id: vehiclesList[3].id,
        tipo_manutenzione: 'Tagliando URGENTE',
        intervallo_km: 15000,
        ultima_manutenzione_km: 90000,
        prossima_manutenzione_km: 95500,
        note: 'IMMINENTE - programmare subito'
      }
    ];

    for (const schedule of maintenanceSchedules) {
      await run(`
        INSERT INTO maintenance_schedules (vehicle_id, tipo_manutenzione, km_previsti, ultima_manutenzione_km, prossima_manutenzione_km, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [schedule.vehicle_id, schedule.tipo_manutenzione, schedule.intervallo_km, schedule.ultima_manutenzione_km, schedule.prossima_manutenzione_km, schedule.note]);
    }

    console.log(`✅ ${maintenanceSchedules.length} scadenzari manutenzione creati\n`);

    // ========== TURNI SETTIMANA CORRENTE ==========
    console.log('📅 Creazione turni settimana corrente...');
    
    const ridersList = await all("SELECT id FROM users WHERE ruolo = 'rider'");
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lunedì

    let turnoCount = 0;
    for (let day = 0; day < 5; day++) { // Lun-Ven
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Assegna turni ai primi 3 rider
      for (let i = 0; i < 3 && i < ridersList.length; i++) {
        await run(`
          INSERT INTO roster (user_id, data, turno)
          VALUES (?, ?, 'mattina')
        `, [ridersList[i].id, dateStr]);
        turnoCount++;
      }
    }

    console.log(`✅ ${turnoCount} turni creati\n`);

    // ========== ASSEGNAZIONI SETTIMANA CORRENTE ==========
    console.log('🚚 Creazione assegnazioni veicoli...');
    
    const roster = await all('SELECT * FROM roster WHERE data >= ? ORDER BY data', [startOfWeek.toISOString().split('T')[0]]);
    
    let assignmentCount = 0;
    for (let i = 0; i < roster.length; i++) {
      await run(`
        INSERT INTO assignments (user_id, vehicle_id, data, turno)
        VALUES (?, ?, ?, ?)
      `, [roster[i].user_id, vehiclesList[i % vehiclesList.length].id, roster[i].data, roster[i].turno]);
      assignmentCount++;
    }

    console.log(`✅ ${assignmentCount} assegnazioni create\n`);

    // ========== RAPPORTI GIORNALIERI DI OGGI ==========
    console.log('📊 Creazione rapporti di oggi...');
    
    const todayStr = today.toISOString().split('T')[0];
    const todayAssignments = await all("SELECT * FROM assignments WHERE data = ? LIMIT 3", [todayStr]);
    
    let todayReportsCount = 0;
    for (const assignment of todayAssignments) {
      const kmPartenza = Math.floor(Math.random() * 50000) + 30000;
      const kmPercorsi = Math.floor(Math.random() * 150) + 50;
      const rifornimentoImporto = (Math.random() * 80 + 30).toFixed(2);
      const metodoRifornimento = Math.random() > 0.5 ? 'IP' : 'DKV';
      
      await run(`
        INSERT INTO daily_reports (
          user_id, vehicle_id, data, codice_giro, km_partenza, km_arrivo,
          ora_partenza, orario_partenza, orario_rientro,
          numero_ditta, tipo_carburante, numero_carta_dkv, 
          metodo_rifornimento, importo_rifornimento,
          pacchi_ritirati, pacchi_consegnati, pacchi_resi,
          stato, distanza_percorsa
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assignment.user_id,
        assignment.vehicle_id,
        assignment.data,
        `GR${Math.floor(Math.random() * 900) + 100}`,
        kmPartenza,
        kmPartenza + kmPercorsi,
        new Date(today.setHours(8, 0, 0)).toISOString(),
        '08:00',
        '18:30',
        `DITTA${Math.floor(Math.random() * 10) + 1}`,
        metodoRifornimento,
        metodoRifornimento === 'DKV' ? `${Math.floor(Math.random() * 900000) + 100000}` : null,
        metodoRifornimento,
        rifornimentoImporto,
        Math.floor(Math.random() * 150) + 50,
        Math.floor(Math.random() * 140) + 45,
        Math.floor(Math.random() * 10),
        'partito',
        kmPercorsi
      ]);
      todayReportsCount++;
    }

    console.log(`✅ ${todayReportsCount} rapporti di oggi creati\n`);

    // ========== RICHIESTE MANUTENZIONE ==========
    console.log('🔧 Creazione richieste manutenzione...');
    
    const maintenanceRequests = [
      {
        user_id: ridersList[0].id,
        vehicle_id: vehiclesList[0].id,
        descrizione: 'Rumore anomalo dal motore durante accelerazione',
        priorita: 'alta',
        stato: 'in_attesa'
      },
      {
        user_id: ridersList[1].id,
        vehicle_id: vehiclesList[1].id,
        descrizione: 'Perdita olio dal motore - vedere macchie sul pavimento',
        priorita: 'critica',
        stato: 'in_lavorazione',
        note_risoluzione: 'Veicolo portato in officina, guarnizione testata da sostituire'
      },
      {
        user_id: ridersList[2].id,
        vehicle_id: vehiclesList[3].id,
        descrizione: 'Luce spia motore accesa sul cruscotto',
        priorita: 'alta',
        stato: 'in_attesa'
      },
      {
        user_id: ridersList[0].id,
        vehicle_id: vehiclesList[2].id,
        descrizione: 'Specchietto retrovisore destro rotto',
        priorita: 'media',
        stato: 'completata',
        note_risoluzione: 'Specchietto sostituito in data odierna'
      }
    ];

    for (const req of maintenanceRequests) {
      await run(`
        INSERT INTO maintenance_requests (user_id, vehicle_id, descrizione, priorita, stato, note_risoluzione)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [req.user_id, req.vehicle_id, req.descrizione, req.priorita, req.stato, req.note_risoluzione || null]);
    }

    console.log(`✅ ${maintenanceRequests.length} richieste manutenzione create\n`);

    // ========== SOSTITUZIONI ==========
    console.log('🔄 Creazione sostituzioni...');
    
    const substitutions = [
      {
        user_assente_id: ridersList[0].id,
        user_sostituto_id: ridersList[3].id,
        data_sostituzione: new Date(today.setDate(today.getDate() - 3)).toISOString().split('T')[0],
        motivo: 'malattia',
        note: 'Influenza - certificato medico'
      },
      {
        user_assente_id: ridersList[1].id,
        user_sostituto_id: ridersList[4].id,
        data_sostituzione: new Date(today.setDate(today.getDate() + 5)).toISOString().split('T')[0],
        motivo: 'ferie',
        note: 'Ferie programmate'
      }
    ];

    for (const sub of substitutions) {
      await run(`
        INSERT INTO substitutions (user_assente_id, user_sostituto_id, data_sostituzione, motivo, note)
        VALUES (?, ?, ?, ?, ?)
      `, [sub.user_assente_id, sub.user_sostituto_id, sub.data_sostituzione, sub.motivo, sub.note]);
    }

    console.log(`✅ ${substitutions.length} sostituzioni create\n`);

    // ========== RIEPILOGO ==========
    console.log('🎉 Database popolato con successo!\n');
    console.log('📋 RIEPILOGO DATI CREATI:');
    console.log(`   • ${riders.length} rider (password: Rider123!)`);
    console.log(`   • ${vehicles.length} veicoli`);
    console.log(`   • ${contracts.length} contratti noleggio`);
    console.log(`   • ${maintenanceSchedules.length} scadenzari manutenzione`);
    console.log(`   • ${turnoCount} turni`);
    console.log(`   • ${assignmentCount} assegnazioni`);
    console.log(`   • ${todayReportsCount} rapporti di oggi`);
    console.log(`   • ${maintenanceRequests.length} richieste manutenzione`);
    console.log(`   • ${substitutions.length} sostituzioni\n`);

    console.log('💡 CREDENZIALI DI ACCESSO:');
    console.log('   ADMIN:');
    console.log('   • Username: admin');
    console.log('   • Password: Admin123! (cambiare al primo accesso)\n');
    console.log('   RIDER (tutti):');
    console.log('   • Username: mario.rossi, luca.bianchi, paolo.verdi, giuseppe.neri, franco.blu');
    console.log('   • Password: Rider123!\n');

  } catch (error) {
    console.error('❌ Errore durante il popolamento:', error.message);
    process.exit(1);
  }
}

// Esegui lo script
populateSampleData()
  .then(() => {
    console.log('✅ Script completato!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  });
