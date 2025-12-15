const express = require('express');
const router = express.Router();
const { get, all } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// API per ottenere veicoli disponibili
router.get('/vehicles/available', isAuthenticated, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const turno = req.query.turno;

    let sql = `SELECT v.* FROM vehicles v 
               WHERE v.attivo = 1`;

    if (date && turno) {
      sql += ` AND v.id NOT IN (
                SELECT vehicle_id FROM assignments 
                WHERE data = ? AND turno = ?
              )`;
    }

    const vehicles = turno 
      ? await all(sql, [date, turno])
      : await all(sql);

    res.json({ success: true, vehicles });

  } catch (error) {
    console.error('Errore API veicoli disponibili:', error);
    res.status(500).json({ success: false, message: 'Errore server' });
  }
});

// API per ottenere rider disponibili
router.get('/riders/available', isAuthenticated, async (req, res) => {
  try {
    const riders = await all(
      `SELECT id, nome, cognome, username FROM users 
       WHERE ruolo = 'rider' AND attivo = 1 
       ORDER BY cognome, nome`
    );

    res.json({ success: true, riders });

  } catch (error) {
    console.error('Errore API rider disponibili:', error);
    res.status(500).json({ success: false, message: 'Errore server' });
  }
});

// API per ottenere statistiche dashboard
router.get('/stats/dashboard', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.ruolo !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorizzato' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Query statistiche
    const todayReports = await get(
      'SELECT COUNT(*) as count FROM daily_reports WHERE data = ?',
      [today]
    );

    const activeVehicles = await get(
      'SELECT COUNT(*) as count FROM vehicles WHERE attivo = 1'
    );

    const pendingMaintenance = await get(
      'SELECT COUNT(*) as count FROM maintenance_requests WHERE stato = "in_attesa"'
    );

    const expiringContracts = await get(
      `SELECT COUNT(*) as count FROM rental_contracts 
       WHERE DATE(data_scadenza) <= DATE('now', '+30 days') 
       AND DATE(data_scadenza) >= DATE('now')`
    );

    res.json({
      success: true,
      stats: {
        todayReports: todayReports.count,
        activeVehicles: activeVehicles.count,
        pendingMaintenance: pendingMaintenance.count,
        expiringContracts: expiringContracts.count
      }
    });

  } catch (error) {
    console.error('Errore API stats:', error);
    res.status(500).json({ success: false, message: 'Errore server' });
  }
});

// API per esportare rapporti (CSV)
router.get('/reports/export', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.ruolo !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorizzato' });
    }

    const { start_date, end_date } = req.query;

    let sql = `SELECT 
                 dr.data,
                 u.nome || ' ' || u.cognome as autista,
                 v.targa,
                 v.modello,
                 dr.codice_giro,
                 dr.km_partenza,
                 dr.km_arrivo,
                 dr.distanza_percorsa,
                 dr.ora_partenza,
                 dr.ora_arrivo,
                 dr.tipo_carburante,
                 dr.pacchi_ritirati,
                 dr.pacchi_consegnati,
                 dr.stato
               FROM daily_reports dr
               JOIN users u ON dr.user_id = u.id
               JOIN vehicles v ON dr.vehicle_id = v.id
               WHERE 1=1`;

    const params = [];

    if (start_date) {
      sql += ' AND dr.data >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND dr.data <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY dr.data DESC, dr.ora_partenza DESC';

    const reports = await all(sql, params);

    // Genera CSV
    let csv = 'Data,Autista,Targa,Modello,Codice Giro,Km Partenza,Km Arrivo,Distanza,Ora Partenza,Ora Arrivo,Carburante,Pacchi Ritirati,Pacchi Consegnati,Stato\n';

    reports.forEach(r => {
      csv += `${r.data},${r.autista},${r.targa},${r.modello},${r.codice_giro || ''},${r.km_partenza},${r.km_arrivo || ''},${r.distanza_percorsa || ''},${r.ora_partenza || ''},${r.ora_arrivo || ''},${r.tipo_carburante || ''},${r.pacchi_ritirati},${r.pacchi_consegnati},${r.stato}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=rapporti-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Errore export rapporti:', error);
    res.status(500).json({ success: false, message: 'Errore durante l\'export' });
  }
});

// API per verificare disponibilità username
router.post('/check-username', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.ruolo !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorizzato' });
    }

    const { username, exclude_id } = req.body;

    let sql = 'SELECT id FROM users WHERE username = ?';
    const params = [username];

    if (exclude_id) {
      sql += ' AND id != ?';
      params.push(exclude_id);
    }

    const existing = await get(sql, params);

    res.json({ 
      success: true, 
      available: !existing 
    });

  } catch (error) {
    console.error('Errore check username:', error);
    res.status(500).json({ success: false, message: 'Errore server' });
  }
});

// API per verificare disponibilità targa
router.post('/check-plate', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.ruolo !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorizzato' });
    }

    const { targa, exclude_id } = req.body;

    let sql = 'SELECT id FROM vehicles WHERE targa = ?';
    const params = [targa.toUpperCase()];

    if (exclude_id) {
      sql += ' AND id != ?';
      params.push(exclude_id);
    }

    const existing = await get(sql, params);

    res.json({ 
      success: true, 
      available: !existing 
    });

  } catch (error) {
    console.error('Errore check targa:', error);
    res.status(500).json({ success: false, message: 'Errore server' });
  }
});

module.exports = router;
