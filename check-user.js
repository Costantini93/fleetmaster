require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkUser() {
  try {
    console.log("🔍 Verifica utente admin...");
    
    const result = await client.execute("SELECT * FROM users WHERE username = 'admin'");
    
    if (result.rows.length === 0) {
      console.log("❌ Utente admin NON trovato!");
    } else {
      console.log("✅ Utente trovato:");
      console.log(result.rows[0]);
      
      // Testa la password
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare('Admin123!', user.password);
      console.log("\n🔑 Test password 'Admin123!':", passwordMatch ? "✅ CORRETTA" : "❌ ERRATA");
    }
  } catch (error) {
    console.error("❌ Errore:", error.message);
  }
}

checkUser();
