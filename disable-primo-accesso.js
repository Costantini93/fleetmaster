require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function disablePrimoAccesso() {
  try {
    console.log("🔄 Aggiornamento primo_accesso per admin...");
    
    await client.execute("UPDATE users SET primo_accesso = 0 WHERE username = 'admin'");
    
    console.log("✅ Admin aggiornato! Ora puoi fare login direttamente.");
  } catch (error) {
    console.error("❌ Errore:", error.message);
  }
}

disablePrimoAccesso();
