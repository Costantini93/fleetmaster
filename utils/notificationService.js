const { get, all, run } = require('../config/database');
const { sendPushToUser, sendPushToAdmins } = require('./pushService');

// Crea una notifica
async function createNotification(userId, tipo, titolo, messaggio, link = null, priorita = 'media', metadata = null, sendPush = true) {
  try {
    await run(
      `INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, priorita, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, tipo, titolo, messaggio, link, priorita, metadata ? JSON.stringify(metadata) : null]
    );
    
    // Invia push se richiesto e priorità alta/critica
    if (sendPush && (priorita === 'alta' || priorita === 'critica')) {
      await sendPushToUser(userId, {
        title: titolo,
        body: messaggio,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: tipo,
        priority: priorita,
        data: { url: link || '/' }
      });
    }
  } catch (error) {
    console.error('Errore creazione notifica:', error);
  }
}

// Ottieni notifiche non lette per un utente
async function getUnreadNotifications(userId) {
  try {
    return await all(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND letta = 0 
       ORDER BY priorita DESC, data_creazione DESC`,
      [userId]
    );
  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    return [];
  }
}

// Ottieni tutte le notifiche per un utente (ultime 30 giorni)
async function getAllNotifications(userId, limit = 50) {
  try {
    return await all(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND data_creazione >= datetime('now', '-30 days')
       ORDER BY data_creazione DESC 
       LIMIT ?`,
      [userId, limit]
    );
  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    return [];
  }
}

// Conta notifiche non lette
async function countUnreadNotifications(userId) {
  try {
    const result = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND letta = 0',
      [userId]
    );
    return result ? result.count : 0;
  } catch (error) {
    console.error('Errore conteggio notifiche:', error);
    return 0;
  }
}

// Marca notifica come letta
async function markAsRead(notificationId) {
  try {
    await run(
      'UPDATE notifications SET letta = 1, data_lettura = CURRENT_TIMESTAMP WHERE id = ?',
      [notificationId]
    );
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error);
  }
}

// Marca tutte le notifiche di un utente come lette
async function markAllAsRead(userId) {
  try {
    await run(
      'UPDATE notifications SET letta = 1, data_lettura = CURRENT_TIMESTAMP WHERE user_id = ? AND letta = 0',
      [userId]
    );
  } catch (error) {
    console.error('Errore aggiornamento notifiche:', error);
  }
}

// Elimina notifiche vecchie (più di 90 giorni)
async function cleanOldNotifications() {
  try {
    await run(
      "DELETE FROM notifications WHERE data_creazione < datetime('now', '-90 days')"
    );
  } catch (error) {
    console.error('Errore pulizia notifiche:', error);
  }
}

// Notifiche per tutti gli admin
async function notifyAllAdmins(tipo, titolo, messaggio, link = null, priorita = 'media', sendPush = true) {
  try {
    const admins = await all("SELECT id FROM users WHERE ruolo = 'admin' AND attivo = 1");
    for (const admin of admins) {
      await createNotification(admin.id, tipo, titolo, messaggio, link, priorita, null, sendPush);
    }
    
    // Invia push a tutti gli admin per priorità alta/critica
    if (sendPush && (priorita === 'alta' || priorita === 'critica')) {
      await sendPushToAdmins({
        title: titolo,
        body: messaggio,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: tipo,
        priority: priorita,
        data: { url: link || '/' }
      });
    }
  } catch (error) {
    console.error('Errore notifica admin:', error);
  }
}

module.exports = {
  createNotification,
  getUnreadNotifications,
  getAllNotifications,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead,
  cleanOldNotifications,
  notifyAllAdmins
};
