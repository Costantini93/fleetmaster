require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminExtendedRoutes = require('./routes/admin-extended');
const adminMaintenanceRoutes = require('./routes/admin-maintenance');
const riderRoutes = require('./routes/rider');
const apiRoutes = require('./routes/api');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'robi-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 ore
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.RENDER === 'true'
  }
}));

app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
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
app.listen(PORT, () => {
  console.log(`🚀 Server Fleet Master avviato su porta ${PORT}`);
  console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});
