const nodemailer = require('nodemailer');

// Configurazione transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true per port 465, false per altri
  auth: {
    user: process.env.SMTP_USER, // es. 'noreply@tuodominio.it'
    pass: process.env.SMTP_PASS  // es. password app Gmail
  }
});

// Verifica configurazione
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️  Email non configurate:', error.message);
  } else {
    console.log('✅ Server email pronto per inviare messaggi');
  }
});

// Template email base
function getEmailTemplate(title, content, buttonText = null, buttonLink = null) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 20px;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚐 ROBI Fleet Management</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          ${content}
          ${buttonText && buttonLink ? `
            <a href="${buttonLink}" class="button">${buttonText}</a>
          ` : ''}
        </div>
        <div class="footer">
          <p>Questa è un'email automatica dal sistema ROBI Fleet Management</p>
          <p>Non rispondere a questa email</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Funzione per inviare email
async function sendEmail(to, subject, html) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️  Email non configurate - skip invio');
      return false;
    }

    const mailOptions = {
      from: `"ROBI Fleet" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email inviata:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Errore invio email:', error);
    return false;
  }
}

// Email scadenza documento
async function sendDocumentExpiryEmail(adminEmail, vehicleTarga, documentType, daysLeft) {
  const title = `⚠️ Scadenza ${documentType} Veicolo`;
  const content = `
    <p>Il veicolo <strong>${vehicleTarga}</strong> ha il documento <strong>${documentType}</strong> in scadenza tra <strong>${daysLeft} giorni</strong>.</p>
    <p>È necessario provvedere al rinnovo quanto prima per evitare problemi legali.</p>
  `;
  
  const html = getEmailTemplate(
    title,
    content,
    'Gestisci Veicolo',
    `${process.env.APP_URL || 'http://localhost:3000'}/admin/vehicles`
  );

  return await sendEmail(adminEmail, `Scadenza ${documentType} - ${vehicleTarga}`, html);
}

// Email contratto in scadenza
async function sendContractExpiryEmail(adminEmail, vehicleTarga, daysLeft, amount) {
  const title = `⚠️ Scadenza Contratto Noleggio`;
  const content = `
    <p>Il contratto di noleggio del veicolo <strong>${vehicleTarga}</strong> scadrà tra <strong>${daysLeft} giorni</strong>.</p>
    <p>Costo mensile attuale: <strong>€${amount}</strong></p>
    <p>Contattare il fornitore per il rinnovo o la restituzione del veicolo.</p>
  `;
  
  const html = getEmailTemplate(
    title,
    content,
    'Visualizza Contratto',
    `${process.env.APP_URL || 'http://localhost:3000'}/admin/vehicles`
  );

  return await sendEmail(adminEmail, `Scadenza Contratto - ${vehicleTarga}`, html);
}

// Email manutenzione urgente
async function sendMaintenanceUrgentEmail(adminEmail, vehicleTarga, driver, problem, priority) {
  const priorityEmoji = priority === 'critica' ? '🚨' : '⚠️';
  const title = `${priorityEmoji} Richiesta Manutenzione ${priority.toUpperCase()}`;
  const content = `
    <p>Il driver <strong>${driver}</strong> ha segnalato un problema <strong>${priority}</strong> sul veicolo <strong>${vehicleTarga}</strong>.</p>
    <p><strong>Descrizione:</strong> ${problem}</p>
    <p>È necessario intervenire ${priority === 'critica' ? 'immediatamente' : 'al più presto'}.</p>
  `;
  
  const html = getEmailTemplate(
    title,
    content,
    'Gestisci Richiesta',
    `${process.env.APP_URL || 'http://localhost:3000'}/admin/maintenance`
  );

  return await sendEmail(adminEmail, `Manutenzione ${priority} - ${vehicleTarga}`, html);
}

// Email manutenzione per KM
async function sendMaintenanceKmEmail(adminEmail, vehicleTarga, kmAttuali, kmManutenzione, kmRemaining) {
  const title = `🔧 Manutenzione Programmata Veicolo`;
  const content = `
    <p>Il veicolo <strong>${vehicleTarga}</strong> sta raggiungendo la soglia per la manutenzione programmata.</p>
    <ul>
      <li><strong>KM Attuali:</strong> ${kmAttuali.toLocaleString()} km</li>
      <li><strong>KM Manutenzione:</strong> ${kmManutenzione.toLocaleString()} km</li>
      <li><strong>KM Rimanenti:</strong> ${kmRemaining} km</li>
    </ul>
    <p>Programmare l'intervento in officina.</p>
  `;
  
  const html = getEmailTemplate(
    title,
    content,
    'Visualizza Scadenzario',
    `${process.env.APP_URL || 'http://localhost:3000'}/admin/maintenance`
  );

  return await sendEmail(adminEmail, `Manutenzione Programmata - ${vehicleTarga}`, html);
}

// Email report settimanale
async function sendWeeklyReportEmail(adminEmail, stats) {
  const title = `📊 Report Settimanale Flotta`;
  const content = `
    <h3>Riepilogo Settimanale</h3>
    <ul>
      <li><strong>Rapporti completati:</strong> ${stats.reportsCompleted}</li>
      <li><strong>KM percorsi totali:</strong> ${stats.totalKm.toLocaleString()} km</li>
      <li><strong>Rifornimenti:</strong> €${stats.totalFuel.toLocaleString()}</li>
      <li><strong>Pacchi consegnati:</strong> ${stats.packagesDelivered.toLocaleString()}</li>
      <li><strong>Manutenzioni aperte:</strong> ${stats.openMaintenance}</li>
    </ul>
    <p>Controlla la dashboard per dettagli completi.</p>
  `;
  
  const html = getEmailTemplate(
    title,
    content,
    'Vai alla Dashboard',
    `${process.env.APP_URL || 'http://localhost:3000'}/admin/dashboard`
  );

  return await sendEmail(adminEmail, `Report Settimanale - ${new Date().toLocaleDateString('it-IT')}`, html);
}

module.exports = {
  sendEmail,
  sendDocumentExpiryEmail,
  sendContractExpiryEmail,
  sendMaintenanceUrgentEmail,
  sendMaintenanceKmEmail,
  sendWeeklyReportEmail,
  getEmailTemplate
};
