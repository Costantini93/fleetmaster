const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:database.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function clearTodayAssignments() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🗑️  Rimozione assegnazioni per ${today}...`);

    const result = await db.execute({
      sql: `DELETE FROM assignments WHERE data = ?`,
      args: [today]
    });

    console.log(`✅ ${result.rowsAffected || 0} assegnazioni rimosse`);

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await db.close();
  }
}

clearTodayAssignments();
