# ============================================
# ROBI Fleet Management - Installazione Rapida
# ============================================

Write-Host "
╔═══════════════════════════════════════════╗
║   ROBI FLEET MANAGEMENT SYSTEM v1.0       ║
║   Installazione Automatica                ║
╚═══════════════════════════════════════════╝
" -ForegroundColor Cyan

# Verifica Node.js
Write-Host "`n[1/6] Verifica Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js non trovato!" -ForegroundColor Red
    Write-Host "Scarica Node.js da: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js installato: $nodeVersion" -ForegroundColor Green

# Installa dipendenze
Write-Host "`n[2/6] Installazione dipendenze..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Errore installazione dipendenze!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dipendenze installate" -ForegroundColor Green

# Crea cartelle upload
Write-Host "`n[3/6] Creazione cartelle upload..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path ".\uploads\vehicle-photos" -Force | Out-Null
New-Item -ItemType Directory -Path ".\uploads\signatures" -Force | Out-Null
Write-Host "✅ Cartelle create" -ForegroundColor Green

# Verifica file .env
Write-Host "`n[4/6] Verifica configurazione..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  File .env non trovato" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Devi configurare Turso Database:" -ForegroundColor Cyan
    Write-Host "1. Crea account su: https://turso.tech" -ForegroundColor White
    Write-Host "2. Installa CLI: npm install -g @turso/cli" -ForegroundColor White
    Write-Host "3. Login: turso auth login" -ForegroundColor White
    Write-Host "4. Crea DB: turso db create robi-fleet" -ForegroundColor White
    Write-Host "5. Ottieni URL: turso db show robi-fleet" -ForegroundColor White
    Write-Host "6. Ottieni Token: turso db tokens create robi-fleet" -ForegroundColor White
    Write-Host ""
    
    # Crea .env da template
    Copy-Item .env.example .env
    Write-Host "✅ File .env creato da template" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANTE: Modifica il file .env con i tuoi dati Turso!" -ForegroundColor Yellow
    Write-Host ""
    
    $continua = Read-Host "Hai configurato il file .env? (s/n)"
    if ($continua -ne 's') {
        Write-Host "❌ Configura .env e rilancia lo script" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ File .env trovato" -ForegroundColor Green
}

# Inizializza database
Write-Host "`n[5/6] Inizializzazione database..." -ForegroundColor Yellow
npm run init-db
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Errore inizializzazione database!" -ForegroundColor Red
    Write-Host "Verifica le credenziali Turso in .env" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Database inizializzato" -ForegroundColor Green

# Popola dati demo (opzionale)
Write-Host "`n[6/6] Popolamento dati demo (opzionale)..." -ForegroundColor Yellow
$demo = Read-Host "Vuoi aggiungere dati di esempio? (s/n)"
if ($demo -eq 's') {
    npm run populate-demo
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dati demo aggiunti" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Errore popolamento demo (non critico)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Dati demo saltati" -ForegroundColor Gray
}

# Riepilogo finale
Write-Host "
╔═══════════════════════════════════════════╗
║         INSTALLAZIONE COMPLETATA!         ║
╚═══════════════════════════════════════════╝
" -ForegroundColor Green

Write-Host "📋 PROSSIMI PASSI:" -ForegroundColor Cyan
Write-Host "1. Avvia il server:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Apri il browser:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Login Admin:" -ForegroundColor White
Write-Host "   Username: admin" -ForegroundColor Yellow
Write-Host "   Password: Admin123!" -ForegroundColor Yellow
Write-Host ""

if ($demo -eq 's') {
    Write-Host "4. Login Rider (esempio):" -ForegroundColor White
    Write-Host "   Username: mario.rossi" -ForegroundColor Yellow
    Write-Host "   Password: Rider123!" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "📚 Documentazione completa: README.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Buon lavoro! 🚀" -ForegroundColor Green
