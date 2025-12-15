const { get, all } = require('../config/database');

// Middleware per verificare se l'utente è autenticato
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Devi effettuare il login per accedere a questa pagina');
  res.redirect('/login');
}

// Middleware per verificare se l'utente è admin
async function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.ruolo === 'admin') {
    // Aggiungi conteggio richieste manutenzione non lette
    try {
      const result = await get('SELECT COUNT(*) as count FROM maintenance_requests WHERE letta = 0');
      res.locals.unreadMaintenanceCount = result?.count || 0;
    } catch (error) {
      console.error('Errore conteggio manutenzioni non lette:', error);
      res.locals.unreadMaintenanceCount = 0;
    }
    return next();
  }
  req.flash('error_msg', 'Non hai i permessi per accedere a questa pagina');
  res.redirect('/');
}

// Middleware per verificare se l'utente è rider
function isRider(req, res, next) {
  if (req.session && req.session.user && req.session.user.ruolo === 'rider') {
    return next();
  }
  req.flash('error_msg', 'Non hai i permessi per accedere a questa pagina');
  res.redirect('/');
}

// Middleware per verificare se l'utente deve cambiare password
async function checkFirstLogin(req, res, next) {
  if (req.session && req.session.user) {
    const user = await get('SELECT primo_accesso FROM users WHERE id = ?', [req.session.user.id]);
    if (user && user.primo_accesso === 1) {
      // Se l'utente sta andando alla pagina di cambio password, lascialo passare
      if (req.path === '/change-password' || req.path === '/logout') {
        return next();
      }
      req.flash('error_msg', 'Devi cambiare la password prima di continuare');
      return res.redirect('/change-password');
    }
  }
  next();
}

// Middleware per logging delle attività
async function logActivity(userId, username, azione, dettagli = null) {
  const { run } = require('../config/database');
  
  try {
    await run(
      `INSERT INTO activity_logs (user_id, username, azione, dettagli, ip_address, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+1 hour'))`,
      [userId, username, azione, dettagli, null, null]
    );
  } catch (error) {
    console.error('Errore nel logging:', error);
  }
}

// Middleware per catturare IP e User Agent
function captureRequestInfo(req, res, next) {
  req.clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  req.userAgent = req.headers['user-agent'];
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isRider,
  checkFirstLogin,
  logActivity,
  captureRequestInfo
};
