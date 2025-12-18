require('dotenv').config();
const cron = require('node-cron');
const { all, get } = require('../config/database');
const { createNotification, notifyAllAdmins } = require('./notificationService');
const {
  sendDocumentExpiryEmail,
  sendContractExpiryEmail,
  sendMaintenanceKmEmail
} = require('./emailService');

// Ottieni email admin
async function getAdminEmails() {
  const admins = await all("SELECT id, username FROM users WHERE ruolo = 'admin' AND attivo = 1");
  return admins;
}

// Check scadenze documenti veicoli
async function checkDocumentExpiry() {
  console.log('🔍 Controllo scadenze documenti veicoli...');
  
  try {
    const vehicles = await all(`
      SELECT v.*, rc.data_scadenza as contract_expiry
      FROM vehicles v
      LEFT JOIN rental_contracts rc ON v.id = rc.vehicle_id
      WHERE v.attivo = 1
    `);

    const admins = await getAdminEmails();
    
    for (const vehicle of vehicles) {
      // Check contratto noleggio (30, 15, 7 giorni)
      if (vehicle.contract_expiry) {
        const expiryDate = new Date(vehicle.contract_expiry);
        const today = new Date();
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        if ([30, 15, 7, 1].includes(daysLeft)) {
          const message = `Contratto noleggio ${vehicle.targa} in scadenza tra ${daysLeft} giorni`;
          
          // Notifica tutti gli admin
          await notifyAllAdmins(
            'scadenza_contratto',
            'Scadenza Contratto Noleggio',
            message,
            `/admin/vehicles/edit/${vehicle.id}`,
            daysLeft <= 7 ? 'alta' : 'media'
          );

          // Invia email
          for (const admin of admins) {
            await sendContractExpiryEmail(admin.username, vehicle.targa, daysLeft, 0);
          }
        }
      }
    }

    console.log('✅ Check scadenze completato');
  } catch (error) {
    console.error('❌ Errore check scadenze:', error);
  }
}

// Check manutenzioni per KM
async function checkMaintenanceKm() {
  console.log('🔍 Controllo manutenzioni per KM...');
  
  try {
    const schedules = await all(`
      SELECT ms.*, v.targa, v.km_attuali, v.modello
      FROM maintenance_schedules ms
      JOIN vehicles v ON ms.vehicle_id = v.id
      WHERE v.attivo = 1
    `);

    const admins = await getAdminEmails();

    for (const schedule of schedules) {
      const kmRemaining = schedule.prossima_manutenzione_km - schedule.km_attuali;

      // Alert a 200km, 100km, 50km
      if (kmRemaining > 0 && kmRemaining <= 200 && [200, 100, 50].includes(Math.round(kmRemaining / 10) * 10)) {
        const message = `${schedule.targa} necessita manutenzione tra ${kmRemaining} km`;
        
        await notifyAllAdmins(
          'manutenzione_km',
          'Manutenzione Programmata',
          message,
          `/admin/maintenance`,
          kmRemaining <= 50 ? 'alta' : 'media'
        );

        // Email
        for (const admin of admins) {
          await sendMaintenanceKmEmail(
            admin.username,
            schedule.targa,
            schedule.km_attuali,
            schedule.prossima_manutenzione_km,
            kmRemaining
          );
        }
      }
    }

    console.log('✅ Check manutenzioni KM completato');
  } catch (error) {
    console.error('❌ Errore check manutenzioni:', error);
  }
}

// Cron job principale - ogni giorno alle 8:00
function startNotificationScheduler() {
  console.log('📅 Scheduler notifiche avviato');

  // Ogni giorno alle 8:00
  cron.schedule('0 8 * * *', async () => {
    console.log('🕐 Esecuzione check automatici giornalieri...');
    await checkDocumentExpiry();
    await checkMaintenanceKm();
  }, {
    timezone: "Europe/Rome"
  });

  // Ogni 6 ore per check manutenzioni urgenti
  cron.schedule('0 */6 * * *', async () => {
    console.log('🕐 Check manutenzioni urgenti...');
    await checkMaintenanceKm();
  }, {
    timezone: "Europe/Rome"
  });

  console.log('✅ Scheduler configurato: check giornalieri alle 8:00');
}

module.exports = {
  startNotificationScheduler,
  checkDocumentExpiry,
  checkMaintenanceKm
};
