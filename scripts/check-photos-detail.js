const { createClient } = require('@libsql/client');
require('dotenv').config();

async function checkPhotosDetail() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const result = await db.execute(`
      SELECT 
        id,
        data,
        SUBSTR(foto_frontale, 1, 50) as foto_frontale_preview,
        LENGTH(foto_frontale) as foto_frontale_length,
        SUBSTR(foto_posteriore, 1, 50) as foto_posteriore_preview,
        LENGTH(foto_posteriore) as foto_posteriore_length,
        SUBSTR(foto_cruscotto, 1, 50) as foto_cruscotto_preview,
        LENGTH(foto_cruscotto) as foto_cruscotto_length
      FROM daily_reports
      WHERE foto_frontale IS NOT NULL
      ORDER BY data DESC, id DESC
      LIMIT 1
    `);

    console.log('=== DETTAGLIO ULTIMO REPORT ===\n');
    result.rows.forEach(row => {
      console.log(`Report ID: ${row.id}`);
      console.log(`Data: ${row.data}`);
      console.log(`\nFoto Frontale (${row.foto_frontale_length} bytes):`);
      console.log(`  Inizio: "${row.foto_frontale_preview}"`);
      console.log(`\nFoto Posteriore (${row.foto_posteriore_length} bytes):`);
      console.log(`  Inizio: "${row.foto_posteriore_preview}"`);
      console.log(`\nFoto Cruscotto (${row.foto_cruscotto_length} bytes):`);
      console.log(`  Inizio: "${row.foto_cruscotto_preview}"`);
    });

  } catch (error) {
    console.error('Errore:', error);
  }
}

checkPhotosDetail();
