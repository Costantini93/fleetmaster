const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ExcelJS = require('exceljs');
const { get, all, run } = require('../config/database');
const { isAuthenticated, isAdmin, checkFirstLogin, logActivity } = require('../middleware/auth');

// Continua dal file admin.js precedente...

// ==================== GESTIONE CONTRATTI NOLEGGIO ====================
router.get('/vehicles/:id/contracts', async (req, res) => {
  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) {
      req.flash('error_msg', 'Veicolo non trovato');
      return res.redirect('/admin/vehicles');
    }

    const contracts = await all(
      'SELECT * FROM rental_contracts WHERE vehicle_id = ? ORDER BY data_scadenza DESC',
      [req.params.id]
    );

    res.render('admin/vehicle-contracts', {
      title: `Contratti Noleggio - ${vehicle.targa}`,
      vehicle,
      contracts
    });

  } catch (error) {
    console.error('Errore lista contratti:', error);
    req.flash('error_msg', 'Errore nel caricamento dei contratti');
    res.redirect('/admin/vehicles');
  }
});

router.post('/vehicles/:id/contracts', async (req, res) => {
  const { data_inizio, data_scadenza, fornitore, costo_mensile, note } = req.body;

  try {
    await run(
      `INSERT INTO rental_contracts (vehicle_id, data_inizio, data_scadenza, fornitore, costo_mensile, note) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, data_inizio, data_scadenza, fornitore || null, costo_mensile || null, note || null]
    );

    await logActivity(
      req.user.id,
      req.user.username,
      'CREA_CONTRATTO',
      `Contratto noleggio aggiunto per veicolo ID ${req.params.id}`
    );

    req.flash('success_msg', 'Contratto aggiunto con successo!');
    res.redirect(`/admin/vehicles/${req.params.id}/contracts`);

  } catch (error) {
    console.error('Errore creazione contratto:', error);
    req.flash('error_msg', 'Errore durante la creazione del contratto');
    res.redirect(`/admin/vehicles/${req.params.id}/contracts`);
  }
});

router.post('/contracts/:id/delete', async (req, res) => {
  try {
    const contract = await get('SELECT vehicle_id FROM rental_contracts WHERE id = ?', [req.params.id]);
    
    if (!contract) {
      return res.json({ success: false, message: 'Contratto non trovato' });
    }

    await run('DELETE FROM rental_contracts WHERE id = ?', [req.params.id]);

    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_CONTRATTO',
      `Contratto ID ${req.params.id} eliminato`
    );

    res.json({ success: true, message: 'Contratto eliminato con successo' });

  } catch (error) {
    console.error('Errore eliminazione contratto:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

// ==================== GESTIONE SCADENZARIO MANUTENZIONI ====================
router.get('/vehicles/:id/maintenance-schedule', async (req, res) => {
  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) {
      req.flash('error_msg', 'Veicolo non trovato');
      return res.redirect('/admin/vehicles');
    }

    const schedules = await all(
      'SELECT * FROM maintenance_schedules WHERE vehicle_id = ? ORDER BY prossima_manutenzione_km',
      [req.params.id]
    );

    res.render('admin/vehicle-maintenance-schedule', {
      title: `Scadenzario Manutenzioni - ${vehicle.targa}`,
      vehicle,
      schedules
    });

  } catch (error) {
    console.error('Errore scadenzario manutenzioni:', error);
    req.flash('error_msg', 'Errore nel caricamento dello scadenzario');
    res.redirect('/admin/vehicles');
  }
});

router.post('/vehicles/:id/maintenance-schedule', async (req, res) => {
  const { tipo_manutenzione, km_previsti, ultima_manutenzione_km, note } = req.body;

  try {
    const vehicle = await get('SELECT km_attuali FROM vehicles WHERE id = ?', [req.params.id]);
    const prossima = parseInt(ultima_manutenzione_km || 0) + parseInt(km_previsti);

    await run(
      `INSERT INTO maintenance_schedules 
       (vehicle_id, tipo_manutenzione, km_previsti, ultima_manutenzione_km, prossima_manutenzione_km, note) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, tipo_manutenzione, km_previsti, ultima_manutenzione_km || 0, prossima, note || null]
    );

    await logActivity(
      req.user.id,
      req.user.username,
      'CREA_SCADENZA_MANUTENZIONE',
      `Scadenza manutenzione aggiunta per veicolo ID ${req.params.id}`
    );

    req.flash('success_msg', 'Scadenza manutenzione aggiunta con successo!');
    res.redirect(`/admin/vehicles/${req.params.id}/maintenance-schedule`);

  } catch (error) {
    console.error('Errore creazione scadenza:', error);
    req.flash('error_msg', 'Errore durante la creazione della scadenza');
    res.redirect(`/admin/vehicles/${req.params.id}/maintenance-schedule`);
  }
});

router.post('/maintenance-schedule/:id/update', async (req, res) => {
  const { ultima_manutenzione_km } = req.body;

  try {
    const schedule = await get('SELECT * FROM maintenance_schedules WHERE id = ?', [req.params.id]);
    
    if (!schedule) {
      return res.json({ success: false, message: 'Scadenza non trovata' });
    }

    const prossima = parseInt(ultima_manutenzione_km) + parseInt(schedule.km_previsti);

    await run(
      `UPDATE maintenance_schedules 
       SET ultima_manutenzione_km = ?, prossima_manutenzione_km = ? 
       WHERE id = ?`,
      [ultima_manutenzione_km, prossima, req.params.id]
    );

    await logActivity(
      req.user.id,
      req.user.username,
      'AGGIORNA_MANUTENZIONE',
      `Scadenza manutenzione ID ${req.params.id} aggiornata`
    );

    res.json({ success: true, message: 'Scadenza aggiornata con successo' });

  } catch (error) {
    console.error('Errore aggiornamento scadenza:', error);
    res.json({ success: false, message: 'Errore durante l\'aggiornamento' });
  }
});

router.post('/maintenance-schedule/:id/delete', async (req, res) => {
  try {
    await run('DELETE FROM maintenance_schedules WHERE id = ?', [req.params.id]);

    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_SCADENZA_MANUTENZIONE',
      `Scadenza manutenzione ID ${req.params.id} eliminata`
    );

    res.json({ success: true, message: 'Scadenza eliminata con successo' });

  } catch (error) {
    console.error('Errore eliminazione scadenza:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

// ==================== PAGINA ALERT SCADENZE ====================
router.get('/expiration-alerts', async (req, res) => {
  try {
    // Contratti in scadenza
    const expiringContracts = await all(
      `SELECT rc.*, v.targa, v.modello,
              CAST((julianday(rc.data_scadenza) - julianday('now')) AS INTEGER) as giorni_rimanenti
       FROM rental_contracts rc
       JOIN vehicles v ON rc.vehicle_id = v.id
       WHERE DATE(rc.data_scadenza) >= DATE('now')
       ORDER BY rc.data_scadenza`
    );

    // Manutenzioni in scadenza
    const maintenanceAlerts = await all(
      `SELECT ms.*, v.targa, v.modello, v.km_attuali,
              (ms.prossima_manutenzione_km - v.km_attuali) as km_rimanenti
       FROM maintenance_schedules ms
       JOIN vehicles v ON ms.vehicle_id = v.id
       WHERE v.attivo = 1
       ORDER BY km_rimanenti`
    );

    // Statistiche
    const overdueContracts = expiringContracts.filter(c => c.giorni_rimanenti < 0).length;
    const imminentContracts = expiringContracts.filter(c => c.giorni_rimanenti >= 0 && c.giorni_rimanenti <= 30).length;
    const imminentMaintenance = maintenanceAlerts.filter(m => m.km_rimanenti >= 0 && m.km_rimanenti <= 200).length;
    const okVehicles = maintenanceAlerts.filter(m => m.km_rimanenti > 200).length;

    res.render('admin/expiration-alerts', {
      title: 'Alert Scadenze - ROBI Fleet',
      expiringContracts,
      maintenanceAlerts,
      stats: {
        overdueContracts,
        imminentContracts,
        imminentMaintenance,
        okVehicles
      }
    });

  } catch (error) {
    console.error('Errore alert scadenze:', error);
    req.flash('error_msg', 'Errore nel caricamento degli alert');
    res.redirect('/admin/dashboard');
  }
});

// ==================== GESTIONE ROSTER (TURNI) ====================
router.get('/roster', async (req, res) => {
  try {
    // Ottieni settimana corrente o richiesta
    const weekOffset = parseInt(req.query.week || 0);
    const today = new Date();
    today.setDate(today.getDate() + (weekOffset * 7));
    
    // Calcola inizio settimana (lunedì)
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    // Genera array di 7 giorni
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDays.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('it-IT', { weekday: 'long' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('it-IT', { month: 'short' })
      });
    }

    // Ottieni turni per questa settimana
    const startDate = weekDays[0].date;
    const endDate = weekDays[6].date;

    const roster = await all(
      `SELECT r.*, u.nome, u.cognome
       FROM roster r
       JOIN users u ON r.user_id = u.id
       WHERE r.data BETWEEN ? AND ?
       ORDER BY r.data, r.turno`,
      [startDate, endDate]
    );

    // Ottieni tutti i rider attivi
    const riders = await all(
      `SELECT id, nome, cognome FROM users 
       WHERE ruolo = 'rider' AND attivo = 1 
       ORDER BY cognome, nome`
    );

    res.render('admin/roster', {
      title: 'Gestione Turni - ROBI Fleet',
      currentPage: 'roster',
      weekDays,
      roster,
      riders,
      weekOffset,
      currentWeekStart: weekDays[0].date
    });

  } catch (error) {
    console.error('Errore roster:', error);
    req.flash('error_msg', 'Errore nel caricamento del roster');
    res.redirect('/admin/dashboard');
  }
});

router.post('/roster', async (req, res) => {
  const { user_id, data, turno } = req.body;

  try {
    // Verifica se esiste già
    const existing = await get(
      'SELECT id FROM roster WHERE user_id = ? AND data = ? AND turno = ?',
      [user_id, data, turno]
    );

    if (existing) {
      return res.json({ success: false, message: 'Turno già esistente' });
    }

    await run(
      'INSERT INTO roster (user_id, data, turno) VALUES (?, ?, ?)',
      [user_id, data, turno]
    );

    await logActivity(
      req.user.id,
      req.user.username,
      'CREA_TURNO',
      `Turno aggiunto: data ${data}, turno ${turno}`
    );

    res.json({ success: true, message: 'Turno aggiunto con successo' });

  } catch (error) {
    console.error('Errore creazione turno:', error);
    res.json({ success: false, message: 'Errore durante la creazione del turno' });
  }
});

router.post('/roster/:id/delete', async (req, res) => {
  try {
    await run('DELETE FROM roster WHERE id = ?', [req.params.id]);

    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_TURNO',
      `Turno ID ${req.params.id} eliminato`
    );

    res.json({ success: true, message: 'Turno eliminato con successo' });

  } catch (error) {
    console.error('Errore eliminazione turno:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

// ==================== GESTIONE ASSEGNAZIONI VEICOLI ====================
router.get('/assignments', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Ottieni assegnazioni per la data
    const assignments = await all(
      `SELECT a.*, u.nome, u.cognome, v.targa, v.modello
       FROM assignments a
       JOIN users u ON a.user_id = u.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.data = ?
       ORDER BY a.turno, u.cognome`,
      [date]
    );

    // Ottieni roster per la data (per assegnazione automatica)
    const roster = await all(
      `SELECT r.*, u.nome, u.cognome
       FROM roster r
       JOIN users u ON r.user_id = u.id
       WHERE r.data = ?`,
      [date]
    );

    // Veicoli disponibili (esclusi quelli già assegnati per la data)
    const assignedVehicleIds = assignments.map(a => a.vehicle_id);
    let vehicles;
    
    if (assignedVehicleIds.length > 0) {
      const placeholders = assignedVehicleIds.map(() => '?').join(',');
      vehicles = await all(
        `SELECT * FROM vehicles 
         WHERE attivo = 1 
         AND id NOT IN (${placeholders})
         ORDER BY targa`,
        assignedVehicleIds
      );
    } else {
      vehicles = await all(
        `SELECT * FROM vehicles 
         WHERE attivo = 1 
         ORDER BY targa`
      );
    }

    // Rider disponibili dal roster (esclusi quelli già assegnati)
    const assignedUserIds = assignments.map(a => a.user_id);
    let availableRiders;
    
    if (assignedUserIds.length > 0) {
      const placeholders = assignedUserIds.map(() => '?').join(',');
      availableRiders = await all(
        `SELECT r.data, r.user_id, u.nome, u.cognome, 'mattina' as turno
         FROM roster r
         JOIN users u ON r.user_id = u.id
         WHERE r.data = ?
         AND r.user_id NOT IN (${placeholders})`,
        [date, ...assignedUserIds]
      );
    } else {
      availableRiders = await all(
        `SELECT r.data, r.user_id, u.nome, u.cognome, 'mattina' as turno
         FROM roster r
         JOIN users u ON r.user_id = u.id
         WHERE r.data = ?`,
        [date]
      );
    }

    res.render('admin/assignments', {
      title: 'Gestione Assegnazioni - ROBI Fleet',
      currentPage: 'assignments',
      assignments,
      roster,
      availableRiders: availableRiders,
      vehicles,
      availableVehicles: vehicles,
      selectedDate: date
    });

  } catch (error) {
    console.error('Errore assegnazioni:', error);
    req.flash('error_msg', 'Errore nel caricamento delle assegnazioni');
    res.redirect('/admin/dashboard');
  }
});

router.post('/assignments', async (req, res) => {
  const { user_id, vehicle_id, data, turno, assegnazione_automatica } = req.body;

  try {
    // Verifica che il veicolo non sia già assegnato
    const existingVehicle = await get(
      'SELECT id FROM assignments WHERE vehicle_id = ? AND data = ? AND turno = ?',
      [vehicle_id, data, turno]
    );

    if (existingVehicle) {
      return res.json({ success: false, message: 'Veicolo già assegnato per questo turno' });
    }

    await run(
      'INSERT INTO assignments (user_id, vehicle_id, data, turno, assegnazione_automatica) VALUES (?, ?, ?, ?, ?)',
      [user_id, vehicle_id, data, turno, assegnazione_automatica || 0]
    );

    await logActivity(
      req.user.id,
      req.user.username,
      'CREA_ASSEGNAZIONE',
      `Veicolo ${vehicle_id} assegnato a rider ${user_id} per ${data}`
    );

    res.json({ success: true, message: 'Assegnazione creata con successo' });

  } catch (error) {
    console.error('Errore creazione assegnazione:', error);
    res.json({ success: false, message: 'Errore durante la creazione dell\'assegnazione' });
  }
});

router.post('/assignments/:id/delete', async (req, res) => {
  try {
    await run('DELETE FROM assignments WHERE id = ?', [req.params.id]);

    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_ASSEGNAZIONE',
      `Assegnazione ID ${req.params.id} eliminata`
    );

    res.json({ success: true, message: 'Assegnazione eliminata con successo' });

  } catch (error) {
    console.error('Errore eliminazione assegnazione:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

// Eliminazione multipla assegnazioni
router.post('/assignments/delete-multiple', async (req, res) => {
  try {
    const { assignment_ids } = req.body;

    if (!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return res.json({ success: false, message: 'Nessuna assegnazione selezionata' });
    }

    const placeholders = assignment_ids.map(() => '?').join(',');
    await run(`DELETE FROM assignments WHERE id IN (${placeholders})`, assignment_ids);

    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_ASSEGNAZIONI_MULTIPLE',
      `${assignment_ids.length} assegnazioni eliminate`
    );

    res.json({ 
      success: true, 
      message: `${assignment_ids.length} assegnazione/i eliminata/e con successo` 
    });

  } catch (error) {
    console.error('Errore eliminazione multipla assegnazioni:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

// ==================== ESPORTAZIONE DATI ====================

// Export CSV Rapporti Giornalieri
router.get('/dashboard/export-reports-csv', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

    const recentReports = await all(
      `SELECT 
         a.id as assignment_id,
         a.turno,
         u.id as user_id,
         u.nome,
         u.cognome,
         v.id as vehicle_id,
         v.targa,
         v.modello,
         dr.id as report_id,
         dr.data,
         dr.stato,
         dr.codice_giro,
         dr.km_partenza,
         dr.km_arrivo,
         dr.ora_partenza,
         dr.ora_arrivo,
         dr.metodo_rifornimento,
         dr.importo_rifornimento,
         dr.pacchi_resi
       FROM assignments a
       JOIN users u ON a.user_id = u.id
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN daily_reports dr ON dr.user_id = a.user_id 
         AND dr.vehicle_id = a.vehicle_id 
         AND dr.data = a.data
       WHERE a.data = ?
       ORDER BY a.turno, u.cognome, u.nome`,
      [selectedDate]
    );

    // Genera CSV
    const csvHeader = 'Data,Driver,Targa,Codice Rotta,KM Partenza,KM Rientro,KM Percorsi,Orario Partenza,Orario Rientro,Rifornimento,Importo,Pacchi Resi,Status\n';
    const csvRows = recentReports.map(r => {
      const kmPercorsi = r.km_arrivo && r.km_partenza ? r.km_arrivo - r.km_partenza : '';
      const oraPartenza = r.ora_partenza ? new Date(r.ora_partenza).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
      const oraArrivo = r.ora_arrivo ? new Date(r.ora_arrivo).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
      const status = !r.report_id ? 'In attesa GDB' : (r.km_arrivo ? 'Rientrato' : 'In viaggio');
      
      return `${r.data || selectedDate},"${r.nome} ${r.cognome}",${r.targa},${r.codice_giro || ''},${r.km_partenza || ''},${r.km_arrivo || ''},${kmPercorsi},${oraPartenza},${oraArrivo},${r.metodo_rifornimento || ''},${r.importo_rifornimento || ''},${r.pacchi_resi || ''},${status}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rapporti_${selectedDate}.csv"`);
    res.send('\uFEFF' + csv); // BOM per UTF-8

  } catch (error) {
    console.error('Errore export CSV rapporti:', error);
    res.status(500).send('Errore durante l\'esportazione');
  }
});

// Export Excel Rapporti Giornalieri
router.get('/dashboard/export-reports-excel', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

    const recentReports = await all(
      `SELECT 
         a.id as assignment_id,
         a.turno,
         u.id as user_id,
         u.nome,
         u.cognome,
         v.id as vehicle_id,
         v.targa,
         v.modello,
         dr.id as report_id,
         dr.data,
         dr.stato,
         dr.codice_giro,
         dr.km_partenza,
         dr.km_arrivo,
         dr.ora_partenza,
         dr.ora_arrivo,
         dr.metodo_rifornimento,
         dr.importo_rifornimento,
         dr.pacchi_resi
       FROM assignments a
       JOIN users u ON a.user_id = u.id
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN daily_reports dr ON dr.user_id = a.user_id 
         AND dr.vehicle_id = a.vehicle_id 
         AND dr.data = a.data
       WHERE a.data = ?
       ORDER BY a.turno, u.cognome, u.nome`,
      [selectedDate]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rapporti Giornalieri');

    worksheet.columns = [
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Driver', key: 'driver', width: 25 },
      { header: 'Targa', key: 'targa', width: 12 },
      { header: 'Codice Rotta', key: 'codice_giro', width: 15 },
      { header: 'KM Partenza', key: 'km_partenza', width: 12 },
      { header: 'KM Rientro', key: 'km_arrivo', width: 12 },
      { header: 'KM Percorsi', key: 'km_percorsi', width: 12 },
      { header: 'Orario Partenza', key: 'ora_partenza', width: 15 },
      { header: 'Orario Rientro', key: 'ora_arrivo', width: 15 },
      { header: 'Rifornimento', key: 'metodo_rifornimento', width: 15 },
      { header: 'Importo', key: 'importo_rifornimento', width: 10 },
      { header: 'Pacchi Resi', key: 'pacchi_resi', width: 12 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    recentReports.forEach(r => {
      const kmPercorsi = r.km_arrivo && r.km_partenza ? r.km_arrivo - r.km_partenza : '';
      const oraPartenza = r.ora_partenza ? new Date(r.ora_partenza).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
      const oraArrivo = r.ora_arrivo ? new Date(r.ora_arrivo).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
      const status = !r.report_id ? 'In attesa GDB' : (r.km_arrivo ? 'Rientrato' : 'In viaggio');

      worksheet.addRow({
        data: r.data || selectedDate,
        driver: `${r.nome} ${r.cognome}`,
        targa: r.targa,
        codice_giro: r.codice_giro || '',
        km_partenza: r.km_partenza || '',
        km_arrivo: r.km_arrivo || '',
        km_percorsi: kmPercorsi,
        ora_partenza: oraPartenza,
        ora_arrivo: oraArrivo,
        metodo_rifornimento: r.metodo_rifornimento || '',
        importo_rifornimento: r.importo_rifornimento || '',
        pacchi_resi: r.pacchi_resi || '',
        status: status
      });
    });

    // Stile header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rapporti_${selectedDate}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Errore export Excel rapporti:', error);
    res.status(500).send('Errore durante l\'esportazione');
  }
});

// Export CSV Km Finali Furgoni
router.get('/dashboard/export-km-csv', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

    const vehicleKmByRoute = await all(
      `SELECT 
         v.modello,
         v.targa,
         dr.km_arrivo as km_finali,
         dr.codice_giro as rotta
       FROM daily_reports dr
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.data = ?
         AND dr.km_arrivo IS NOT NULL
       ORDER BY dr.codice_giro ASC`,
      [selectedDate]
    );

    const csvHeader = 'Rotta,Modello,Targa,KM Finali\n';
    const csvRows = vehicleKmByRoute.map(v => {
      return `${v.rotta},${v.modello},${v.targa},${v.km_finali}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="km_finali_${selectedDate}.csv"`);
    res.send('\uFEFF' + csv);

  } catch (error) {
    console.error('Errore export CSV km:', error);
    res.status(500).send('Errore durante l\'esportazione');
  }
});

// Export Excel Km Finali Furgoni
router.get('/dashboard/export-km-excel', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

    const vehicleKmByRoute = await all(
      `SELECT 
         v.modello,
         v.targa,
         dr.km_arrivo as km_finali,
         dr.codice_giro as rotta
       FROM daily_reports dr
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.data = ?
         AND dr.km_arrivo IS NOT NULL
       ORDER BY dr.codice_giro ASC`,
      [selectedDate]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Km Finali Furgoni');

    worksheet.columns = [
      { header: 'Rotta', key: 'rotta', width: 15 },
      { header: 'Modello', key: 'modello', width: 25 },
      { header: 'Targa', key: 'targa', width: 12 },
      { header: 'KM Finali', key: 'km_finali', width: 12 }
    ];

    vehicleKmByRoute.forEach(v => {
      worksheet.addRow({
        rotta: v.rotta,
        modello: v.modello,
        targa: v.targa,
        km_finali: v.km_finali
      });
    });

    // Stile header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="km_finali_${selectedDate}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Errore export Excel km:', error);
    res.status(500).send('Errore durante l\'esportazione');
  }
});

module.exports = router;
