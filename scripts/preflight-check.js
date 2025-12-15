#!/usr/bin/env node

/**
 * Pre-flight Check Script
 * Verifica che tutti i file necessari siano presenti prima del deployment
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  ROBI FLEET - PRE-FLIGHT CHECK v1.0       ║');
console.log('╚════════════════════════════════════════════╝\n');

let errors = 0;
let warnings = 0;

// File critici che devono esistere
const criticalFiles = [
  'package.json',
  'server.js',
  '.env.example',
  '.gitignore',
  'config/database.js',
  'middleware/auth.js',
  'routes/auth.js',
  'routes/admin.js',
  'routes/admin-extended.js',
  'routes/admin-maintenance.js',
  'routes/rider.js',
  'routes/api.js',
  'scripts/initDatabase.js',
  'public/css/style.css',
  'public/js/app.js',
  'public/service-worker.js',
  'public/manifest.json',
  'views/layout.ejs'
];

// Cartelle che devono esistere
const criticalDirs = [
  'config',
  'middleware',
  'routes',
  'scripts',
  'public',
  'public/css',
  'public/js',
  'public/icons',
  'views',
  'views/auth',
  'views/admin',
  'views/rider'
];

// View EJS che devono esistere
const criticalViews = [
  'views/layout.ejs',
  'views/error.ejs',
  'views/auth/login.ejs',
  'views/auth/change-password.ejs',
  'views/admin/dashboard.ejs',
  'views/admin/employees.ejs',
  'views/admin/employee-form.ejs',
  'views/admin/vehicles.ejs',
  'views/admin/vehicle-form.ejs',
  'views/admin/roster.ejs',
  'views/admin/assignments.ejs',
  'views/admin/reports.ejs',
  'views/admin/report-detail.ejs',
  'views/admin/maintenance.ejs',
  'views/admin/maintenance-detail.ejs',
  'views/admin/expiration-alerts.ejs',
  'views/admin/substitutions.ejs',
  'views/admin/activity-logs.ejs',
  'views/rider/dashboard.ejs',
  'views/rider/report-departure.ejs',
  'views/rider/report-return.ejs',
  'views/rider/maintenance-request.ejs',
  'views/rider/reports-history.ejs',
  'views/rider/maintenance-history.ejs'
];

console.log('🔍 Verifica file critici...\n');

// Verifica cartelle
console.log('📁 Cartelle:');
criticalDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ❌ ${dir} - MANCANTE`);
    errors++;
  }
});

console.log('\n📄 File backend:');
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ✅ ${file} (${size} KB)`);
  } else {
    console.log(`  ❌ ${file} - MANCANTE`);
    errors++;
  }
});

console.log('\n🎨 View templates:');
criticalViews.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MANCANTE`);
    errors++;
  }
});

// Verifica .env
console.log('\n⚙️  Configurazione:');
if (fs.existsSync('.env')) {
  console.log('  ✅ File .env trovato');
  
  // Verifica contenuto .env
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredEnvVars = [
    'PORT',
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    'SESSION_SECRET'
  ];
  
  requiredEnvVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`  ✅ ${varName} presente`);
    } else {
      console.log(`  ⚠️  ${varName} mancante in .env`);
      warnings++;
    }
  });
} else {
  console.log('  ⚠️  File .env non trovato (usa .env.example come template)');
  warnings++;
}

// Verifica node_modules
console.log('\n📦 Dipendenze:');
if (fs.existsSync('node_modules')) {
  console.log('  ✅ node_modules presente');
  
  // Verifica package.json
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    console.log(`  ✅ ${deps.length} dipendenze definite`);
    
    const criticalDeps = ['express', 'ejs', 'bcrypt', 'multer', '@libsql/client', 'dotenv'];
    criticalDeps.forEach(dep => {
      if (deps.includes(dep)) {
        console.log(`    ✅ ${dep}`);
      } else {
        console.log(`    ❌ ${dep} - MANCANTE`);
        errors++;
      }
    });
  }
} else {
  console.log('  ⚠️  node_modules non trovato (esegui: npm install)');
  warnings++;
}

// Verifica cartelle upload
console.log('\n📤 Cartelle upload:');
const uploadDirs = ['uploads', 'uploads/vehicle-photos', 'uploads/signatures'];
uploadDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ⚠️  ${dir} - sarà creata automaticamente`);
  }
});

// Verifica documentazione
console.log('\n📚 Documentazione:');
const docs = ['README.md', 'QUICKSTART.md', 'CHANGELOG.md', 'COMPLETION.md'];
docs.forEach(doc => {
  if (fs.existsSync(doc)) {
    const stats = fs.statSync(doc);
    const lines = fs.readFileSync(doc, 'utf8').split('\n').length;
    console.log(`  ✅ ${doc} (${lines} linee)`);
  } else {
    console.log(`  ⚠️  ${doc} - documentazione mancante`);
    warnings++;
  }
});

// Report finale
console.log('\n╔════════════════════════════════════════════╗');
console.log('║           REPORT FINALE                    ║');
console.log('╚════════════════════════════════════════════╝');

console.log(`\n📊 Statistiche:`);
console.log(`  • File verificati: ${criticalFiles.length + criticalViews.length + docs.length}`);
console.log(`  • Cartelle verificate: ${criticalDirs.length + uploadDirs.length}`);
console.log(`  • Errori critici: ${errors}`);
console.log(`  • Warning: ${warnings}`);

if (errors === 0 && warnings === 0) {
  console.log('\n✅ ╔═══════════════════════════════════════╗');
  console.log('✅ ║   SISTEMA 100% PRONTO!                ║');
  console.log('✅ ╚═══════════════════════════════════════╝');
  console.log('\n🚀 Prossimi passi:');
  console.log('   1. Configura .env (se non ancora fatto)');
  console.log('   2. Esegui: npm run init-db');
  console.log('   3. Esegui: npm start');
  console.log('   4. Apri: http://localhost:3000\n');
  process.exit(0);
} else if (errors === 0) {
  console.log('\n⚠️  ╔═══════════════════════════════════════╗');
  console.log('⚠️  ║   SISTEMA QUASI PRONTO                ║');
  console.log('⚠️  ╚═══════════════════════════════════════╝');
  console.log(`\n⚠️  ${warnings} warning(s) trovati (non critici)`);
  console.log('\n🔧 Azioni consigliate:');
  if (!fs.existsSync('.env')) {
    console.log('   • Crea file .env da .env.example');
  }
  if (!fs.existsSync('node_modules')) {
    console.log('   • Esegui: npm install');
  }
  console.log('');
  process.exit(0);
} else {
  console.log('\n❌ ╔═══════════════════════════════════════╗');
  console.log('❌ ║   ERRORI CRITICI TROVATI!             ║');
  console.log('❌ ╚═══════════════════════════════════════╝');
  console.log(`\n❌ ${errors} errore(i) critico(i) trovato(i)`);
  console.log('   Correggi gli errori prima di procedere.\n');
  process.exit(1);
}
