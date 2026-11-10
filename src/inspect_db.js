import pg from 'pg';

async function testIpv6() {
  const client = new pg.Client({
    host: '2a05:d018:8eb:2f00:56d8:3433:6829:49c5',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'What610Bot!',
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to IPv6...');
    await client.connect();
    console.log('CONNECTED VIA IPV6!');
    const res = await client.query('SELECT current_database(), version()');
    console.log('DB:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('IPv6 connect error:', err.message);
    try { await client.end(); } catch {}
  }
}

testIpv6();
