const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { get, all, run } = require('../config/database');
const { isAuthenticated, isAdmin, checkFirstLogin, logActivity } = require('../middleware/auth');
const { manualBackup } = require('../utils/backupService');

// Configurazione multer per upload documenti PDF in memoria (per Vercel)
const storage = multer.memoryStorage();

// Filtro per accettare solo PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo file PDF sono permessi'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Max 10MB
  }
});

// Applica middleware a tutte le route admin
router.use(isAuthenticated);
router.use(isAdmin);
router.use(checkFirstLogin);

// ==================== DASHBOARD ====================
router.get('/dashboard', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Statistiche
    const todayReports = await all(
      'SELECT COUNT(*) as count FROM daily_reports WHERE data = ?',
      [today]
    );

    const activeVehicles = await all(
      'SELECT COUNT(*) as count FROM vehicles WHERE attivo = 1'
    );

    const vehiclesInRepair = await all(
      "SELECT COUNT(*) as count FROM vehicles WHERE stato = 'in_riparazione'"
    );

    const pendingMaintenance = await all(
      "SELECT COUNT(*) as count FROM maintenance_requests WHERE stato = 'in_attesa'"
    );

    // Alert scadenze contratti (30 giorni)
    const expiringContracts = await all(
      `SELECT COUNT(*) as count FROM rental_contracts 
       WHERE DATE(data_scadenza) <= DATE('now', '+30 days') 
       AND DATE(data_scadenza) >= DATE('now')`
    );

    // Alert manutenzioni (200km)
    const maintenanceAlerts = await all(
      `SELECT COUNT(*) as count FROM maintenance_schedules ms
       JOIN vehicles v ON ms.vehicle_id = v.id
       WHERE (ms.prossima_manutenzione_km - v.km_attuali) <= 200
       AND (ms.prossima_manutenzione_km - v.km_attuali) >= 0`
    );

    // Rapporti di oggi: unisce assegnazioni e rapporti compilati
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
         dr.numero_tessera_dkv,
         dr.pacchi_consegnati,
         dr.pacchi_resi,
         dr.foto_frontale,
         dr.data_creazione,
         dr.substitution_id,
         CASE WHEN dr.substitution_id IS NOT NULL THEN 1 ELSE 0 END as is_substitution
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

    // Manutenzioni urgenti
    const urgentMaintenance = await all(
      `SELECT mr.*, v.targa, v.modello, u.nome, u.cognome
       FROM maintenance_requests mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.user_id = u.id
       WHERE mr.stato != 'completata'
       ORDER BY 
         CASE mr.priorita 
           WHEN 'critica' THEN 1 
           WHEN 'alta' THEN 2 
           WHEN 'media' THEN 3 
           ELSE 4 
         END,
         mr.data_richiesta DESC
       LIMIT 5`
    );

    // Tabella km finali furgoni per rotta (ordinata alfanumericamente)
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

    // Debug log
    console.log('📊 Dashboard Stats:', {
      todayReports: todayReports[0].count,
      activeVehicles: activeVehicles[0].count,
      vehiclesInRepair: vehiclesInRepair[0].count,
      pendingMaintenance: pendingMaintenance[0].count,
      expiringContracts: expiringContracts[0].count,
      maintenanceAlerts: maintenanceAlerts[0].count
    });

    res.render('admin/dashboard', {
      title: 'Dashboard Admin - ROBI Fleet',
      stats: {
        todayReports: todayReports[0].count,
        activeVehicles: activeVehicles[0].count,
        vehiclesInRepair: vehiclesInRepair[0].count,
        pendingMaintenance: pendingMaintenance[0].count,
        expiringContracts: expiringContracts[0].count,
        maintenanceAlerts: maintenanceAlerts[0].count
      },
      recentReports,
      urgentMaintenance,
      vehicleKmByRoute,
      selectedDate,
      today
    });

  } catch (error) {
    console.error('Errore dashboard:', error);
    req.flash('error_msg', 'Errore nel caricamento della dashboard');
    res.redirect('/');
  }
});

// ==================== GESTIONE DIPENDENTI ====================
router.get('/employees', async (req, res) => {
  try {
    const employees = await all(
      `SELECT id, nome, cognome, username, telefono, ruolo, attivo, data_creazione
       FROM users
       ORDER BY cognome, nome`
    );

    res.render('admin/employees', {
      title: 'Gestione Dipendenti - ROBI Fleet',
      employees
    });

  } catch (error) {
    console.error('Errore lista dipendenti:', error);
    req.flash('error_msg', 'Errore nel caricamento dei dipendenti');
    res.redirect('/admin/dashboard');
  }
});

router.get('/employees/new', (req, res) => {
  res.render('admin/employee-form', {
    title: 'Nuovo Dipendente - ROBI Fleet',
    employee: null,
    action: 'create',
    formData: {}
  });
});

router.post('/employees/new', async (req, res) => {
  const { nome, cognome, email, password, telefono, ruolo } = req.body;
  const username = email; // Email viene usata come username

  try {
    // Validazione
    if (!nome || !cognome || !email || !password || !ruolo) {
      req.flash('error_msg', 'Tutti i campi obbligatori devono essere compilati');
      return res.render('admin/employee-form', {
        title: 'Nuovo Dipendente - ROBI Fleet',
        employee: null,
        action: 'create',
        formData: { nome, cognome, email, telefono, ruolo }
      });
    }

    // Verifica email univoca
    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      req.flash('error_msg', 'Email già esistente nel sistema');
      return res.render('admin/employee-form', {
        title: 'Nuovo Dipendente - ROBI Fleet',
        employee: null,
        action: 'create',
        formData: { nome, cognome, email, telefono, ruolo }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserisci dipendente
    const result = await run(
      `INSERT INTO users (nome, cognome, username, password, telefono, ruolo, attivo, primo_accesso) 
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [nome, cognome, username, hashedPassword, telefono || null, ruolo]
    );

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'CREA_DIPENDENTE',
      `Creato dipendente: ${nome} ${cognome} (${email})`
    );

    req.flash('success_msg', 'Dipendente creato con successo!');
    res.redirect('/admin/employees');

  } catch (error) {
    console.error('Errore creazione dipendente:', error);
    req.flash('error_msg', 'Errore durante la creazione del dipendente');
    return res.render('admin/employee-form', {
      title: 'Nuovo Dipendente - ROBI Fleet',
      employee: null,
      action: 'create',
      formData: { nome, cognome, username, telefono, ruolo }
    });
  }
});

router.get('/employees/edit/:id', async (req, res) => {
  try {
    const employee = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!employee) {
      req.flash('error_msg', 'Dipendente non trovato');
      return res.redirect('/admin/employees');
    }

    res.render('admin/employee-form', {
      title: 'Modifica Dipendente - ROBI Fleet',
      employee,
      action: 'edit'
    });

  } catch (error) {
    console.error('Errore caricamento dipendente:', error);
    req.flash('error_msg', 'Errore nel caricamento del dipendente');
    res.redirect('/admin/employees');
  }
});

router.post('/employees/edit/:id', async (req, res) => {
  const { nome, cognome, username, telefono, ruolo, attivo } = req.body;

  try {
    // Verifica username univoco (escludi utente corrente)
    const existing = await get(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, req.params.id]
    );

    if (existing) {
      req.flash('error_msg', 'Username già esistente');
      return res.redirect(`/admin/employees/edit/${req.params.id}`);
    }

    // Aggiorna dipendente
    await run(
      `UPDATE users 
       SET nome = ?, cognome = ?, username = ?, telefono = ?, ruolo = ?, attivo = ?, 
           ultima_modifica = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nome, cognome, username, telefono || null, ruolo, attivo ? 1 : 0, req.params.id]
    );

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'MODIFICA_DIPENDENTE',
      `Modificato dipendente: ${nome} ${cognome} (${username})`
    );

    req.flash('success_msg', 'Dipendente aggiornato con successo!');
    res.redirect('/admin/employees');

  } catch (error) {
    console.error('Errore aggiornamento dipendente:', error);
    req.flash('error_msg', 'Errore durante l\'aggiornamento del dipendente');
    res.redirect(`/admin/employees/edit/${req.params.id}`);
  }
});

router.post('/employees/toggle/:id', async (req, res) => {
  try {
    const employee = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!employee) {
      return res.json({ success: false, message: 'Dipendente non trovato' });
    }

    const newStatus = employee.attivo === 1 ? 0 : 1;

    await run('UPDATE users SET attivo = ?, ultima_modifica = CURRENT_TIMESTAMP WHERE id = ?', 
      [newStatus, req.params.id]);

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'TOGGLE_DIPENDENTE',
      `${newStatus === 1 ? 'Attivato' : 'Disattivato'} dipendente: ${employee.nome} ${employee.cognome}`
    );

    res.json({ 
      success: true, 
      message: `Dipendente ${newStatus === 1 ? 'attivato' : 'disattivato'} con successo`,
      newStatus 
    });

  } catch (error) {
    console.error('Errore toggle dipendente:', error);
    res.json({ success: false, message: 'Errore durante l\'operazione' });
  }
});

router.post('/employees/reset-password/:id', async (req, res) => {
  try {
    const employee = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!employee) {
      return res.json({ success: false, message: 'Dipendente non trovato' });
    }

    // Genera password temporanea
    const tempPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await run(
      'UPDATE users SET password = ?, primo_accesso = 1, ultima_modifica = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.params.id]
    );

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'RESET_PASSWORD',
      `Reset password per: ${employee.nome} ${employee.cognome}`
    );

    res.json({ 
      success: true, 
      message: 'Password reimpostata con successo',
      tempPassword 
    });

  } catch (error) {
    console.error('Errore reset password:', error);
    res.json({ success: false, message: 'Errore durante il reset della password' });
  }
});

router.post('/employees/delete/:id', async (req, res) => {
  try {
    const employee = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!employee) {
      return res.json({ success: false, message: 'Dipendente non trovato' });
    }

    // Impedisci eliminazione dell'utente corrente
    if (employee.id === req.user.id) {
      return res.json({ success: false, message: 'Non puoi eliminare il tuo account' });
    }

    // Elimina dipendente
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_DIPENDENTE',
      `Eliminato dipendente: ${employee.nome} ${employee.cognome} (${employee.username})`
    );

    res.json({ 
      success: true, 
      message: 'Dipendente eliminato con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione dipendente:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione del dipendente' });
  }
});

// ==================== GESTIONE VEICOLI ====================
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await all(
      `SELECT v.*, 
              (SELECT COUNT(*) FROM rental_contracts WHERE vehicle_id = v.id) as contratti_count,
              (SELECT COUNT(*) FROM maintenance_schedules WHERE vehicle_id = v.id) as manutenzioni_count
       FROM vehicles v
       ORDER BY v.targa`
    );

    res.render('admin/vehicles', {
      title: 'Gestione Veicoli - ROBI Fleet',
      vehicles
    });

  } catch (error) {
    console.error('Errore lista veicoli:', error);
    req.flash('error_msg', 'Errore nel caricamento dei veicoli');
    res.redirect('/admin/dashboard');
  }
});

router.get('/vehicles/new', (req, res) => {
  res.render('admin/vehicle-form', {
    title: 'Nuovo Veicolo - ROBI Fleet',
    vehicle: null,
    action: 'create'
  });
});

router.post('/vehicles/new', upload.fields([
  { name: 'libretto_pdf', maxCount: 1 },
  { name: 'assicurazione_pdf', maxCount: 1 },
  { name: 'contratto_pdf', maxCount: 1 }
]), async (req, res) => {
  const { targa, modello, anno, km_attuali, note_manutenzione } = req.body;

  try {
    // Validazione
    if (!targa || !modello || !anno) {
      req.flash('error_msg', 'Targa, modello e anno sono obbligatori');
      return res.redirect('/admin/vehicles/new');
    }

    // Verifica targa univoca
    const existing = await get('SELECT id FROM vehicles WHERE targa = ?', [targa.toUpperCase()]);
    if (existing) {
      req.flash('error_msg', 'Targa già esistente');
      return res.redirect('/admin/vehicles/new');
    }

    // Converti i file PDF in base64 per salvarli nel database
    const libretto_pdf = req.files?.libretto_pdf 
      ? `data:application/pdf;base64,${req.files.libretto_pdf[0].buffer.toString('base64')}` 
      : null;
    const assicurazione_pdf = req.files?.assicurazione_pdf 
      ? `data:application/pdf;base64,${req.files.assicurazione_pdf[0].buffer.toString('base64')}` 
      : null;
    const contratto_pdf = req.files?.contratto_pdf 
      ? `data:application/pdf;base64,${req.files.contratto_pdf[0].buffer.toString('base64')}` 
      : null;

    // Inserisci veicolo con documenti
    await run(
      `INSERT INTO vehicles (targa, modello, anno, km_attuali, note_manutenzione, attivo, libretto_pdf, assicurazione_pdf, contratto_pdf) 
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [targa.toUpperCase(), modello, anno, km_attuali || 0, note_manutenzione || null, libretto_pdf, assicurazione_pdf, contratto_pdf]
    );

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'CREA_VEICOLO',
      `Creato veicolo: ${targa.toUpperCase()} - ${modello}`
    );

    req.flash('success_msg', 'Veicolo creato con successo!');
    res.redirect('/admin/vehicles');

  } catch (error) {
    console.error('Errore creazione veicolo:', error);
    req.flash('error_msg', 'Errore durante la creazione del veicolo');
    res.redirect('/admin/vehicles/new');
  }
});

router.get('/vehicles/edit/:id', async (req, res) => {
  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

    if (!vehicle) {
      req.flash('error_msg', 'Veicolo non trovato');
      return res.redirect('/admin/vehicles');
    }

    res.render('admin/vehicle-form', {
      title: 'Modifica Veicolo - ROBI Fleet',
      vehicle,
      action: 'edit'
    });

  } catch (error) {
    console.error('Errore caricamento veicolo:', error);
    req.flash('error_msg', 'Errore nel caricamento del veicolo');
    res.redirect('/admin/vehicles');
  }
});

router.post('/vehicles/edit/:id', upload.fields([
  { name: 'libretto_pdf', maxCount: 1 },
  { name: 'assicurazione_pdf', maxCount: 1 },
  { name: 'contratto_pdf', maxCount: 1 }
]), async (req, res) => {
  const { targa, modello, anno, km_attuali, note_manutenzione, attivo } = req.body;

  try {
    // Ottieni il veicolo esistente
    const existingVehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

    if (!existingVehicle) {
      req.flash('error_msg', 'Veicolo non trovato');
      return res.redirect('/admin/vehicles');
    }

    // Verifica targa univoca (escludi veicolo corrente)
    const existing = await get(
      'SELECT id FROM vehicles WHERE targa = ? AND id != ?',
      [targa.toUpperCase(), req.params.id]
    );

    if (existing) {
      req.flash('error_msg', 'Targa già esistente');
      return res.redirect(`/admin/vehicles/edit/${req.params.id}`);
    }

    // Gestisci i file PDF: usa i nuovi se caricati (base64), altrimenti mantieni i vecchi
    const libretto_pdf = req.files?.libretto_pdf 
      ? `data:application/pdf;base64,${req.files.libretto_pdf[0].buffer.toString('base64')}` 
      : existingVehicle.libretto_pdf;
    const assicurazione_pdf = req.files?.assicurazione_pdf 
      ? `data:application/pdf;base64,${req.files.assicurazione_pdf[0].buffer.toString('base64')}` 
      : existingVehicle.assicurazione_pdf;
    const contratto_pdf = req.files?.contratto_pdf 
      ? `data:application/pdf;base64,${req.files.contratto_pdf[0].buffer.toString('base64')}` 
      : existingVehicle.contratto_pdf;

    // Aggiorna veicolo
    await run(
      `UPDATE vehicles 
       SET targa = ?, modello = ?, anno = ?, km_attuali = ?, note_manutenzione = ?, attivo = ?,
           libretto_pdf = ?, assicurazione_pdf = ?, contratto_pdf = ?,
           ultima_modifica = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [targa.toUpperCase(), modello, anno, km_attuali || 0, note_manutenzione || null, attivo ? 1 : 0, 
       libretto_pdf, assicurazione_pdf, contratto_pdf, req.params.id]
    );

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'MODIFICA_VEICOLO',
      `Modificato veicolo: ${targa.toUpperCase()} - ${modello}`
    );

    req.flash('success_msg', 'Veicolo aggiornato con successo!');
    res.redirect('/admin/vehicles');

  } catch (error) {
    console.error('Errore aggiornamento veicolo:', error);
    req.flash('error_msg', 'Errore durante l\'aggiornamento del veicolo');
    res.redirect(`/admin/vehicles/edit/${req.params.id}`);
  }
});

router.post('/vehicles/delete/:id', async (req, res) => {
  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

    if (!vehicle) {
      return res.json({ success: false, message: 'Veicolo non trovato' });
    }

    // I file sono salvati nel database come base64, non serve eliminarli dal filesystem

    await run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'ELIMINA_VEICOLO',
      `Eliminato veicolo: ${vehicle.targa} - ${vehicle.modello}`
    );

    res.json({ success: true, message: 'Veicolo eliminato con successo' });

  } catch (error) {
    console.error('Errore eliminazione veicolo:', error);
    res.json({ success: false, message: 'Errore durante l\'eliminazione del veicolo' });
  }
});

// Route per visualizzare/scaricare i documenti PDF dei veicoli (base64)
router.get('/vehicles/document/:id/:documentType', async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const download = req.query.download === 'true'; // Se true, forza download, altrimenti visualizza inline

    // Validazione tipo documento
    const allowedTypes = ['libretto_pdf', 'assicurazione_pdf', 'contratto_pdf'];
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).send('Tipo di documento non valido');
    }

    // Ottieni il veicolo
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [id]);

    if (!vehicle) {
      return res.status(404).send('Veicolo non trovato');
    }

    const base64Data = vehicle[documentType];

    if (!base64Data) {
      return res.status(404).send('Documento non trovato');
    }

    // Rimuovi il prefisso data:application/pdf;base64,
    const base64Content = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Content, 'base64');

    // Imposta il nome del file
    const fileName = `${documentType}_${vehicle.targa}.pdf`;

    // Invia il PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Solo per download forziamo il Content-Disposition, altrimenti lasciamo il browser decidere
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Errore visualizzazione documento:', error);
    res.status(500).send('Errore durante l\'operazione');
  }
});

// ==================== ROSTER (TURNI) ====================

// Pagina roster
router.get('/roster', async (req, res) => {
  try {
    // Data selezionata dal query param o OGGI
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dateDisplay = dateObj.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Ottieni tutti i driver attivi
    const drivers = await all(`
      SELECT u.*, v.targa as vehicle_targa
      FROM users u
      LEFT JOIN vehicles v ON u.fixed_vehicle_id = v.id
      WHERE u.ruolo = 'rider' AND u.attivo = 1
      ORDER BY u.cognome, u.nome
    `);

    // Ottieni roster per la data selezionata
    const rosterEntries = await all(`
      SELECT user_id FROM roster
      WHERE data = ?
    `, [selectedDate]);

    const selectedDriverIds = rosterEntries.map(r => r.user_id);
    const fixedVehicleCount = drivers.filter(d => selectedDriverIds.includes(d.id) && d.fixed_vehicle_id !== null).length;

    res.render('admin/roster', {
      title: 'Roster - Gestione Turni',
      user: req.user,
      currentPage: 'roster',
      activeDrivers: drivers || [],
      selectedDrivers: selectedDriverIds,
      fixedVehicleCount,
      selectedDate: selectedDate,
      dateDisplay: dateDisplay,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Errore nel caricamento roster:', error);
    res.status(500).send('Errore del server');
  }
});

// Salva roster
router.post('/roster/save', async (req, res) => {
  try {
    const { driverIds, rosterDate } = req.body;

    if (!driverIds || driverIds.length === 0) {
      return res.json({ success: false, message: 'Nessun driver selezionato' });
    }

    if (!rosterDate) {
      return res.json({ success: false, message: 'Data non specificata' });
    }

    // Cancella roster esistente per la data selezionata
    await run('DELETE FROM roster WHERE data = ?', [rosterDate]);

    // Inserisci nuovi driver
    for (const driverId of driverIds) {
      await run('INSERT INTO roster (user_id, data, turno) VALUES (?, ?, ?)', 
        [driverId, rosterDate, 'giorno']);
    }

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'SALVA_ROSTER',
      `Salvato roster per ${new Date(rosterDate + 'T12:00:00').toLocaleDateString('it-IT')}: ${driverIds.length} driver`
    );

    res.json({ 
      success: true, 
      message: `Roster salvato con successo per ${new Date(rosterDate + 'T12:00:00').toLocaleDateString('it-IT')}` 
    });
  } catch (error) {
    console.error('Errore salvataggio roster:', error);
    res.json({ success: false, message: 'Errore durante il salvataggio del roster' });
  }
});

// Reset roster (elimina tutto per una data)
router.post('/roster/reset', async (req, res) => {
  try {
    const { rosterDate } = req.body;

    await run('DELETE FROM roster WHERE data = ?', [rosterDate]);

    // Log attività
    await logActivity(
      req.user.id,
      req.user.username,
      'RESET_ROSTER',
      `Roster resettato per ${new Date(rosterDate + 'T12:00:00').toLocaleDateString('it-IT')}`
    );

    res.json({ 
      success: true,
      message: `Roster resettato per ${new Date(rosterDate + 'T12:00:00').toLocaleDateString('it-IT')}`
    });
  } catch (error) {
    console.error('Errore reset roster:', error);
    res.json({ success: false, message: 'Errore durante il reset del roster' });
  }
});

// ==================== ASSEGNAZIONI AUTOMATICHE ====================

// Assegnazione automatica furgoni per tutte le date con roster
router.post('/assignments/auto-assign', async (req, res) => {
  try {
    console.log('🚀 Avvio assegnazione automatica...');

    // 1. Trova tutte le date con roster salvato (da oggi in poi)
    const dates = await all(`
      SELECT DISTINCT data FROM roster
      WHERE data >= date('now')
      ORDER BY data
    `);

    if (!dates || dates.length === 0) {
      return res.json({ 
        success: false, 
        message: 'Nessun roster trovato. Vai su ROSTER per selezionare i driver in turno.' 
      });
    }

    const results = [];
    let totalAssignments = 0;

    // 2. Per ogni data, crea le assegnazioni
    for (const dateRow of dates) {
      const assignmentDate = dateRow.data;
      const dateFormatted = new Date(assignmentDate + 'T12:00:00').toLocaleDateString('it-IT');

      // Ottieni driver nel roster per questa data
      const drivers = await all(`
        SELECT u.id, u.nome, u.cognome, u.fixed_vehicle_id, r.turno
        FROM roster r
        JOIN users u ON r.user_id = u.id
        WHERE r.data = ?
        AND u.ruolo = 'rider'
        AND u.attivo = 1
        ORDER BY u.fixed_vehicle_id DESC NULLS LAST, u.cognome, u.nome
      `, [assignmentDate]);

      if (!drivers || drivers.length === 0) {
        results.push({
          date: dateFormatted,
          success: false,
          message: 'Nessun driver in roster'
        });
        continue;
      }

      // Raggruppa driver per turno
      const turni = {};
      for (const driver of drivers) {
        if (!turni[driver.turno]) {
          turni[driver.turno] = [];
        }
        turni[driver.turno].push(driver);
      }

      let successCount = 0;

      // 3. Assegna veicoli per ogni turno separatamente
      for (const turno in turni) {
        const driversInTurno = turni[turno];

        // Ottieni veicoli già assegnati per questa data E turno
        const existingAssignments = await all(`
          SELECT vehicle_id FROM assignments WHERE data = ? AND turno = ?
        `, [assignmentDate, turno]);
        
        const assignedVehicleIds = existingAssignments.map(a => a.vehicle_id);

        // Ottieni tutti i veicoli attivi e non in riparazione
        const allVehicles = await all(`
          SELECT id, targa FROM vehicles 
          WHERE attivo = 1 AND (stato IS NULL OR stato != 'in_riparazione')
          ORDER BY targa
        `);

        // Filtra veicoli disponibili per QUESTO turno
        const availableVehicles = allVehicles.filter(v => !assignedVehicleIds.includes(v.id));

        if (availableVehicles.length === 0 && driversInTurno.some(d => !d.fixed_vehicle_id)) {
          console.log(`⚠️ Nessun veicolo disponibile per turno ${turno} il ${dateFormatted}`);
          continue;
        }

        let vehicleIndex = 0;

        // Assegna veicoli ai driver di questo turno
        for (const driver of driversInTurno) {
          let vehicleId;
          let targa;

          // Driver con furgone fisso
          if (driver.fixed_vehicle_id) {
            // Verifica che il veicolo fisso non sia già assegnato in QUESTO turno
            if (assignedVehicleIds.includes(driver.fixed_vehicle_id)) {
              console.log(`⚠️ Veicolo fisso già assegnato per ${driver.nome} ${driver.cognome} (turno ${turno})`);
              continue;
            }
            vehicleId = driver.fixed_vehicle_id;
            const vehicle = allVehicles.find(v => v.id === vehicleId);
            targa = vehicle ? vehicle.targa : 'N/D';
            assignedVehicleIds.push(vehicleId);
          } else {
            // Driver senza furgone fisso: assegna casuale tra disponibili
            if (vehicleIndex >= availableVehicles.length) {
              console.log(`⚠️ Nessun veicolo disponibile per ${driver.nome} ${driver.cognome} (turno ${turno})`);
              continue;
            }
            const vehicle = availableVehicles[vehicleIndex];
            vehicleId = vehicle.id;
            targa = vehicle.targa;
            assignedVehicleIds.push(vehicleId);
            vehicleIndex++;
          }

          // Verifica se esiste già assegnazione per questo driver, data E turno
          const existing = await get(`
            SELECT id FROM assignments 
            WHERE user_id = ? AND data = ? AND turno = ?
          `, [driver.id, assignmentDate, driver.turno]);

          if (existing) {
            console.log(`ℹ️ Assegnazione già esistente per ${driver.nome} ${driver.cognome} (turno ${turno})`);
            continue;
          }

          // Crea l'assegnazione con il turno dal roster
          await run(`
            INSERT INTO assignments (user_id, vehicle_id, data, turno, assegnazione_automatica)
            VALUES (?, ?, ?, ?, 1)
          `, [driver.id, vehicleId, assignmentDate, driver.turno]);

          // Log attività
          await logActivity(
            req.user.id,
            req.user.username,
            'ASSEGNAZIONE_AUTO',
            `${targa} → ${driver.nome} ${driver.cognome} per ${dateFormatted} (turno ${turno})`
          );

          successCount++;
        }
      }

      results.push({
        date: dateFormatted,
        success: true,
        assigned: successCount,
        total: drivers.length
      });
      
      totalAssignments += successCount;
    }

    // Prepara messaggio riepilogo
    const successDates = results.filter(r => r.success);
    const failedDates = results.filter(r => !r.success);

    let message = `✅ Assegnazione completata!\n\n`;
    
    if (successDates.length > 0) {
      message += `📊 Riepilogo:\n`;
      successDates.forEach(r => {
        message += `  • ${r.date}: ${r.assigned}/${r.total} veicoli assegnati\n`;
      });
      message += `\n🎯 Totale: ${totalAssignments} assegnazioni create`;
    }

    if (failedDates.length > 0) {
      message += `\n\n⚠️ Problemi:\n`;
      failedDates.forEach(r => {
        message += `  • ${r.date}: ${r.message}\n`;
      });
    }

    res.json({ 
      success: true, 
      message: message,
      totalAssignments: totalAssignments,
      results: results
    });

  } catch (error) {
    console.error('❌ Errore assegnazione automatica:', error);
    res.json({ 
      success: false, 
      message: 'Errore durante l\'assegnazione automatica: ' + error.message 
    });
  }
});

// ==================== BACKUP MANUALE ====================
router.post('/backup/manual', async (req, res) => {
  try {
    const result = await manualBackup();
    
    if (result.success) {
      await logActivity(req.user.id, 'BACKUP_MANUAL', null, 
        `Backup manuale eseguito (${result.size}MB, ${result.stats.totalRows} righe)`);
      
      res.json({ 
        success: true, 
        message: `Backup completato e inviato via email (${result.size}MB)`,
        stats: result.stats
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Errore durante il backup: ' + result.error 
      });
    }
  } catch (error) {
    console.error('❌ Errore backup manuale:', error);
    res.json({ 
      success: false, 
      message: 'Errore durante il backup: ' + error.message 
    });
  }
});

module.exports = router;
