const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { get, run } = require('../config/database');
const { isAuthenticated, logActivity } = require('../middleware/auth');

// Pagina login
router.get('/login', (req, res) => {
  if (req.cookies.token) {
    return res.redirect('/');
  }
  res.render('auth/login', { title: 'Login - ROBI Fleet' });
});

// Processo login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      req.flash('error_msg', 'Username o password non corretti');
      return res.redirect('/login');
    }

    if (user.attivo === 0) {
      req.flash('error_msg', 'Il tuo account è stato disattivato. Contatta l\'amministratore.');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.flash('error_msg', 'Username o password non corretti');
      return res.redirect('/login');
    }

    // Crea JWT token
    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        cognome: user.cognome,
        username: user.username,
        ruolo: user.ruolo,
        primo_accesso: user.primo_accesso
      },
      process.env.SESSION_SECRET || 'robi-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Imposta cookie con JWT
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 86400000 // 24 ore
    });

    // Log attività
    await logActivity(user.id, user.username, 'LOGIN', 'Accesso al sistema');

    // Reindirizza in base al ruolo e primo accesso
    if (user.primo_accesso === 1) {
      req.flash('error_msg', 'Devi cambiare la password prima di continuare');
      return res.redirect('/change-password');
    }

    if (user.ruolo === 'admin') {
      req.flash('success_msg', `Benvenuto ${user.nome}!`);
      return res.redirect('/admin/dashboard');
    } else {
      req.flash('success_msg', `Benvenuto ${user.nome}!`);
      return res.redirect('/rider/dashboard');
    }

  } catch (error) {
    console.error('Errore login:', error);
    req.flash('error_msg', 'Errore durante il login. Riprova.');
    res.redirect('/login');
  }
});

// Pagina cambio password
router.get('/change-password', isAuthenticated, (req, res) => {
  res.render('auth/change-password', { title: 'Cambia Password - ROBI Fleet' });
});

// Processo cambio password
router.post('/change-password', isAuthenticated, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.user.id;

  try {
    // Validazione
    if (new_password !== confirm_password) {
      req.flash('error_msg', 'Le nuove password non coincidono');
      return res.redirect('/change-password');
    }

    if (new_password.length < 6) {
      req.flash('error_msg', 'La password deve essere di almeno 6 caratteri');
      return res.redirect('/change-password');
    }

    // Verifica password corrente
    const user = await get('SELECT password FROM users WHERE id = ?', [userId]);
    const isMatch = await bcrypt.compare(current_password, user.password);

    if (!isMatch) {
      req.flash('error_msg', 'La password corrente non è corretta');
      return res.redirect('/change-password');
    }

    // Aggiorna password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await run(
      'UPDATE users SET password = ?, primo_accesso = 0, ultima_modifica = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );

    // Rigenera JWT token con primo_accesso aggiornato
    const token = jwt.sign(
      {
        id: req.user.id,
        nome: req.user.nome,
        cognome: req.user.cognome,
        username: req.user.username,
        ruolo: req.user.ruolo,
        primo_accesso: 0
      },
      process.env.SESSION_SECRET || 'robi-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 86400000 // 24 ore
    });

    // Log attività
    await logActivity(userId, req.user.username, 'CAMBIO_PASSWORD', 'Password modificata con successo');

    req.flash('success_msg', 'Password cambiata con successo!');
    
    // Reindirizza in base al ruolo
    if (req.user.ruolo === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/rider/dashboard');
    }

  } catch (error) {
    console.error('Errore cambio password:', error);
    req.flash('error_msg', 'Errore durante il cambio password. Riprova.');
    res.redirect('/change-password');
  }
});

// Logout
router.get('/logout', isAuthenticated, async (req, res) => {
  const username = req.user.username;
  const userId = req.user.id;

  // Log attività
  await logActivity(userId, username, 'LOGOUT', 'Disconnessione dal sistema');

  // Rimuovi cookie JWT
  res.clearCookie('token');
  res.redirect('/login');
});

// Root redirect
router.get('/', (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  if (req.user.primo_accesso === 1) {
    return res.redirect('/change-password');
  }

  if (req.user.ruolo === 'admin') {
    return res.redirect('/admin/dashboard');
  } else {
    return res.redirect('/rider/dashboard');
  }
});

module.exports = router;
