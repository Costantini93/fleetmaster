# 🚀 ROBI Fleet Management System

Sistema completo di gestione flotta veicoli con PWA, autenticazione multi-ruolo, tracking GPS e gestione manutenzioni.

---

## 📋 Indice

1. [Caratteristiche](#caratteristiche)
2. [Requisiti di Sistema](#requisiti-di-sistema)
3. [Installazione](#installazione)
4. [Configurazione](#configurazione)
5. [Inizializzazione Database](#inizializzazione-database)
6. [Avvio dell'Applicazione](#avvio-dellapplicazione)
7. [Struttura del Progetto](#struttura-del-progetto)
8. [Guida Utente](#guida-utente)
9. [API Documentation](#api-documentation)
10. [Manutenzione](#manutenzione)
11. [Risoluzione Problemi](#risoluzione-problemi)

---

## ✨ Caratteristiche

### 🔐 Autenticazione e Sicurezza
- Login con username/password (bcrypt encryption)
- Sistema a due ruoli: **Admin** e **Rider**
- Cambio password obbligatorio al primo accesso
- Gestione sessioni con express-session
- Activity logging completo con IP tracking

### 👥 Gestione Dipendenti (Admin)
- CRUD completo dipendenti
- Attivazione/Disattivazione account
- Reset password con generazione automatica
- Ricerca e filtri avanzati

### 🚗 Gestione Veicoli (Admin)
- CRUD veicoli con tracking km automatico
- Gestione contratti di noleggio
- Scadenzario manutenzioni programmato
- Alert automatici per scadenze (30 giorni/200km)
- Storico completo utilizzo veicoli

### 📅 Sistema Turni e Assegnazioni (Admin)
- Pianificazione turni settimanale
- Assegnazione automatica/manuale veicoli
- Vista calendario intuitiva
- Gestione conflitti

### 📊 Rapporti Giornalieri (Rider)
**Partenza:**
- Km partenza con validazione
- 4 foto veicolo (frontale, posteriore, destra, sinistra)
- Firma digitale su canvas HTML5
- Codice giro e numero ditta
- Tipo carburante (IP/DKV)
- Pacchi ritirati

**Ritorno:**
- Km arrivo con validazione
- Aggiornamento automatico km veicolo
- Pacchi consegnati
- Stato carburante finale
- Calcolo automatico distanza

### 🔧 Gestione Manutenzioni
- Segnalazioni rider con AI priority detection
- Dashboard admin con filtri priorità/stato
- Gestione stati (in_attesa/in_lavorazione/completata)
- Note di risoluzione
- Storico completo

### 📈 Dashboard e Reportistica
**Admin:**
- Statistiche real-time
- Filtri avanzati (data/autista/veicolo/stato)
- Operazioni bulk su rapporti
- Export CSV completo
- Grafici e metriche

**Rider:**
- Statistiche personali
- Prossimi turni
- Storico viaggi

### 🔔 Sistema Alert Scadenze
- Pagina dedicata con due sezioni:
  - **Contratti noleggio**: alert 30 giorni prima
  - **Manutenzioni**: alert 200km prima
- Badge colorati per urgenza
- Statistiche riepilogative

### 📱 PWA (Progressive Web App)
- Installabile come app nativa
- Service Worker per caching
- Supporto offline
- Manifest configurato
- Icone ottimizzate

### 🎨 UI/UX Professionale
- Design moderno blu professionale
- Sidebar responsive con overlay mobile
- Gradienti eleganti
- Animazioni fluide
- Badge colorati per stati
- Toast notifications
- Loading spinners

---

## 💻 Requisiti di Sistema

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Turso Database**: Account gratuito su [turso.tech](https://turso.tech)
- **Sistema Operativo**: Windows, macOS, Linux

---

## 🔧 Installazione

### 1. Clona o scarica il progetto

```powershell
cd "C:\Users\aleco\OneDrive\Desktop\GESTIONALE FURGONI"
```

### 2. Installa le dipendenze

```powershell
npm install
```

---

## ⚙️ Configurazione

### 1. Crea account Turso

1. Vai su [turso.tech](https://turso.tech) e crea un account gratuito
2. Installa Turso CLI:
   ```powershell
   npm install -g @turso/cli
   ```
3. Login:
   ```powershell
   turso auth login
   ```
4. Crea un database:
   ```powershell
   turso db create robi-fleet
   ```
5. Ottieni URL e token:
   ```powershell
   turso db show robi-fleet
   turso db tokens create robi-fleet
   ```

### 2. Configura variabili d'ambiente

Copia `.env.example` in `.env`:

```powershell
Copy-Item .env.example .env
```

Modifica `.env` con i tuoi dati:

```env
# Configurazione Server
PORT=3000
NODE_ENV=production

# Configurazione Turso Database (LibSQL)
TURSO_DATABASE_URL=libsql://robi-fleet-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# Configurazione Sessione
SESSION_SECRET=inserisci-una-stringa-molto-lunga-e-casuale-qui
SESSION_MAX_AGE=86400000

# Credenziali Admin di Default
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=Admin123!

# Configurazione Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

**⚠️ IMPORTANTE:** Cambia `SESSION_SECRET` con una stringa casuale molto lunga!

---

## 🗄️ Inizializzazione Database

Esegui lo script di inizializzazione per creare le tabelle e l'utente admin:

```powershell
npm run init-db
```

Output atteso:
```
🔄 Inizializzazione database...
✅ Tabelle create con successo!
✅ Utente admin creato: admin
🔑 Password temporanea: Admin123!
⚠️  IMPORTANTE: Cambia la password al primo accesso!
🎉 Inizializzazione database completata!
```

---

## 🚀 Avvio dell'Applicazione

### Modalità Produzione

```powershell
npm start
```

### Modalità Sviluppo (con auto-restart)

```powershell
npm run dev
```

L'applicazione sarà disponibile su: **http://localhost:3000**

---

## 📁 Struttura del Progetto

```
GESTIONALE FURGONI/
├── config/
│   └── database.js          # Configurazione Turso DB
├── middleware/
│   └── auth.js              # Middleware autenticazione
├── routes/
│   ├── auth.js              # Route autenticazione
│   ├── admin.js             # Route admin principali
│   ├── admin-extended.js    # Route admin estese
│   ├── admin-maintenance.js # Route manutenzioni admin
│   ├── rider.js             # Route rider
│   └── api.js               # API REST
├── views/
│   ├── layout.ejs           # Layout principale
│   ├── auth/                # View autenticazione
│   ├── admin/               # View amministratore
│   └── rider/               # View autista
├── public/
│   ├── css/
│   │   └── style.css        # Stili CSS
│   ├── js/
│   │   └── app.js           # JavaScript client
│   ├── icons/               # Icone PWA
│   ├── manifest.json        # Web App Manifest
│   └── service-worker.js    # Service Worker PWA
├── scripts/
│   └── initDatabase.js      # Script inizializzazione DB
├── uploads/                 # Upload file (auto-creato)
├── server.js                # Server principale
├── package.json             # Dipendenze
├── .env                     # Configurazione (NON committare!)
├── .env.example             # Template configurazione
└── README.md                # Questo file
```

---

## 👤 Guida Utente

### 🔐 Primo Accesso

1. Apri **http://localhost:3000**
2. Login con:
   - **Username**: `admin`
   - **Password**: `Admin123!` (o quella configurata in `.env`)
3. Verrai reindirizzato al cambio password obbligatorio
4. Imposta una nuova password sicura

### 📱 Installazione PWA

1. Clicca sull'icona **Download** nella topbar
2. Conferma l'installazione
3. L'app sarà disponibile come applicazione nativa

---

### 🛠️ Funzionalità Amministratore

#### Gestione Dipendenti

1. **Menu** → **Dipendenti**
2. **Nuovo Dipendente** per aggiungere
3. Compila:
   - Nome e Cognome
   - Username (univoco)
   - Password iniziale
   - Telefono (opzionale)
   - Ruolo (Admin/Rider)
4. **Salva**

**Azioni disponibili:**
- ✏️ **Modifica**: Aggiorna dati dipendente
- 🔄 **Toggle**: Attiva/Disattiva account
- 🔑 **Reset Password**: Genera nuova password temporanea

#### Gestione Veicoli

1. **Menu** → **Veicoli**
2. **Nuovo Veicolo** per aggiungere
3. Compila:
   - Targa (univoca)
   - Modello
   - Anno
   - Km attuali (opzionale, si aggiorna automaticamente)
   - Note manutenzione
4. **Salva**

**Azioni aggiuntive:**
- **Contratti**: Gestisci contratti di noleggio
- **Manutenzioni**: Configura scadenzario manutenzioni

#### Contratti Noleggio

1. Vai su veicolo → **Contratti**
2. Aggiungi:
   - Data inizio e scadenza
   - Fornitore
   - Costo mensile
   - Note
3. Sistema genera **alert automatici 30 giorni prima**

#### Scadenzario Manutenzioni

1. Vai su veicolo → **Manutenzioni**
2. Aggiungi:
   - Tipo manutenzione (es. "Tagliando", "Revisione")
   - Km previsti (intervallo, es. 15000)
   - Ultima manutenzione km
3. Sistema calcola prossima manutenzione
4. **Alert automatici 200km prima**

#### Gestione Turni

1. **Menu** → **Turni**
2. Naviga tra le settimane con frecce
3. **Aggiungi Turno**:
   - Seleziona rider
   - Seleziona data
   - Seleziona turno (mattina/pomeriggio/notte)
4. Elimina turni con icona cestino

#### Assegnazioni Veicoli

1. **Menu** → **Assegnazioni**
2. Seleziona data
3. **Nuova Assegnazione**:
   - Seleziona rider (da roster della giornata)
   - Seleziona veicolo disponibile
   - Conferma
4. Sistema previene doppie assegnazioni

#### Gestione Rapporti

1. **Menu** → **Rapporti**
2. **Filtra** per data/autista/veicolo/stato
3. Visualizza dettagli rapporto (foto, firma, km)
4. **Operazioni bulk**:
   - Seleziona multipli con checkbox
   - Elimina selezionati
5. **Export CSV** per analisi esterna

#### Alert Scadenze

1. **Menu** → **Scadenze**
2. Visualizza:
   - **Contratti**: badge rosso se scaduto, arancione se < 30gg
   - **Manutenzioni**: badge rosso se superato, arancione se < 200km
3. Statistiche in alto per overview rapido

#### Manutenzioni

1. **Menu** → **Richieste**
2. **Filtra** per stato/priorità
3. Clicca su richiesta per dettagli
4. Aggiorna:
   - Stato (in_attesa/in_lavorazione/completata)
   - Priorità
   - Note di risoluzione
5. **Salva**

#### Sostituzioni

1. **Menu** → **Sostituzioni**
2. **Nuova Sostituzione**:
   - Autista assente
   - Sostituto
   - Data
   - Motivo (malattia/ferie/altro)
   - Note opzionali
3. Storico completo visibile in tabella

#### Log Attività

1. **Menu** → **Log Attività**
2. Filtra per:
   - Utente
   - Tipo azione
   - Limite risultati
3. Visualizza audit trail completo

---

### 🚚 Funzionalità Rider

#### Dashboard

- Visualizza veicolo assegnato oggi
- Statistiche personali (viaggi, km, completati)
- Rapporti della giornata
- Prossimi turni programmati

#### Nuovo Rapporto - Partenza

1. **Dashboard** → **Nuovo Rapporto**
2. Compila:
   - Codice giro (opzionale)
   - **Km partenza** (min: km attuali veicolo)
   - Numero ditta
   - **Tipo carburante** (IP/DKV)
   - Numero carta DKV (se DKV selezionato)
   - Pacchi ritirati
3. **Firma** nel canvas (usa mouse/dito)
4. **Carica 4 foto** veicolo:
   - Frontale
   - Posteriore
   - Lato destro
   - Lato sinistro
5. **Registra Partenza**

**Note:**
- Ora partenza registrata automaticamente (UTC+1)
- Tutte le foto sono obbligatorie
- Firma obbligatoria

#### Rapporto di Ritorno

1. **Dashboard** → Rapporto "In Corso" → **Ritorno**
2. Compila:
   - **Km arrivo** (deve essere >= km partenza)
   - Pacchi consegnati
   - Stato carburante finale
3. **Completa Rapporto**

**Sistema automaticamente:**
- Calcola distanza percorsa
- Aggiorna km veicolo
- Registra ora ritorno (UTC+1)
- Cambia stato a "completato"

#### Segnala Problema

1. **Menu** → **Segnala Problema**
2. Seleziona veicolo
3. **Descrivi problema** in dettaglio
4. Priorità (opzionale, altrimenti AI la rileva)
5. **Invia**

**AI Priority Detection:**
- Parole chiave "freni", "sterzo", "perdita olio" → **Critica**
- Parole chiave "rumore", "vibrazione", "luci" → **Alta**
- Altro → **Media/Bassa**

#### Storico

- **Rapporti**: Visualizza tutti i tuoi viaggi passati
- **Manutenzioni**: Visualizza stato segnalazioni inviate

---

## 🔌 API Documentation

### Autenticazione

Tutte le API richiedono autenticazione tramite sessione attiva.

### Endpoints Disponibili

#### GET `/api/vehicles/available`
Ottiene veicoli disponibili per assegnazione.

**Query Parameters:**
- `date` (optional): Data in formato YYYY-MM-DD
- `turno` (optional): Turno (mattina/pomeriggio/notte)

**Response:**
```json
{
  "success": true,
  "vehicles": [
    {
      "id": 1,
      "targa": "AB123CD",
      "modello": "Fiat Ducato",
      "anno": 2022,
      "km_attuali": 45000,
      "attivo": 1
    }
  ]
}
```

#### GET `/api/riders/available`
Ottiene lista rider attivi.

**Response:**
```json
{
  "success": true,
  "riders": [
    {
      "id": 2,
      "nome": "Mario",
      "cognome": "Rossi",
      "username": "mario.rossi"
    }
  ]
}
```

#### GET `/api/stats/dashboard` (Admin only)
Statistiche dashboard admin.

**Response:**
```json
{
  "success": true,
  "stats": {
    "todayReports": 5,
    "activeVehicles": 12,
    "pendingMaintenance": 3,
    "expiringContracts": 2
  }
}
```

#### GET `/api/reports/export` (Admin only)
Esporta rapporti in formato CSV.

**Query Parameters:**
- `start_date` (optional): Data inizio
- `end_date` (optional): Data fine

**Response:** File CSV

#### POST `/api/check-username` (Admin only)
Verifica disponibilità username.

**Body:**
```json
{
  "username": "nuovo.utente",
  "exclude_id": 5
}
```

**Response:**
```json
{
  "success": true,
  "available": true
}
```

#### POST `/api/check-plate` (Admin only)
Verifica disponibilità targa.

**Body:**
```json
{
  "targa": "XY789ZW",
  "exclude_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "available": false
}
```

---

## 🔧 Manutenzione

### Backup Database

Turso offre backup automatici. Per backup manuale:

```powershell
turso db shell robi-fleet ".backup robi-fleet-backup.db"
```

### Pulizia Upload

Gli upload si accumulano nel tempo. Pulisci periodicamente:

```powershell
Remove-Item -Path ".\uploads\vehicle-photos\*" -Recurse -Force
```

### Monitoring

Controlla log attività per anomalie:
- **Menu Admin** → **Log Attività**
- Filtra per azioni sospette
- Monitora accessi falliti

### Aggiornamenti

```powershell
npm update
npm audit fix
```

---

## 🐛 Risoluzione Problemi

### Database Connection Error

**Errore:** `Database query error`

**Soluzione:**
1. Verifica `.env`:
   ```env
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=eyJ...
   ```
2. Testa connessione:
   ```powershell
   turso db show robi-fleet
   ```
3. Rigenera token se scaduto:
   ```powershell
   turso db tokens create robi-fleet
   ```

### Upload File Error

**Errore:** `ENOENT: no such file or directory`

**Soluzione:**
```powershell
New-Item -ItemType Directory -Path ".\uploads\vehicle-photos" -Force
```

### Port Already in Use

**Errore:** `Port 3000 is already in use`

**Soluzione 1 - Cambia porta:**
```env
PORT=3001
```

**Soluzione 2 - Termina processo:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Session Errors

**Errore:** `Session expired`

**Soluzione:**
1. Verifica `SESSION_SECRET` in `.env`
2. Aumenta `SESSION_MAX_AGE` se necessario
3. Riavvia server

### PWA Not Installing

**Problema:** Bottone install non appare

**Soluzione:**
1. Usa HTTPS in produzione (requirement PWA)
2. Verifica `manifest.json` sia accessibile
3. Controlla console browser per errori Service Worker

---

## 📞 Supporto

Per problemi o domande:

- **GitHub Issues**: [Crea issue]
- **Email**: support@robi-fleet.com (esempio)
- **Documentazione**: Questo README

---

## 📄 Licenza

ISC License - Vedi file `package.json`

---

## 🎉 Conclusione

Il sistema ROBI Fleet Management è ora completamente configurato e pronto all'uso!

**Prossimi Passi:**
1. ✅ Cambia password admin
2. ✅ Aggiungi dipendenti
3. ✅ Aggiungi veicoli
4. ✅ Configura turni
5. ✅ Inizia a tracciare!

**Buon lavoro! 🚀**
