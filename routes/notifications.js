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
const {
  saveSubscription,
  removeSubscription,
  getPublicKey
} = require('../utils/pushService');

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

// ==================== PUSH NOTIFICATIONS ====================

// GET - Ottieni VAPID public key
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Errore recupero public key:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST - Salva push subscription
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    const result = await saveSubscription(req.user.id, subscription);
    res.json(result);
  } catch (error) {
    console.error('Errore salvataggio subscription:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST - Rimuovi push subscription
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    const result = await removeSubscription(req.user.id, endpoint);
    res.json(result);
  } catch (error) {
    console.error('Errore rimozione subscription:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
