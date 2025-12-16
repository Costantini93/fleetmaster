const { createClient } = require('@libsql/client');
require('dotenv').config();

async function checkPhotos() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const result = await db.execute(`
      SELECT 
        id,
        user_id,
        data,
        CASE 
          WHEN foto_frontale IS NULL THEN 'NULL'
          WHEN foto_frontale = '' THEN 'EMPTY'
          WHEN LENGTH(foto_frontale) < 50 THEN 'TOO_SHORT (' || LENGTH(foto_frontale) || ')'
          WHEN SUBSTR(foto_frontale, 1, 5) = 'data:' THEN 'HAS_PREFIX (' || LENGTH(foto_frontale) || ')'
          WHEN SUBSTR(foto_frontale, 1, 1) = '/' THEN 'FILE_PATH'
          ELSE 'BASE64 (' || LENGTH(foto_frontale) || ')'
        END as foto_frontale_status,
        CASE 
          WHEN foto_posteriore IS NULL THEN 'NULL'
          WHEN foto_posteriore = '' THEN 'EMPTY'
          WHEN LENGTH(foto_posteriore) < 50 THEN 'TOO_SHORT'
          WHEN SUBSTR(foto_posteriore, 1, 5) = 'data:' THEN 'HAS_PREFIX'
          ELSE 'BASE64'
        END as foto_posteriore_status,
        CASE 
          WHEN foto_cruscotto IS NULL THEN 'NULL'
          WHEN foto_cruscotto = '' THEN 'EMPTY'
          WHEN LENGTH(foto_cruscotto) < 50 THEN 'TOO_SHORT'
          WHEN SUBSTR(foto_cruscotto, 1, 5) = 'data:' THEN 'HAS_PREFIX'
          ELSE 'BASE64'
        END as foto_cruscotto_status
      FROM daily_reports
      WHERE foto_frontale IS NOT NULL
      ORDER BY data DESC, id DESC
      LIMIT 5
    `);

    console.log('=== ULTIMI 5 REPORT CON FOTO ===\n');
    result.rows.forEach(row => {
      console.log(`Report ID: ${row.id}`);
      console.log(`Data: ${row.data}`);
      console.log(`Foto Frontale: ${row.foto_frontale_status}`);
      console.log(`Foto Posteriore: ${row.foto_posteriore_status}`);
      console.log(`Foto Cruscotto: ${row.foto_cruscotto_status}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Errore:', error);
  }
}

checkPhotos();
