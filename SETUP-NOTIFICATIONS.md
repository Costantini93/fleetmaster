# 🔔 Setup Sistema Notifiche e Backup

## 📋 Panoramica

Il sistema ora supporta tre tipi di notifiche:
- **🔴 In-App**: Campanella con badge e dropdown (già funzionante)
- **✉️ Email**: Invio automatico agli admin via SMTP
- **🔔 Push Browser**: Notifiche desktop anche con browser chiuso

Inoltre è disponibile il **backup automatico settimanale** del database.

---

## ⚙️ Configurazione

### 1️⃣ Genera Chiavi VAPID (Push Notifications)

Le chiavi VAPID sono necessarie per le notifiche push browser.

```bash
npx web-push generate-vapid-keys
```

Output esempio:
```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
bdSiGcguMjdJDqVzKbJiWxUYyYON6nrFf3rW7E0pNao
=======================================
```

### 2️⃣ Configura Email SMTP

Per l'invio automatico di email, puoi usare Gmail o SendGrid.

#### Opzione A: Gmail

1. Vai su [Google Account](https://myaccount.google.com/)
2. Sicurezza → Verifica in due passaggi → Password per le app
3. Genera una password per "Mail" → Copia la password

#### Opzione B: SendGrid

1. Registrati su [SendGrid](https://sendgrid.com/)
2. Settings → API Keys → Create API Key
3. Copia la API Key

---

## 🚀 Variabili d'Ambiente Vercel

Vai su **Vercel Dashboard** → Tuo Progetto → **Settings** → **Environment Variables**

Aggiungi queste variabili:

### Push Notifications

```
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=bdSiGcguMjdJDqVzKbJiWxUYyYON6nrFf3rW7E0pNao
VAPID_EMAIL=mailto:tuo-email@esempio.it
```

### Email (Gmail)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuo-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

### Email (SendGrid)

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### URL Applicazione

```
APP_URL=https://tuo-progetto.vercel.app
```

---

## 🧪 Test del Sistema

### Test Push Notifications

1. Accedi come admin
2. Guarda in alto a destra: dovrebbe apparire il pulsante **"Attiva Notifiche Push"**
3. Clicca e accetta i permessi del browser
4. Verifica che il pulsante scompaia dopo l'attivazione

### Test Email

1. Crea una manutenzione urgente o con scadenza prossima
2. Controlla l'email admin dopo pochi minuti
3. Oppure aspetta le 8:00 AM per il controllo automatico

### Test Backup Manuale

1. Vai su **Dashboard Admin**
2. Clicca **"Backup Manuale"**
3. Controlla email admin: riceverai un file JSON allegato

---

## 📅 Scheduler Automatici

### Notifiche (Daily)

**Quando**: Ogni giorno alle **8:00 AM**

**Cosa controlla**:
- 📄 Documenti veicoli (libretto, assicurazione, contratto) in scadenza
- 🔧 Manutenzioni in scadenza o urgenti per km

**Azioni**:
- Notifica in-app (campanella)
- Email agli admin
- Push browser per priorità alta/critica

### Backup Database (Weekly)

**Quando**: Ogni **lunedì alle 3:00 AM**

**Cosa fa**:
- Esporta tutte le tabelle del database in JSON
- Calcola statistiche (tabelle, righe, dimensione)
- Invia email con backup allegato a tutti gli admin

---

## 🎯 Priorità Notifiche

Le notifiche hanno 3 livelli di priorità che determinano il comportamento:

| Priorità | In-App | Email | Push Browser |
|----------|--------|-------|--------------|
| **Media** | ✅ | ✅ | ❌ |
| **Alta** | ✅ | ✅ | ✅ |
| **Critica** | ✅ | ✅ | ✅ (vibrazione) |

**Esempi**:
- Documento scaduto tra 30 giorni → **Media**
- Documento scaduto tra 7 giorni → **Alta**
- Manutenzione urgente superata → **Critica**

---

## 🔧 Troubleshooting

### Push non funzionano

1. Verifica che le chiavi VAPID siano configurate su Vercel
2. Controlla la console browser per errori (F12)
3. Assicurati che il sito sia su **HTTPS** (Vercel lo fa automaticamente)
4. Prova con un browser diverso (Chrome, Firefox, Edge)

### Email non arrivano

1. Verifica le credenziali SMTP su Vercel
2. Controlla la cartella spam/promozioni
3. Con Gmail: assicurati che la password sia per "App" e non quella normale
4. Verifica che l'utente admin abbia un'email configurata nel database

### Backup non parte

1. Controlla i log del server (Vercel Dashboard → Deployments → Runtime Logs)
2. Verifica che l'orario sia corretto (3:00 AM timezone server)
3. Puoi testare con il pulsante **"Backup Manuale"** nella dashboard

---

## 📊 Struttura Database

### Tabella `notifications`

```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (riferimento users)
- tipo: TEXT (es. 'scadenza_documento', 'manutenzione_urgente')
- titolo: TEXT
- messaggio: TEXT
- link: TEXT (URL relativo per navigazione)
- priorita: TEXT ('media', 'alta', 'critica')
- letta: BOOLEAN (default 0)
- created_at: TIMESTAMP
- metadata: TEXT (JSON extra data)
```

### Tabella `push_subscriptions`

```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER
- endpoint: TEXT (URL push service)
- p256dh: TEXT (chiave crittografia)
- auth: TEXT (token autenticazione)
- created_at: TIMESTAMP
```

---

## 🎉 Funzionalità Implementate

✅ Sistema notifiche in-app con campanella  
✅ Email automatiche con template HTML  
✅ Push notifications browser (desktop/mobile)  
✅ Backup automatico settimanale via email  
✅ Backup manuale da dashboard admin  
✅ Scheduler per controlli giornalieri (8:00 AM)  
✅ Gestione priorità notifiche  
✅ Service Worker per push offline  
✅ Statistiche backup con dettaglio tabelle  

---

## 📖 Riferimenti

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [VAPID Keys](https://github.com/web-push-libs/web-push#command-line)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 💡 Prossimi Passi

1. **Genera chiavi VAPID** → `npx web-push generate-vapid-keys`
2. **Configura Gmail/SendGrid** → Ottieni password app o API key
3. **Aggiungi variabili su Vercel** → Settings → Environment Variables
4. **Deploy e testa** → Verifica notifiche e backup
5. **Monitora** → Controlla email e logs dopo il primo scheduler automatico

---

**🔒 Sicurezza**: Non condividere mai le chiavi VAPID_PRIVATE_KEY o SMTP_PASS. Tienile solo su Vercel environment variables.
