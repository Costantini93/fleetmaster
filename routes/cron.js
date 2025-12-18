const express = require('express');
const router = express.Router();
const { checkDocumentExpiry, checkMaintenanceKm } = require('../utils/notificationScheduler');
const { performBackup } = require('../utils/backupService');

// Verifica che la richiesta venga da Vercel Cron (sicurezza)
function verifyCronRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // In sviluppo locale permetti senza auth
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // In produzione verifica token Vercel
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return next();
  }
  
  console.error('❌ Richiesta cron non autorizzata');
  return res.status(401).json({ error: 'Unauthorized' });
}

// Endpoint per check giornalieri (documenti e manutenzioni)
router.get('/daily-checks', verifyCronRequest, async (req, res) => {
  try {
    console.log('🔔 Cron job: Daily checks avviato');
    
    // Esegui controlli in parallelo
    await Promise.all([
      checkDocumentExpiry(),
      checkMaintenanceKm()
    ]);
    
    console.log('✅ Daily checks completati');
    res.json({ success: true, message: 'Daily checks completed' });
  } catch (error) {
    console.error('❌ Errore daily checks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint per backup settimanale
router.get('/weekly-backup', verifyCronRequest, async (req, res) => {
  try {
    console.log('📊 Cron job: Weekly backup avviato');
    
    const result = await performBackup();
    
    if (result.success) {
      console.log(`✅ Backup completato: ${result.size}MB`);
      res.json({ 
        success: true, 
        message: 'Backup completed',
        stats: result.stats 
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Errore weekly backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint di test (solo in dev)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test-daily', async (req, res) => {
    try {
      await checkDocumentExpiry();
      res.json({ success: true, message: 'Test daily check completed' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/test-backup', async (req, res) => {
    try {
      const result = await performBackup();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

module.exports = router;
