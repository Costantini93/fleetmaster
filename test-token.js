require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkTokenStatus() {
  try {
    console.log("🔄 Tentativo di connessione e verifica token...");
    console.log("📍 URL:", process.env.TURSO_DATABASE_URL);
    console.log("🔑 Token (primi 50 caratteri):", process.env.TURSO_AUTH_TOKEN?.substring(0, 50) + "...");
    
    const result = await client.execute("SELECT 1;"); 
    
    if (result) {
      console.log("✅ SUCCESS: Il token Turso è attivo e valido. Connessione riuscita!");
      console.log("📊 Risultato:", result.rows);
    }
  } catch (error) {
    if (error.message.includes("401")) {
      console.error("❌ ERRORE 401: Token NON valido o scaduto.");
    } else if (error.message.includes("SQL_PARSE_ERROR")) {
      console.error("⚠️ ATTENZIONE: Token valido, ma query con errore di sintassi SQL.");
      console.error("Errore:", error.message);
    } else {
      console.error("❌ ERRORE: Fallita la connessione:", error.message);
    }
  }
}

checkTokenStatus();
