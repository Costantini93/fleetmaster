require('dotenv').config();
const { createClient } = require('@libsql/client');

console.log('=== DEBUG TURSO CONNECTION ===');
console.log('URL:', process.env.TURSO_DATABASE_URL);
console.log('Token length:', process.env.TURSO_AUTH_TOKEN?.length);
console.log('Token starts with:', process.env.TURSO_AUTH_TOKEN?.substring(0, 20));

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function testConnection() {
  try {
    console.log('\n1. Testing simple SELECT 1...');
    const result1 = await client.execute('SELECT 1 as test');
    console.log('✅ SELECT 1 OK:', result1.rows);

    console.log('\n2. Testing SELECT from users...');
    const result2 = await client.execute('SELECT COUNT(*) as count FROM users');
    console.log('✅ Users count:', result2.rows);

    console.log('\n3. Testing specific user...');
    const result3 = await client.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: ['admin']
    });
    console.log('✅ Admin user:', result3.rows[0]);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  }
}

testConnection();
