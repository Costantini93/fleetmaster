const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { get, all, run } = require('../config/database');
const { isAuthenticated, isRider, checkFirstLogin, logActivity } = require('../middleware/auth');

// Configurazione upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/vehicle-photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo immagini JPEG/PNG sono permesse!'));
    }
  }
});

// Applica middleware
router.use(isAuthenticated);
router.use(isRider);
router.use(checkFirstLogin);

// ==================== DASHBOARD RIDER ====================
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Rapporti di oggi dell'utente
    const todayReports = await all(
      `SELECT dr.*, v.targa, v.modello
       FROM daily_reports dr
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.user_id = ? AND dr.data = ?
       ORDER BY dr.data_creazione DESC`,
      [userId, today]
    );

    // Assegnazione veicolo per oggi
    const todayAssignment = await get(
      `SELECT a.*, v.targa, v.modello, v.km_attuali
       FROM assignments a
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.user_id = ? AND a.data = ?`,
      [userId, today]
    );

    // Turni prossimi
    const upcomingShifts = await all(
      `SELECT r.*, v.targa, v.modello
       FROM roster r
       LEFT JOIN assignments a ON r.user_id = a.user_id AND r.data = a.data AND r.turno = a.turno
       LEFT JOIN vehicles v ON a.vehicle_id = v.id
       WHERE r.user_id = ? AND r.data >= ?
       ORDER BY r.data, r.turno
       LIMIT 7`,
      [userId, today]
    );

    // Statistiche personali
    const stats = await get(
      `SELECT 
         COUNT(*) as total_trips,
         SUM(distanza_percorsa) as total_km,
         COUNT(CASE WHEN stato = 'completato' THEN 1 END) as completed_trips
       FROM daily_reports
       WHERE user_id = ?`,
      [userId]
    );

    // Controlla se ha già compilato il rapporto di oggi
    const todayReport = await get(
      'SELECT * FROM daily_reports WHERE user_id = ? AND data = ?',
      [userId, today]
    );

    // Controlla se ha una sostituzione da compilare
    let pendingSubstitution = null;
    if (todayAssignment) {
      pendingSubstitution = await get(`
        SELECT s.*, v1.targa as vecchia_targa, v1.modello as vecchio_modello,
               v2.targa as nuova_targa, v2.modello as nuovo_modello
        FROM substitutions s
        JOIN vehicles v1 ON s.vehicle_originale_id = v1.id
        JOIN vehicles v2 ON s.vehicle_sostituto_id = v2.id
        WHERE s.assignment_id = ? AND s.compilata = 0
      `, [todayAssignment.id]);
    }

    res.render('rider/dashboard', {
      title: 'Dashboard Rider - ROBI Fleet',
      todayReports,
      todayAssignment,
      upcomingShifts,
      todayReport,
      pendingSubstitution,
      stats: stats || { total_trips: 0, total_km: 0, completed_trips: 0 }
    });

  } catch (error) {
    console.error('Errore dashboard rider:', error);
    req.flash('error_msg', 'Errore nel caricamento della dashboard');
    res.redirect('/');
  }
});

// ==================== NUOVO RAPPORTO - PARTENZA ====================
router.get('/reports/new', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Veicolo assegnato oggi
    const assignment = await get(
      `SELECT a.*, v.targa, v.modello, v.km_attuali
       FROM assignments a
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.user_id = ? AND a.data = ?`,
      [userId, today]
    );

    if (!assignment) {
      req.flash('error_msg', 'Non hai un veicolo assegnato per oggi');
      return res.redirect('/rider/dashboard');
    }

    res.render('rider/report-departure', {
      title: 'Rapporto Partenza - ROBI Fleet',
      assignment,
      formData: {}
    });

  } catch (error) {
    console.error('Errore nuovo rapporto:', error);
    req.flash('error_msg', 'Errore nel caricamento del form');
    res.redirect('/rider/dashboard');
  }
});

router.post('/reports/departure', upload.fields([
  { name: 'foto_frontale', maxCount: 1 },
  { name: 'foto_posteriore', maxCount: 1 },
  { name: 'foto_destra', maxCount: 1 },
  { name: 'foto_sinistra', maxCount: 1 },
  { name: 'foto_cruscotto', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      codice_giro,
      km_partenza,
      ora_partenza,
      numero_ditta,
      pacchi_ritirati,
      firma_partenza
    } = req.body;

    const today = new Date().toISOString().split('T')[0];

    // Verifica veicolo assegnato
    const assignment = await get(
      'SELECT * FROM assignments WHERE user_id = ? AND vehicle_id = ? AND data = ?',
      [userId, vehicle_id, today]
    );

    if (!assignment) {
      req.flash('error_msg', 'Veicolo non assegnato a te per oggi');
      return res.redirect('/rider/dashboard');
    }

    // Validazione km
    const vehicle = await get('SELECT km_attuali FROM vehicles WHERE id = ?', [vehicle_id]);
    if (parseInt(km_partenza) < vehicle.km_attuali) {
      req.flash('error_msg', 'I km di partenza non possono essere inferiori ai km attuali del veicolo');
      return res.render('rider/report-departure', {
        title: 'Rapporto di Partenza - ROBI Fleet',
        assignment,
        formData: { codice_giro, km_partenza, ora_partenza, numero_ditta, pacchi_ritirati }
      });
    }

    // Salva foto
    const photos = {
      foto_frontale: req.files['foto_frontale'] ? req.files['foto_frontale'][0].filename : null,
      foto_posteriore: req.files['foto_posteriore'] ? req.files['foto_posteriore'][0].filename : null,
      foto_destra: req.files['foto_destra'] ? req.files['foto_destra'][0].filename : null,
      foto_sinistra: req.files['foto_sinistra'] ? req.files['foto_sinistra'][0].filename : null,
      foto_cruscotto: req.files['foto_cruscotto'] ? req.files['foto_cruscotto'][0].filename : null
    };

    // Formatta ora partenza per il database
    const ora_partenza_db = `${today} ${ora_partenza}:00`;

    // Inserisci rapporto
    await run(
      `INSERT INTO daily_reports 
       (user_id, vehicle_id, data, codice_giro, km_partenza, ora_partenza, numero_ditta, 
        pacchi_ritirati, firma_partenza, 
        foto_frontale, foto_posteriore, foto_destra, foto_sinistra, foto_cruscotto, stato)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, vehicle_id, today, codice_giro, km_partenza, ora_partenza_db, numero_ditta,
        pacchi_ritirati || 0, firma_partenza,
        photos.foto_frontale, photos.foto_posteriore, photos.foto_destra, photos.foto_sinistra, photos.foto_cruscotto,
        'partito'
      ]
    );

    // Log attività
    await logActivity(
      userId,
      req.user.username,
      'RAPPORTO_PARTENZA',
      `Rapporto partenza per veicolo ${vehicle_id}`
    );

    req.flash('success_msg', 'Rapporto di partenza registrato con successo!');
    res.redirect('/rider/dashboard');

  } catch (error) {
    console.error('Errore rapporto partenza:', error);
    req.flash('error_msg', 'Errore durante la registrazione del rapporto');
    res.redirect('/rider/reports/new');
  }
});

// ==================== RITORNO ====================
router.get('/reports/:id/return', async (req, res) => {
  try {
    const userId = req.user.id;

    const report = await get(
      `SELECT dr.*, v.targa, v.modello
       FROM daily_reports dr
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.id = ? AND dr.user_id = ? AND dr.stato = 'partito'`,
      [req.params.id, userId]
    );

    if (!report) {
      req.flash('error_msg', 'Rapporto non trovato o già completato');
      return res.redirect('/rider/dashboard');
    }

    res.render('rider/report-return', {
      title: 'Rapporto Ritorno - ROBI Fleet',
      report
    });

  } catch (error) {
    console.error('Errore form ritorno:', error);
    req.flash('error_msg', 'Errore nel caricamento del form');
    res.redirect('/rider/dashboard');
  }
});

router.post('/reports/:id/return', async (req, res) => {
  try {
    const userId = req.user.id;
    const { km_arrivo, ora_rientro, metodo_rifornimento, importo_rifornimento, numero_tessera_dkv } = req.body;

    // Verifica rapporto
    const report = await get(
      'SELECT * FROM daily_reports WHERE id = ? AND user_id = ? AND stato = \'partito\'',
      [req.params.id, userId]
    );

    if (!report) {
      req.flash('error_msg', 'Rapporto non trovato o già completato');
      return res.redirect('/rider/dashboard');
    }

    // Validazione km
    if (parseInt(km_arrivo) < parseInt(report.km_partenza)) {
      req.flash('error_msg', 'I km di arrivo non possono essere inferiori ai km di partenza');
      return res.redirect(`/rider/reports/${req.params.id}/return`);
    }

    // Validazione ora rientro
    const oraPartenzaDate = new Date(report.ora_partenza);
    const oggi = new Date().toISOString().split('T')[0];
    const oraRientroDate = new Date(`${oggi} ${ora_rientro}:00`);
    
    if (oraRientroDate < oraPartenzaDate) {
      req.flash('error_msg', 'L\'ora di rientro non può essere precedente all\'ora di partenza');
      return res.redirect(`/rider/reports/${req.params.id}/return`);
    }

    // Calcola distanza
    const distanza = parseInt(km_arrivo) - parseInt(report.km_partenza);

    // Formatta ora rientro per il database
    const ora_arrivo = `${oggi} ${ora_rientro}:00`;

    // Aggiorna rapporto
    await run(
      `UPDATE daily_reports 
       SET km_arrivo = ?, ora_arrivo = ?, distanza_percorsa = ?, stato = 'completato',
           metodo_rifornimento = ?, importo_rifornimento = ?, numero_tessera_dkv = ?,
           ultima_modifica = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [km_arrivo, ora_arrivo, distanza, 
       metodo_rifornimento || null, importo_rifornimento || null, numero_tessera_dkv || null, req.params.id]
    );

    // Aggiorna km veicolo
    await run(
      'UPDATE vehicles SET km_attuali = ?, ultima_modifica = CURRENT_TIMESTAMP WHERE id = ?',
      [km_arrivo, report.vehicle_id]
    );

    // Log attività
    await logActivity(
      userId,
      req.user.username,
      'RAPPORTO_RITORNO',
      `Rapporto completato per veicolo ${report.vehicle_id}, distanza: ${distanza} km`
    );

    req.flash('success_msg', 'Rapporto completato con successo!');
    res.redirect('/rider/dashboard');

  } catch (error) {
    console.error('Errore rapporto ritorno:', error);
    req.flash('error_msg', 'Errore durante il completamento del rapporto');
    res.redirect(`/rider/reports/${req.params.id}/return`);
  }
});

// ==================== STORICO RAPPORTI ====================
router.get('/reports/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const reports = await all(
      `SELECT dr.*, v.targa, v.modello
       FROM daily_reports dr
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.user_id = ?
       ORDER BY dr.data DESC, dr.ora_partenza DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Conta totale per paginazione
    const totalResult = await get(
      'SELECT COUNT(*) as total FROM daily_reports WHERE user_id = ?',
      [userId]
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.render('rider/reports-history', {
      title: 'Storico Rapporti - ROBI Fleet',
      reports,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.error('Errore storico rapporti:', error);
    req.flash('error_msg', 'Errore nel caricamento dello storico');
    res.redirect('/rider/dashboard');
  }
});

// ==================== SEGNALAZIONI MANUTENZIONE ====================
router.get('/maintenance/new', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Solo veicolo assegnato oggi
    const assignment = await get(
      `SELECT a.*, v.targa, v.modello
       FROM assignments a
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.user_id = ? AND a.data = ?`,
      [userId, today]
    );

    if (!assignment) {
      req.flash('error_msg', 'Non hai un veicolo assegnato per oggi. Non puoi segnalare problemi.');
      return res.redirect('/rider/dashboard');
    }

    res.render('rider/maintenance-request', {
      title: 'Segnala Problema - ROBI Fleet',
      assignment
    });

  } catch (error) {
    console.error('Errore form manutenzione:', error);
    req.flash('error_msg', 'Errore nel caricamento del form');
    res.redirect('/rider/dashboard');
  }
});

router.post('/maintenance/new', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const { descrizione, priorita } = req.body;

    if (!descrizione) {
      req.flash('error_msg', 'La descrizione è obbligatoria');
      return res.redirect('/rider/maintenance/new');
    }

    // Ottieni veicolo assegnato oggi
    const assignment = await get(
      'SELECT vehicle_id FROM assignments WHERE user_id = ? AND data = ?',
      [userId, today]
    );

    if (!assignment) {
      req.flash('error_msg', 'Non hai un veicolo assegnato per oggi');
      return res.redirect('/rider/dashboard');
    }

    const vehicle_id = assignment.vehicle_id;

    // AI-powered priority detection (semplificato con keyword matching)
    let detectedPriority = priorita || 'media';
    
    const criticalKeywords = ['freni', 'sterzo', 'perdita olio', 'fumo', 'spegnimento'];
    const highKeywords = ['rumore', 'vibrazione', 'luci', 'batteria'];
    
    const descLower = descrizione.toLowerCase();
    
    if (criticalKeywords.some(keyword => descLower.includes(keyword))) {
      detectedPriority = 'critica';
    } else if (highKeywords.some(keyword => descLower.includes(keyword))) {
      detectedPriority = 'alta';
    }

    // Inserisci richiesta (letta = 0 per badge notifiche admin)
    await run(
      `INSERT INTO maintenance_requests (vehicle_id, user_id, descrizione, priorita, stato, letta) 
       VALUES (?, ?, ?, ?, 'in_attesa', 0)`,
      [vehicle_id, userId, descrizione, detectedPriority]
    );

    // Log attività
    await logActivity(
      userId,
      req.user.username,
      'SEGNALAZIONE_MANUTENZIONE',
      `Segnalazione per veicolo ${vehicle_id}, priorità: ${detectedPriority}`
    );

    req.flash('success_msg', 'Segnalazione inviata con successo! Priorità rilevata: ' + detectedPriority.toUpperCase());
    res.redirect('/rider/dashboard');

  } catch (error) {
    console.error('Errore segnalazione manutenzione:', error);
    req.flash('error_msg', 'Errore durante l\'invio della segnalazione');
    res.redirect('/rider/maintenance/new');
  }
});

// ==================== STORICO MANUTENZIONI ====================
router.get('/maintenance/history', async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await all(
      `SELECT mr.*, v.targa, v.modello
       FROM maintenance_requests mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       WHERE mr.user_id = ?
       ORDER BY mr.data_richiesta DESC`,
      [userId]
    );

    res.render('rider/maintenance-history', {
      title: 'Storico Manutenzioni - ROBI Fleet',
      requests
    });

  } catch (error) {
    console.error('Errore storico manutenzioni:', error);
    req.flash('error_msg', 'Errore nel caricamento dello storico');
    res.redirect('/rider/dashboard');
  }
});

// ==================== STORICO RAPPORTI ====================
router.get('/reports-history', async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
      vehicle_id: req.query.vehicle_id || ''
    };

    let sql = `SELECT dr.*, v.targa, v.modello
               FROM daily_reports dr
               JOIN vehicles v ON dr.vehicle_id = v.id
               WHERE dr.user_id = ?`;
    
    const params = [req.user.id];

    if (filters.start_date) {
      sql += ' AND dr.data >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      sql += ' AND dr.data <= ?';
      params.push(filters.end_date);
    }

    if (filters.vehicle_id) {
      sql += ' AND dr.vehicle_id = ?';
      params.push(filters.vehicle_id);
    }

    sql += ' ORDER BY dr.data DESC, dr.ora_partenza DESC LIMIT 100';

    const reports = await all(sql, params);
    const vehicles = await all('SELECT DISTINCT v.* FROM vehicles v JOIN daily_reports dr ON v.id = dr.vehicle_id WHERE dr.user_id = ? ORDER BY v.targa', [req.user.id]);

    res.render('rider/reports-history', { reports, vehicles, filters });
  } catch (error) {
    console.error('Errore storico rapporti:', error);
    req.flash('error_msg', 'Errore caricamento storico');
    res.redirect('/rider/dashboard');
  }
});

// ==================== STORICO MANUTENZIONI ====================
router.get('/maintenance-history', async (req, res) => {
  try {
    const filters = {
      stato: req.query.stato || '',
      priorita: req.query.priorita || ''
    };

    let sql = `SELECT mr.*, v.targa, v.modello
               FROM maintenance_requests mr
               JOIN vehicles v ON mr.vehicle_id = v.id
               WHERE mr.user_id = ?`;
    
    const params = [req.user.id];

    if (filters.stato) {
      sql += ' AND mr.stato = ?';
      params.push(filters.stato);
    }

    if (filters.priorita) {
      sql += ' AND mr.priorita = ?';
      params.push(filters.priorita);
    }

    sql += ' ORDER BY mr.data_richiesta DESC LIMIT 100';

    const requests = await all(sql, params);
    
    const stats = {
      in_attesa: requests.filter(r => r.stato === 'in_attesa').length,
      in_lavorazione: requests.filter(r => r.stato === 'in_lavorazione').length,
      completata: requests.filter(r => r.stato === 'completata').length
    };

    res.render('rider/maintenance-history', { requests, filters, stats });
  } catch (error) {
    console.error('Errore storico manutenzioni:', error);
    req.flash('error_msg', 'Errore caricamento storico');
    res.redirect('/rider/dashboard');
  }
});

// ==================== MODULO SOSTITUZIONE VEICOLO ====================
router.get('/reports/substitution', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Ottieni l'assignment di oggi
    const assignment = await get(
      `SELECT a.*, v.targa, v.modello, v.km_attuali
       FROM assignments a
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.user_id = ? AND a.data = ?`,
      [userId, today]
    );

    if (!assignment) {
      req.flash('error_msg', 'Non hai un veicolo assegnato per oggi');
      return res.redirect('/rider/dashboard');
    }

    // Ottieni la sostituzione da compilare
    const substitution = await get(`
      SELECT s.*, v1.targa as vecchia_targa, v1.modello as vecchio_modello,
             v2.targa as nuova_targa, v2.modello as nuovo_modello
      FROM substitutions s
      JOIN vehicles v1 ON s.vehicle_originale_id = v1.id
      JOIN vehicles v2 ON s.vehicle_sostituto_id = v2.id
      WHERE s.assignment_id = ? AND s.compilata = 0
    `, [assignment.id]);

    if (!substitution) {
      req.flash('error_msg', 'Nessuna sostituzione da compilare');
      return res.redirect('/rider/dashboard');
    }

    res.render('rider/report-substitution', {
      title: 'Modulo Sostituzione Veicolo - ROBI Fleet',
      vehicle: assignment,
      substitution
    });

  } catch (error) {
    console.error('Errore caricamento form sostituzione:', error);
    req.flash('error_msg', 'Errore caricamento modulo');
    res.redirect('/rider/dashboard');
  }
});

router.post('/reports/substitution', upload.fields([
  { name: 'foto_frontale', maxCount: 1 },
  { name: 'foto_posteriore', maxCount: 1 },
  { name: 'foto_destra', maxCount: 1 },
  { name: 'foto_sinistra', maxCount: 1 },
  { name: 'foto_cruscotto', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const { substitution_id, km_partenza, ora_partenza, codice_giro, numero_ditta, firma } = req.body;

    // Verifica sostituzione
    const substitution = await get(
      'SELECT * FROM substitutions WHERE id = ? AND compilata = 0',
      [substitution_id]
    );

    if (!substitution) {
      req.flash('error_msg', 'Sostituzione non valida');
      return res.redirect('/rider/dashboard');
    }

    // Salva foto
    const fotoFrontale = req.files['foto_frontale'] ? req.files['foto_frontale'][0].filename : null;
    const fotoPosterio = req.files['foto_posteriore'] ? req.files['foto_posteriore'][0].filename : null;
    const fotoDestra = req.files['foto_destra'] ? req.files['foto_destra'][0].filename : null;
    const fotoSinistra = req.files['foto_sinistra'] ? req.files['foto_sinistra'][0].filename : null;
    const fotoCruscotto = req.files['foto_cruscotto'] ? req.files['foto_cruscotto'][0].filename : null;

    // Salva firma
    let firmaFilename = null;
    if (firma) {
      const firmaBuffer = Buffer.from(firma.split(',')[1], 'base64');
      firmaFilename = `firma_${Date.now()}_${userId}.png`;
      await fs.promises.writeFile(path.join(__dirname, '../uploads/vehicle-photos', firmaFilename), firmaBuffer);
    }

    // Crea un rapporto di partenza per il nuovo veicolo
    const result = await run(`
      INSERT INTO daily_reports (
        user_id, vehicle_id, data, stato,
        km_partenza, ora_partenza, codice_giro, numero_ditta,
        foto_frontale, foto_posteriore, foto_destra, foto_sinistra, foto_cruscotto,
        firma, substitution_id
      ) VALUES (?, ?, ?, 'partito', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, substitution.vehicle_sostituto_id, today, 
      km_partenza, ora_partenza, codice_giro, numero_ditta || null,
      fotoFrontale, fotoPosterio, fotoDestra, fotoSinistra, fotoCruscotto,
      firmaFilename, substitution_id
    ]);

    // Marca la sostituzione come compilata
    await run('UPDATE substitutions SET compilata = 1 WHERE id = ?', [substitution_id]);

    req.flash('success_msg', 'Sostituzione veicolo completata con successo!');
    res.redirect('/rider/dashboard');

  } catch (error) {
    console.error('Errore salvataggio sostituzione:', error);
    req.flash('error_msg', 'Errore durante il salvataggio');
    res.redirect('/rider/dashboard');
  }
});

module.exports = router;
