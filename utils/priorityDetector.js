// AI-powered priority detection for maintenance requests
// Analizza la descrizione del problema e suggerisce la priorità

const KEYWORDS = {
  critica: [
    // Sicurezza critica - Freni e sterzo
    'freni', 'freno', 'frenata', 'sterzo', 'sterzata', 'ruota', 'pneumatico', 'gomma',
    'motore', 'acceleratore', 'pedale', 'trasmissione', 'cambio',
    'cinture', 'cintura', 'airbag',

    // Emergenze - Non parte/bloccato
    'non parte', 'non si avvia', 'fermo', 'ferma', 'bloccato', 'bloccata',
    'perde olio', 'perdita olio', 'fumo', 'fumi', 'surriscaldamento',
    'rumore forte', 'rumore metallico', 'cigola', 'stridore',

    // Rischi reali
    'pericoloso', 'pericolo', 'rischio', 'urgente', 'grave', 'serio',
    'incidente', 'rottura grave', 'danneggiato gravemente',
    
    // Funzionamento critico
    'freni non funzionano', 'sterzo non funziona', 'motore guasto',
    'guasto grave', 'avaria', 'anomalia grave',
    'allarme', 'spia rossa', 'errore critico'
  ],

  alta: [
    // Problemi importanti ma non critici
    'luce', 'lampada', 'fanale', 'faro', 'abbagliante',
    'tergicristalli', 'tergicristallo', 'spazzola',
    'batteria', 'alternatore', 'elettrica', 'elettrico',
    'perdita', 'liquido', 'coolant', 'antigelo',
    'rumoroso', 'rumore', 'vibra', 'vibrazione',
    'difficoltà', 'fatica', 'lento', 'lenta'
  ],

  media: [
    // Manutenzione ordinaria
    'specchietto', 'retrovisore',
    'finestrino', 'portiera', 'sportello',
    'radio', 'navigatore', 'bluetooth',
    'da controllare', 'da verificare', 'strano',
    'consumo', 'consuma', 'check',
    'filtro', 'olio', 'tagliando'
  ],

  bassa: [
    // Estetica e comfort
    'graffio', 'graffi', 'ammaccatura', 'botta', 'bozzo',
    'macchia', 'sporco', 'carrozzeria', 'vernice',
    'climatizzatore', 'aria condizionata', 'riscaldamento',
    'posacenere', 'tappetino', 'coprisedile',
    'sedile scomodo', 'appogiatesta',
    'puzza', 'odore', 'profumo',
    'pulire', 'pulizia', 'lavaggio', 'igienizzare',
    'consiglio', 'suggerimento', 'quando possibile'
  ]
};

/**
 * Analizza il testo e suggerisce la priorità
 * @param {string} description - Descrizione del problema
 * @returns {string} - 'critica', 'alta', 'media', o 'bassa'
 */
function detectPriority(description) {
  if (!description || typeof description !== 'string') {
    return 'media'; // Default
  }

  const text = description.toLowerCase();

  // Score system
  let scores = {
    critica: 0,
    alta: 0,
    media: 0,
    bassa: 0
  };

  // Check keywords
  for (const [priority, keywords] of Object.entries(KEYWORDS)) {
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        scores[priority] += 1;
      }
    });
  }

  // Parole negative aumentano priorità
  const negativeWords = ['non', 'mai', 'sempre', 'continua', 'persistente'];
  negativeWords.forEach(word => {
    if (text.includes(word)) {
      scores.critica += 0.5;
    }
  });

  // Punteggiatura enfatica aumenta priorità
  const exclamationMarks = (text.match(/!/g) || []).length;
  if (exclamationMarks > 0) {
    scores.critica += exclamationMarks * 0.5;
  }

  // Maiuscole (più del 30%) = urgenza
  const upperCaseRatio = (description.match(/[A-Z]/g) || []).length / description.length;
  if (upperCaseRatio > 0.3) {
    scores.critica += 1;
  }

  // Lunghezza testo (problemi gravi = descrizioni lunghe)
  if (text.length > 200) {
    scores.alta += 0.5;
  } else if (text.length < 50) {
    scores.bassa += 0.5;
  }

  // Trova priorità con score più alto
  const maxScore = Math.max(scores.critica, scores.alta, scores.media, scores.bassa);

  if (maxScore === 0) {
    return 'media'; // Default se nessuna keyword trovata
  }

  // Preferisci sicurezza (critica > alta)
  if (scores.critica === maxScore) return 'critica';
  if (scores.alta === maxScore) return 'alta';
  if (scores.media === maxScore) return 'media';
  return 'bassa';
}

/**
 * Suggerisce priorità con spiegazione
 * @param {string} description
 * @returns {object} - { priority, confidence, explanation, matchedKeywords }
 */
function detectPriorityWithExplanation(description) {
  const priority = detectPriority(description);
  const text = description.toLowerCase();

  // Trova keywords matchate
  const matched = [];
  for (const keyword of KEYWORDS[priority]) {
    if (text.includes(keyword)) {
      matched.push(keyword);
    }
  }

  // Calcola confidence (0-100)
  let confidence = 50; // Base
  if (matched.length > 0) {
    confidence = Math.min(95, 50 + (matched.length * 15));
  }

  // Genera spiegazione
  let explanation = '';
  if (matched.length > 0) {
    explanation = `Rilevate parole chiave: ${matched.slice(0, 3).join(', ')}`;
  } else {
    explanation = 'Analisi basata sul contesto generale';
  }

  return {
    priority,
    confidence,
    explanation,
    matchedKeywords: matched
  };
}

/**
 * Ottieni emoji per priorità
 */
function getPriorityEmoji(priority) {
  const emojis = {
    critica: '🔴',
    alta: '🟠',
    media: '🟡',
    bassa: '🟢'
  };
  return emojis[priority] || '⚪';
}

/**
 * Ottieni label per priorità
 */
function getPriorityLabel(priority) {
  const labels = {
    critica: 'CRITICA - Immediata',
    alta: 'ALTA - Urgente',
    media: 'MEDIA - Importante',
    bassa: 'BASSA - Non urgente'
  };
  return labels[priority] || 'MEDIA';
}

/**
 * Ottieni colore CSS per priorità
 */
function getPriorityColor(priority) {
  const colors = {
    critica: '#dc2626',
    alta: '#ea580c',
    media: '#f59e0b',
    bassa: '#10b981'
  };
  return colors[priority] || '#6b7280';
}

module.exports = {
  detectPriority,
  detectPriorityWithExplanation,
  getPriorityEmoji,
  getPriorityLabel,
  getPriorityColor,
  KEYWORDS // Export per testing
};
