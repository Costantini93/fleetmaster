const nodemailer = require('nodemailer');
const { all } = require('../config/database');

// Verifica se email è configurata
const EMAIL_ENABLED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

// Configurazione transporter solo se abilitato
if (EMAIL_ENABLED) {
  try {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true per port 465, false per altri
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verifica configurazione
    transporter.verify((error, success) => {
      if (error) {
        console.log('⚠️  Email non configurate correttamente:', error.message);
      } else {
        console.log('✅ Server email pronto per inviare messaggi');
      }
    });
  } catch (error) {
    console.log('⚠️  Errore configurazione email:', error.message);
    transporter = null;
  }
} else {
  console.log('⚠️  SMTP non configurato, email disabilitate');
}

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
    if (!transporter) {
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

// Template email per backup database
function getBackupEmailTemplate(backupInfo) {
  const { size, duration, stats } = backupInfo;
  const date = new Date().toLocaleString('it-IT');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { background: #f8f9fa; padding: 20px; margin-top: 20px; border-radius: 5px; }
        .stats { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
        .table-list { list-style: none; padding: 0; }
        .table-item { padding: 8px; border-bottom: 1px solid #dee2e6; }
        .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📊 Backup Database Completato</h2>
        </div>
        <div class="content">
          <p><strong>Data:</strong> ${date}</p>
          
          <div class="stats">
            <h3>📈 Statistiche Backup</h3>
            <ul style="list-style: none; padding: 0;">
              <li>⏱️ <strong>Durata:</strong> ${duration} secondi</li>
              <li>💾 <strong>Dimensione:</strong> ${size} MB</li>
              <li>📁 <strong>Tabelle:</strong> ${stats.totalTables}</li>
              <li>📝 <strong>Righe totali:</strong> ${stats.totalRows.toLocaleString('it-IT')}</li>
            </ul>
          </div>

          <div class="stats">
            <h3>📋 Dettaglio Tabelle</h3>
            <ul class="table-list">
              ${stats.tableDetails.map(t => `
                <li class="table-item">
                  <strong>${t.name}:</strong> ${t.rows.toLocaleString('it-IT')} righe
                </li>
              `).join('')}
            </ul>
          </div>

          <p style="margin-top: 20px;">
            <strong>ℹ️ Nota:</strong> Il file JSON completo del backup è allegato a questa email.
            Conservalo in un luogo sicuro per eventuali ripristini futuri.
          </p>
        </div>
        <div class="footer">
          <p>Questo è un backup automatico generato dal sistema ROBI Fleet Management</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Invia email con backup allegato
async function sendBackupEmail(backup, backupInfo) {
  if (!transporter) {
    console.log('⚠️  Email non configurate - skip backup email');
    return;
  }

  const admins = await all("SELECT email FROM users WHERE ruolo = 'admin' AND attivo = 1");
  const adminEmails = admins.map(a => a.email).filter(Boolean);

  if (adminEmails.length === 0) {
    console.log('Nessun admin con email configurata per backup');
    return;
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `backup-database-${date}.json`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: adminEmails.join(','),
    subject: `📊 Backup Database - ${date}`,
    html: getBackupEmailTemplate(backupInfo),
    attachments: [
      {
        filename: filename,
        content: JSON.stringify(backup, null, 2),
        contentType: 'application/json'
      }
    ]
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = {
  sendEmail,
  sendDocumentExpiryEmail,
  sendContractExpiryEmail,
  sendMaintenanceUrgentEmail,
  sendMaintenanceKmEmail,
  sendWeeklyReportEmail,
  sendBackupEmail,
  getEmailTemplate
};
