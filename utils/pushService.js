const webpush = require('web-push');
const { all, run, get } = require('../config/database');

// Configurazione VAPID keys (Public e Private)
// Per generarle: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.SMTP_USER || 'noreply@example.com'),
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✅ Web Push configurato');
} else {
  console.log('⚠️  VAPID keys non configurate - Push notifications disabilitate');
}

// Salva subscription nel database
async function saveSubscription(userId, subscription) {
  try {
    const { endpoint, keys } = subscription;
    
    // Verifica se esiste già
    const existing = await get(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );
    
    if (existing) {
      return { success: true, message: 'Subscription già esistente' };
    }
    
    await run(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, attivo) 
       VALUES (?, ?, ?, ?, 1)`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );
    
    console.log(`✅ Push subscription salvata per user ${userId}`);
    return { success: true, message: 'Subscription salvata' };
  } catch (error) {
    console.error('Errore salvataggio subscription:', error);
    return { success: false, message: 'Errore salvataggio' };
  }
}

// Rimuovi subscription
async function removeSubscription(userId, endpoint) {
  try {
    await run(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );
    return { success: true };
  } catch (error) {
    console.error('Errore rimozione subscription:', error);
    return { success: false };
  }
}

// Invia notifica push a un utente
async function sendPushToUser(userId, payload) {
  try {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.log('⚠️  Push notifications non configurate');
      return { success: false, message: 'Push non configurate' };
    }
    
    const subscriptions = await all(
      'SELECT * FROM push_subscriptions WHERE user_id = ? AND attivo = 1',
      [userId]
    );
    
    if (subscriptions.length === 0) {
      return { success: false, message: 'Nessuna subscription attiva' };
    }
    
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        
        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          // Se la subscription è invalida, disattivala
          if (error.statusCode === 410 || error.statusCode === 404) {
            await run('UPDATE push_subscriptions SET attivo = 0 WHERE id = ?', [sub.id]);
          }
          throw error;
        }
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Push inviati: ${successful}/${subscriptions.length}`);
    
    return { 
      success: true, 
      sent: successful, 
      total: subscriptions.length 
    };
  } catch (error) {
    console.error('Errore invio push:', error);
    return { success: false, message: error.message };
  }
}

// Invia notifica push a tutti gli admin
async function sendPushToAdmins(payload) {
  try {
    const admins = await all("SELECT id FROM users WHERE ruolo = 'admin' AND attivo = 1");
    
    const results = await Promise.allSettled(
      admins.map(admin => sendPushToUser(admin.id, payload))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    return { success: true, sent: successful, total: admins.length };
  } catch (error) {
    console.error('Errore invio push admin:', error);
    return { success: false, message: error.message };
  }
}

// Ottieni la public key per il frontend
function getPublicKey() {
  return vapidKeys.publicKey;
}

module.exports = {
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  sendPushToAdmins,
  getPublicKey
};
