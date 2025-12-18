const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
  getUnreadNotifications,
  getAllNotifications,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead
} = require('../utils/notificationService');

// Applica autenticazione
router.use(isAuthenticated);

// GET - Conta notifiche non lette
router.get('/count', async (req, res) => {
  try {
    const count = await countUnreadNotifications(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Errore conteggio notifiche:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET - Ottieni notifiche non lette
router.get('/unread', async (req, res) => {
  try {
    const notifications = await getUnreadNotifications(req.user.id);
    res.json({ notifications });
  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET - Ottieni tutte le notifiche
router.get('/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await getAllNotifications(req.user.id, limit);
    res.json({ notifications });
  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST - Marca notifica come letta
router.post('/read/:id', async (req, res) => {
  try {
    await markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST - Marca tutte come lette
router.post('/read-all', async (req, res) => {
  try {
    await markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Errore aggiornamento notifiche:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
