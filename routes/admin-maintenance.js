const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/database');
const { isAuthenticated, isAdmin, checkFirstLogin, logActivity } = require('../middleware/auth');

// Applica middleware
router.use(isAuthenticated);
router.use(isAdmin);
router.use(checkFirstLogin);

// ==================== GESTIONE RICHIESTE MANUTENZIONE ====================
router.get('/maintenance', async (req, res) => {
  try {
    const status = req.query.status || 'all';
    const priority = req.query.priority || 'all';

    let sql = `SELECT mr.*, v.targa, v.modello, u.nome, u.cognome
               FROM maintenance_requests mr
               JOIN vehicles v ON mr.vehicle_id = v.id
               JOIN users u ON mr.user_id = u.id
               WHERE 1=1`;
    
    const params = [];

    if (status !== 'all') {
      sql += ' AND mr.stato = ?';
      params.push(status);
    }

    if (priority !== 'all') {
      sql += ' AND mr.priorita = ?';
      params.push(priority);
    }

    sql += ` ORDER BY 
             CASE mr.priorita 
               WHEN 'critica' THEN 1 
               WHEN 'alta' THEN 2 
               WHEN 'media' THEN 3 
               ELSE 4 
             END,
             mr.data_richiesta DESC`;

    const requests = await all(sql, params);

    // Marca tutte le richieste come lette quando l'admin visualizza la pagina
    await run('UPDATE maintenance_requests SET letta = 1 WHERE letta = 0');

    res.render('admin/maintenance', {
      title: 'Gestione Manutenzioni - ROBI Fleet',
      requests,
      filters: { status, priority }
    });

  } catch (error) {
    console.error('Errore lista manutenzioni:', error);
    req.flash('error_msg', 'Errore nel caricamento delle manutenzioni');
    res.redirect('/admin/dashboard');
  }
});

router.get('/maintenance/:id', async (req, res) => {
  try {
    const request = await get(
      `SELECT mr.*, v.targa, v.modello, v.anno, u.nome, u.cognome, mr.user_id, mr.vehicle_id
       FROM maintenance_requests mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.user_id = u.id
       WHERE mr.id = ?`,
      [req.params.id]
    );

    if (!request) {
      req.flash('error_msg', 'Richiesta non trovata');
      return res.redirect('/admin/maintenance');
    }

    // Controlla se l'autista ha un'assegnazione oggi per questo veicolo
    const today = new Date().toISOString().split('T')[0];
    const todayAssignment = await get(
      `SELECT id FROM assignments 
       WHERE user_id = ? AND vehicle_id = ? AND data = ?`,
      [request.user_id, request.vehicle_id, today]
    );

    res.render('admin/maintenance-detail', {
      title: 'Dettaglio Manutenzione - ROBI Fleet',
      request,
      todayAssignment
    });

  } catch (error) {
    console.error('Errore dettaglio manutenzione:', error);
    req.flash('error_msg', 'Errore nel caricamento della richiesta');
    res.redirect('/admin/maintenance');
  }
});

router.post('/maintenance/:id/update-status', async (req, res) => {
  const { stato, priorita, note_risoluzione } = req.body;

  try {
    // Ottieni info sulla richiesta per aggiornare lo stato del veicolo
    const maintenanceRequest = await get(
      'SELECT vehicle_id FROM maintenance_requests WHERE id = ?',
      [req.params.id]
    );

    let sql = 'UPDATE maintenance_requests SET stato = ?, priorita = ?';
    let params = [stato, priorita];

    if (stato === 'completata') {
      sql += ", note_risoluzione = ?, data_risoluzione = datetime('now', '+1 hour')";
      params.push(note_risoluzione || null);
    } else if (note_risoluzione) {
      sql += ', note_risoluzione = ?';
      params.push(note_risoluzione);
    }

    sql += ' WHERE id = ?';
    params.push(req.params.id);

    await run(sql, params);

    // Aggiorna lo stato del veicolo in base allo stato della manutenzione
    if (maintenanceRequest) {
      if (stato === 'in_lavorazione') {
        // Metto il veicolo in riparazione quando la richiesta viene presa in carico
        await run(
          "UPDATE vehicles SET stato = 'in_riparazione' WHERE id = ?",
          [maintenanceRequest.vehicle_id]
        );
      } else if (stato === 'completata') {
        // Riattivo il veicolo quando la riparazione è completata
        await run(
          "UPDATE vehicles SET stato = 'attivo' WHERE id = ?",
          [maintenanceRequest.vehicle_id]
        );
      }
    }

    await logActivity(
      req.session.user.id,
      req.session.user.username,
      'AGGIORNA_MANUTENZIONE',
      `Richiesta manutenzione ID ${req.params.id} aggiornata a: ${stato}`
    );

    req.flash('success_msg', 'Richiesta aggiornata con successo!');
    res.redirect('/admin/maintenance');

  } catch (error) {
    console.error('Errore aggiornamento manutenzione:', error);
    req.flash('error_msg', 'Errore durante l\'aggiornamento');
    res.redirect(`/admin/maintenance/${req.params.id}`);
  }
});

// ==================== GESTIONE RAPPORTI GIORNALIERI ====================
router.get('/reports', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const driver = req.query.driver || 'all';
    const vehicle = req.query.vehicle || 'all';
    const status = req.query.status || 'all';

    let sql = `SELECT dr.*, u.nome, u.cognome, v.targa, v.modello
               FROM daily_reports dr
               JOIN users u ON dr.user_id = u.id
               JOIN vehicles v ON dr.vehicle_id = v.id
               WHERE 1=1`;
    
    const params = [];

    if (date !== 'all') {
      sql += ' AND dr.data = ?';
      params.push(date);
    }

    if (driver !== 'all') {
      sql += ' AND dr.user_id = ?';
      params.push(driver);
    }

    if (vehicle !== 'all') {
      sql += ' AND dr.vehicle_id = ?';
      params.push(vehicle);
    }

    if (status !== 'all') {
      sql += ' AND dr.stato = ?';
      params.push(status);
    }

    sql += ' ORDER BY dr.data DESC, dr.ora_partenza DESC';

    const reports = await all(sql, params);

    // Lista driver e veicoli per filtri
    const drivers = await all(
      "SELECT id, nome, cognome FROM users WHERE ruolo = 'rider' ORDER BY cognome, nome"
    );

    const vehicles = await all(
      'SELECT id, targa, modello FROM vehicles ORDER BY targa'
    );

    res.render('admin/reports', {
      title: 'Rapporti Giornalieri - ROBI Fleet',
      reports,
      drivers,
      vehicles,
      filters: { date, driver, vehicle, status }
    });

  } catch (error) {
    console.error('Errore lista rapporti:', error);
    req.flash('error_msg', 'Errore nel caricamento dei rapporti');
    res.redirect('/admin/dashboard');
  }
});

router.get('/reports/:id', async (req, res) => {
  try {
    const report = await get(
      `SELECT dr.*, u.nome, u.cognome, u.telefono, v.targa, v.modello, v.anno
       FROM daily_reports dr
       JOIN users u ON dr.user_id = u.id
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.id = ?`,
      [req.params.id]
    );

    if (!report) {
      req.flash('error_msg', 'Rapporto non trovato');
      return res.redirect('/admin/reports');
    }

    // Se il rapporto è una sostituzione, ottieni i dettagli
    let substitution = null;
    if (report.substitution_id) {
      substitution = await get(`
        SELECT s.*,
               v1.targa as veicolo_originale_targa, v1.modello as veicolo_originale_modello,
               v2.targa as veicolo_sostitutivo_targa, v2.modello as veicolo_sostitutivo_modello
        FROM substitutions s
        LEFT JOIN vehicles v1 ON s.vehicle_originale_id = v1.id
        LEFT JOIN vehicles v2 ON s.vehicle_sostituto_id = v2.id
        WHERE s.id = ?
      `, [report.substitution_id]);
    }

    res.render('admin/report-detail', {
      title: 'Dettaglio Rapporto - ROBI Fleet',
      report,
      substitution
    });

  } catch (error) {
    console.error('Errore dettaglio rapporto:', error);
    req.flash('error_msg', 'Errore nel caricamento del rapporto');
    res.redirect('/admin/reports');
  }
});

router.post('/reports/:id/reassign', async (req, res) => {
  const { vehicle_id } = req.body;

  try {
    await run(
      'UPDATE daily_reports SET vehicle_id = ?, ultima_modifica = CURRENT_TIMESTAMP WHERE id = ?',
      [vehicle_id, req.params.id]
    );

    await logActivity(
      req.session.user.id,
      req.session.user.username,
      'RIASSEGNA_VEICOLO',
      `Rapporto ID ${req.params.id} riassegnato a veicolo ${vehicle_id}`
    );

    res.json({ success: true, message: 'Veicolo riassegnato con successo' });

  } catch (error) {
    console.error('Errore riassegnazione:', error);
    res.json({ success: false, message: 'Errore durante la riassegnazione' });
  }
});

router.post('/reports/delete-multiple', async (req, res) => {
  const { report_ids } = req.body;

  try {
    if (!report_ids || report_ids.length === 0) {
      return res.json({ success: false, message: 'Nessun rapporto selezionato' });
    }

    const placeholders = report_ids.map(() => '?').join(',');
    await run(`DELETE FROM daily_reports WHERE id IN (${placeholders})`, report_ids);

    await logActivity(
      req.session.user.id,
      req.session.user.username,
      'ELIMINA_RAPPORTI_MULTIPLI',
      `${report_ids.length} rapporti eliminati`
    );

    res.json({ 
      success: true, 
      message: `${report_ids.length} rapporto/i eliminato/i con successo` 
    });

  } catch (error) {
    console.error('Errore eliminazione multipla:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

router.post('/reports/:id/delete', async (req, res) => {
  try {
    await run('DELETE FROM daily_reports WHERE id = ?', [req.params.id]);

    await logActivity(
      req.session.user.id,
      req.session.user.username,
      'ELIMINA_RAPPORTO',
      `Rapporto ID ${req.params.id} eliminato`
    );

    res.json({ success: true, message: 'Rapporto eliminato con successo' });

  } catch (error) {
    console.error('Errore eliminazione rapporto:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione' });
  }
});

// ==================== LOG ATTIVITÀ ====================
router.get('/activity-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const userId = req.query.user || 'all';
    const action = req.query.action || 'all';

    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];

    if (userId !== 'all') {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    if (action !== 'all') {
      sql += ' AND azione = ?';
      params.push(action);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const logs = await all(sql, params);

    const users = await all(
      'SELECT id, nome, cognome, username FROM users ORDER BY cognome, nome'
    );

    // Ottieni azioni uniche per filtro
    const actions = await all(
      'SELECT DISTINCT azione FROM activity_logs ORDER BY azione'
    );

    res.render('admin/activity-logs', {
      title: 'Log Attività - ROBI Fleet',
      logs,
      users,
      actions,
      filters: { userId, action, limit }
    });

  } catch (error) {
    console.error('Errore log attività:', error);
    req.flash('error_msg', 'Errore nel caricamento dei log');
    res.redirect('/admin/dashboard');
  }
});

// ============ SOSTITUZIONI VEICOLI ============
router.get('/substitutions', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const assignmentIdParam = req.query.assignment_id;
    
    // Ottieni tutte le assegnazioni di oggi
    let assignments = await all(`
      SELECT a.id, a.user_id, a.vehicle_id, a.data,
             u.nome as driver_nome, u.cognome as driver_cognome,
             v.targa, v.modello
      FROM assignments a
      JOIN users u ON a.user_id = u.id
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.data = ?
      ORDER BY u.cognome, u.nome
    `, [today]);
    
    // Se arriva assignment_id nell'URL, verifica se è già nella lista
    // Se non lo è, caricalo separatamente
    if (assignmentIdParam) {
      const existingAssignment = assignments.find(a => a.id == assignmentIdParam);
      if (!existingAssignment) {
        const specificAssignment = await get(`
          SELECT a.id, a.user_id, a.vehicle_id, a.data,
                 u.nome as driver_nome, u.cognome as driver_cognome,
                 v.targa, v.modello
          FROM assignments a
          JOIN users u ON a.user_id = u.id
          JOIN vehicles v ON a.vehicle_id = v.id
          WHERE a.id = ?
        `, [assignmentIdParam]);
        
        if (specificAssignment) {
          // Aggiungi all'inizio della lista
          assignments.unshift(specificAssignment);
        }
      }
    }
    
    // Ottieni veicoli disponibili (non assegnati oggi)
    const assignedVehicleIds = assignments.map(a => a.vehicle_id);
    const availableVehicles = await all(`
      SELECT id, targa, modello 
      FROM vehicles 
      WHERE attivo = 1 
      AND (stato IS NULL OR stato != 'in_riparazione')
      ${assignedVehicleIds.length > 0 ? `AND id NOT IN (${assignedVehicleIds.join(',')})` : ''}
      ORDER BY targa
    `);
    
    // Ottieni storico sostituzioni
    const substitutions = await all(`
      SELECT 
        s.*,
        a.user_id,
        u.nome as driver_nome, u.cognome as driver_cognome,
        v1.targa as originale_targa, v1.modello as originale_modello,
        v2.targa as sostituto_targa, v2.modello as sostituto_modello
      FROM substitutions s
      LEFT JOIN assignments a ON s.assignment_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN vehicles v1 ON s.vehicle_originale_id = v1.id
      LEFT JOIN vehicles v2 ON s.vehicle_sostituto_id = v2.id
      ORDER BY s.data_inizio DESC
      LIMIT 100
    `);

    res.render('admin/substitutions', { 
      title: 'Gestione Sostituzioni Veicoli - ROBI Fleet',
      assignments,
      availableVehicles,
      substitutions,
      preselectedAssignmentId: assignmentIdParam || null
    });
  } catch (error) {
    console.error('Errore caricamento sostituzioni:', error);
    req.flash('error', 'Errore caricamento sostituzioni');
    res.redirect('/admin/dashboard');
  }
});

router.post('/substitutions', async (req, res) => {
  try {
    const { assignment_id, vehicle_sostituto_id, motivo, note } = req.body;

    // Ottieni l'assignment corrente
    const assignment = await get(
      'SELECT user_id, vehicle_id, data FROM assignments WHERE id = ?',
      [assignment_id]
    );

    if (!assignment) {
      return res.json({ success: false, message: 'Assegnazione non trovata' });
    }

    // Usa la data dall'assignment, non dal form
    const data_inizio = assignment.data;

    // Crea la sostituzione
    const result = await run(`
      INSERT INTO substitutions (
        assignment_id, vehicle_originale_id, vehicle_sostituto_id, 
        data_inizio, motivo, note, compilata
      )
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [assignment_id, assignment.vehicle_id, vehicle_sostituto_id, data_inizio, motivo, note || null]);

    // Aggiorna l'assignment con il nuovo veicolo
    await run(
      'UPDATE assignments SET vehicle_id = ? WHERE id = ?',
      [vehicle_sostituto_id, assignment_id]
    );

    await logActivity(
      req.session.user.id,
      req.session.user.username,
      'SOSTITUZIONE_VEICOLO',
      `Veicolo sostituito per assignment ${assignment_id}: da ${assignment.vehicle_id} a ${vehicle_sostituto_id}`
    );

    req.flash('success', 'Sostituzione veicolo registrata con successo');
    res.json({ success: true });
  } catch (error) {
    console.error('Errore creazione sostituzione:', error);
    res.json({ success: false, message: 'Errore durante la registrazione' });
  }
});

router.post('/substitutions/:id/delete', async (req, res) => {
  try {
    await run('DELETE FROM substitutions WHERE id = ?', [req.params.id]);
    req.flash('success', 'Sostituzione eliminata');
    res.json({ success: true });
  } catch (error) {
    console.error('Errore eliminazione sostituzione:', error);
    res.json({ success: false, message: 'Errore eliminazione' });
  }
});

module.exports = router;
