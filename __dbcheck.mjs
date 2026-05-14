import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgres://postgres.jqltcnuxpmeckezoypfm:NFM3KJJzS2DxmIg6@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true',
  connectionTimeoutMillis: 10000,
  max: 1,
});
try {
  const users = await pool.query('SELECT id, email, status, password_hash IS NOT NULL AS has_password FROM users');
  console.log('Users count:', users.rows.length);
  for (const u of users.rows) console.log(' -', u.email, '| status:', u.status, '| has_password:', u.has_password);
  
  if (users.rows.length > 0) {
    const u = users.rows[0];
    const pass = await pool.query('SELECT password_hash FROM users WHERE id = $1', [u.id]);
    console.log('First user password_hash length:', pass.rows[0].password_hash?.length);
  }
  
  await pool.end();
} catch (e) {
  console.error('ERROR:', e.message);
  await pool.end();
  process.exit(1);
}
