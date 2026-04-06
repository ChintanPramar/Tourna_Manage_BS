module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL ?? 'https://hvrfeamqhrydjsvuiebh.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cmZlYW1xaHJ5ZGpzdnVpZWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODYxNzcsImV4cCI6MjA5MTA2MjE3N30.W4-GZV6wjaOkNtV4poiER2KvOjPti8MXukI2luuBF30',
  });
};
