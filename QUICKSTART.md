# 🚀 GUIDA RAPIDA - ROBI Fleet Management

## ⚡ Installazione Veloce

### Windows (PowerShell)
```powershell
.\install.ps1
```

### Manuale
```powershell
# 1. Installa dipendenze
npm install

# 2. Configura Turso Database
# Crea account su https://turso.tech
npm install -g @turso/cli
turso auth login
turso db create robi-fleet
turso db show robi-fleet
turso db tokens create robi-fleet

# 3. Configura .env
Copy-Item .env.example .env
# Modifica .env con i tuoi dati

# 4. Inizializza database
npm run init-db

# 5. [OPZIONALE] Aggiungi dati demo
npm run populate-demo

# 6. Avvia server
npm start
```

## 🔑 Credenziali Predefinite

### Admin
- **Username**: `admin`
- **Password**: `Admin123!`
- ⚠️ **Cambio password obbligatorio al primo accesso**

### Rider (se hai eseguito populate-demo)
- **Username**: `mario.rossi` (o luca.bianchi, paolo.verdi, giuseppe.neri, franco.blu)
- **Password**: `Rider123!`

## 📱 Accesso all'Applicazione

Apri il browser su: **http://localhost:3000**

## 🎯 Primi Passi Admin

1. **Login con admin**
2. **Cambia password** (forzato)
3. **Aggiungi dipendenti**: Menu → Dipendenti → Nuovo Dipendente
4. **Aggiungi veicoli**: Menu → Veicoli → Nuovo Veicolo
5. **Crea turni**: Menu → Turni → Aggiungi Turno
6. **Assegna veicoli**: Menu → Assegnazioni → Nuova Assegnazione

## 🚚 Primi Passi Rider

1. **Login con rider**
2. **Dashboard**: Visualizza veicolo assegnato
3. **Nuovo Rapporto**: 
   - Inserisci km partenza
   - Firma digitale
   - 4 foto veicolo
   - Registra partenza
4. **Completa viaggio**: Dashboard → Ritorno
5. **Segnala problema**: Menu → Segnala Problema

## 🛠️ Comandi NPM

```powershell
npm start          # Avvia server produzione
npm run dev        # Avvia con auto-restart (sviluppo)
npm run init-db    # Inizializza database
npm run populate-demo  # Aggiungi dati di esempio
```

## 📊 Funzionalità Principali

### Admin
- ✅ Gestione dipendenti e veicoli
- ✅ Pianificazione turni settimanale
- ✅ Assegnazione automatica/manuale veicoli
- ✅ Monitoraggio rapporti in tempo reale
- ✅ Dashboard con statistiche
- ✅ Alert scadenze (contratti/manutenzioni)
- ✅ Gestione richieste manutenzione
- ✅ Registro sostituzioni
- ✅ Log attività completo
- ✅ Export CSV rapporti

### Rider
- ✅ Dashboard personale con statistiche
- ✅ Rapporti partenza/ritorno con foto e firma
- ✅ Segnalazione problemi veicolo
- ✅ Storico viaggi
- ✅ Storico manutenzioni

### PWA
- ✅ Installabile come app nativa
- ✅ Funzionamento offline
- ✅ Notifiche push-ready
- ✅ Icone ottimizzate

## 🔧 Risoluzione Problemi Rapidi

### Port già in uso
```powershell
# Cambia porta in .env
PORT=3001
```

### Database connection error
```powershell
# Verifica credenziali Turso in .env
turso db show robi-fleet
turso db tokens create robi-fleet
```

### Upload file error
```powershell
# Crea cartelle manualmente
New-Item -ItemType Directory -Path ".\uploads\vehicle-photos" -Force
```

## 📞 Supporto

- 📖 **Documentazione completa**: `README.md`
- 🐛 **Issue/Bug**: Crea issue su repository
- 💬 **Domande**: Consulta README.md sezione FAQ

## 🎉 Pronto!

Il sistema è ora configurato e pronto per l'uso in produzione.

**Buon lavoro! 🚀**
