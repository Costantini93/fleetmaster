const https = require('https');
const http = require('http');
const url = require('url');

const dbUrl = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

console.log('=== TURSO DEBUG TEST ===');
console.log('Database URL:', dbUrl);
console.log('Token present:', !!token);
console.log('Token length:', token?.length);

// Parse URL
const parsedUrl = new URL(dbUrl);
console.log('\nParsed URL:');
console.log('- Protocol:', parsedUrl.protocol);
console.log('- Hostname:', parsedUrl.hostname);
console.log('- Port:', parsedUrl.port || 'default');

// Test 1: DNS Resolution
console.log('\n=== TEST 1: DNS Resolution ===');
const dns = require('dns');
dns.resolve4(parsedUrl.hostname, (err, addresses) => {
  if (err) {
    console.error('❌ DNS Resolution failed:', err.message);
  } else {
    console.log('✅ DNS Resolution OK:', addresses);
  }
});

// Test 2: HTTP Connection
console.log('\n=== TEST 2: HTTP Connection Test ===');
const testUrl = `${dbUrl.replace('libsql://', 'https://')}/v2/pipeline`;

https.get(testUrl, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data.substring(0, 200));
  });
}).on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

// Test 3: Using @libsql/client
console.log('\n=== TEST 3: @libsql/client Test ===');
setTimeout(async () => {
  try {
    const { createClient } = require('@libsql/client');
    const client = createClient({
      url: dbUrl,
      authToken: token
    });
    
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ @libsql/client OK:', result.rows);
  } catch (error) {
    console.error('❌ @libsql/client Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Status:', error.cause?.status);
  }
}, 2000);
