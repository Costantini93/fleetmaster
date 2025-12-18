const { all } = require('../config/database');
const { sendBackupEmail } = require('./emailService');
const cron = require('node-cron');

// Esporta tutte le tabelle del database in JSON
async function exportDatabase() {
  try {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Lista delle tabelle da esportare
    const tables = [
      'users',
      'vehicles', 
      'employees',
      'assignments',
      'daily_reports',
      'vehicle_maintenance',
      'notifications',
      'push_subscriptions',
      'activity_logs'
    ];

    // Esporta ogni tabella
    for (const table of tables) {
      try {
        const rows = await all(`SELECT * FROM ${table}`);
        backup.tables[table] = rows;
        console.log(`✓ Esportata tabella ${table}: ${rows.length} righe`);
      } catch (error) {
        console.error(`✗ Errore esportazione ${table}:`, error.message);
        backup.tables[table] = { error: error.message };
      }
    }

    return backup;
  } catch (error) {
    console.error('Errore export database:', error);
    throw error;
  }
}

// Calcola dimensione backup in MB
function getBackupSize(backup) {
  const json = JSON.stringify(backup);
  const bytes = Buffer.byteLength(json, 'utf8');
  return (bytes / 1024 / 1024).toFixed(2);
}

// Genera statistiche backup
function getBackupStats(backup) {
  const stats = {
    totalTables: 0,
    totalRows: 0,
    tableDetails: []
  };

  for (const [tableName, rows] of Object.entries(backup.tables)) {
    if (Array.isArray(rows)) {
      stats.totalTables++;
      stats.totalRows += rows.length;
      stats.tableDetails.push({
        name: tableName,
        rows: rows.length
      });
    }
  }

  return stats;
}

// Esegue backup e invia email
async function performBackup() {
  try {
    console.log('🔄 Inizio backup database...');
    const startTime = Date.now();

    // Esporta database
    const backup = await exportDatabase();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const size = getBackupSize(backup);
    const stats = getBackupStats(backup);

    console.log(`✓ Backup completato in ${duration}s - Dimensione: ${size}MB`);
    console.log(`  Tabelle: ${stats.totalTables} - Righe totali: ${stats.totalRows}`);

    // Invia email con backup
    await sendBackupEmail(backup, {
      size,
      duration,
      stats
    });

    console.log('✓ Email backup inviata');

    return {
      success: true,
      backup,
      size,
      duration,
      stats
    };
  } catch (error) {
    console.error('✗ Errore backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Pianifica backup settimanale (ogni lunedì alle 3:00 AM)
function scheduleWeeklyBackup() {
  cron.schedule('0 3 * * 1', async () => {
    console.log('📅 Backup settimanale automatico avviato');
    await performBackup();
  });
  console.log('✓ Backup settimanale pianificato: ogni lunedì alle 3:00 AM');
}

// Backup manuale (per test o richiesta admin)
async function manualBackup() {
  console.log('🔧 Backup manuale richiesto');
  return await performBackup();
}

module.exports = {
  exportDatabase,
  performBackup,
  scheduleWeeklyBackup,
  manualBackup,
  getBackupSize,
  getBackupStats
};
