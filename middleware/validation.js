const { body, param, validationResult } = require('express-validator');

// Helper per gestire errori di validazione
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    req.flash('error_msg', firstError.msg);
    return res.redirect('back');
  }
  next();
};

// Validazione creazione dipendente
const validateEmployee = [
  body('nome')
    .trim()
    .notEmpty().withMessage('Il nome è obbligatorio')
    .isLength({ min: 2, max: 50 }).withMessage('Nome tra 2 e 50 caratteri')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('Nome contiene caratteri non validi'),
  
  body('cognome')
    .trim()
    .notEmpty().withMessage('Il cognome è obbligatorio')
    .isLength({ min: 2, max: 50 }).withMessage('Cognome tra 2 e 50 caratteri')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('Cognome contiene caratteri non validi'),
  
  body('username')
    .trim()
    .notEmpty().withMessage('Lo username è obbligatorio')
    .isLength({ min: 3, max: 30 }).withMessage('Username tra 3 e 30 caratteri')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username può contenere solo lettere, numeri, . _ -'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Email non valida')
    .normalizeEmail(),
  
  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\s()-]{8,20}$/).withMessage('Telefono non valido'),
  
  body('ruolo')
    .notEmpty().withMessage('Il ruolo è obbligatorio')
    .isIn(['admin', 'rider']).withMessage('Ruolo non valido'),
  
  body('password')
    .if(body('password').exists())
    .trim()
    .isLength({ min: 6 }).withMessage('Password minimo 6 caratteri'),
  
  handleValidationErrors
];

// Validazione creazione veicolo
const validateVehicle = [
  body('targa')
    .trim()
    .notEmpty().withMessage('La targa è obbligatoria')
    .isLength({ min: 5, max: 10 }).withMessage('Targa tra 5 e 10 caratteri')
    .matches(/^[A-Z0-9\s-]+$/).withMessage('Targa formato non valido')
    .customSanitizer(value => value.toUpperCase()),
  
  body('modello')
    .trim()
    .notEmpty().withMessage('Il modello è obbligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('Modello tra 2 e 100 caratteri'),
  
  body('anno')
    .notEmpty().withMessage('L\'anno è obbligatorio')
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 }).withMessage('Anno non valido'),
  
  body('km_attuali')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 999999 }).withMessage('KM non validi'),
  
  body('note_manutenzione')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Note max 1000 caratteri'),
  
  handleValidationErrors
];

// Validazione login
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username obbligatorio'),
  
  body('password')
    .notEmpty().withMessage('Password obbligatoria'),
  
  handleValidationErrors
];

// Validazione cambio password
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Password attuale obbligatoria'),
  
  body('newPassword')
    .trim()
    .isLength({ min: 6 }).withMessage('Nuova password minimo 6 caratteri')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password deve contenere lettere e numeri'),
  
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Le password non corrispondono'),
  
  handleValidationErrors
];

// Validazione ID parametro
const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID non valido'),
  
  handleValidationErrors
];

module.exports = {
  validateEmployee,
  validateVehicle,
  validateLogin,
  validatePasswordChange,
  validateId,
  handleValidationErrors
};
