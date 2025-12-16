const { createClient } = require('@libsql/client');
require('dotenv').config();

async function checkLatestReport() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const result = await db.execute(`
      SELECT 
        id,
        user_id,
        vehicle_id,
        data,
        codice_giro,
        km_partenza,
        ora_partenza,
        stato,
        LENGTH(foto_frontale) as foto_frontale_size,
        LENGTH(firma_partenza) as firma_size
      FROM daily_reports
      ORDER BY id DESC
      LIMIT 3
    `);

    console.log('=== ULTIMI 3 REPORT ===\n');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`User ID: ${row.user_id}`);
      console.log(`Vehicle ID: ${row.vehicle_id}`);
      console.log(`Data: ${row.data}`);
      console.log(`Codice Giro: ${row.codice_giro}`);
      console.log(`Stato: ${row.stato}`);
      console.log(`Foto Frontale: ${row.foto_frontale_size ? (row.foto_frontale_size / 1024).toFixed(0) + 'KB' : 'NULL'}`);
      console.log(`Firma: ${row.firma_size ? (row.firma_size / 1024).toFixed(0) + 'KB' : 'NULL'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Errore:', error);
  }
}

checkLatestReport();
