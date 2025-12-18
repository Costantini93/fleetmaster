require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminExtendedRoutes = require('./routes/admin-extended');
const adminMaintenanceRoutes = require('./routes/admin-maintenance');
const riderRoutes = require('./routes/rider');
const apiRoutes = require('./routes/api');
const notificationsRoutes = require('./routes/notifications');
const cronRoutes = require('./routes/cron');

// Middleware - aumenta limiti per foto da mobile
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());

// Lightweight flash messages without sessions
app.use((req, res, next) => {
  function readFlash() {
    try {
      return req.cookies.__flash ? JSON.parse(req.cookies.__flash) : {};
    } catch {
      return {};
    }
  }

  const stored = readFlash();
  res.locals.success_msg = stored.success_msg || [];
  res.locals.error_msg = stored.error_msg || [];
  res.locals.error = stored.error || [];

  req.flash = (type, msg) => {
    const current = readFlash();
    if (!current[type]) current[type] = [];
    current[type].push(msg);
    res.cookie('__flash', JSON.stringify(current), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 300000 // 5 minuti
    });
  };

  // Clear flash after it has been read for this request
  if (req.cookies.__flash) {
    res.clearCookie('__flash');
  }
  next();
});

// JWT middleware to decode user from token
const jwt = require('jsonwebtoken');
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.SESSION_SECRET || 'robi-secret-key-change-in-production');
    } catch (error) {
      req.user = null;
    }
  }
  next();
});

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper per rendering con layout
app.use((req, res, next) => {
  const originalRender = res.render;
  res.render = function(view, options = {}) {
    if (view.includes('auth/') || view === 'error') {
      return originalRender.call(this, view, options);
    }
    // Set default values
    options.currentPage = options.currentPage || '';
    options.pageTitle = options.pageTitle || options.title || 'Fleet Master';
    options.body = '';
    originalRender.call(this, view, options, (err, html) => {
      if (err) return next(err);
      options.body = html;
      originalRender.call(this, 'layout', options);
    });
  };
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminExtendedRoutes);
app.use('/admin', adminMaintenanceRoutes);
app.use('/rider', riderRoutes);
app.use('/api', apiRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/api/cron', cronRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Pagina Non Trovata',
    message: 'La pagina richiesta non esiste.',
    statusCode: 404
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    title: 'Errore Server',
    message: process.env.NODE_ENV === 'production' 
      ? 'Si è verificato un errore. Riprova più tardi.' 
      : err.message,
    statusCode: err.status || 500
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server Fleet Master avviato su ${HOST}:${PORT}`);
  console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`⏰ Cron jobs gestiti da Vercel (produzione) o test manuali (dev)`);
});
