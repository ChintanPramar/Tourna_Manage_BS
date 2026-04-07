const fs = require('fs');
const path = require('path');

function readEnvFileValue(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const line = content
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));

    if (!line) return '';

    return line
      .slice(key.length + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  } catch {
    return '';
  }
}

function firstNonEmpty(values) {
  for (const value of values) {
    const clean = String(value ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (clean) return clean;
  }
  return '';
}

module.exports = function handler(req, res) {
  const projectRoot = path.resolve(__dirname, '..');
  const envFile = path.join(projectRoot, '.env.local');
  const supabaseUrl = firstNonEmpty([
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PROJECT_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PROJECT_URL,
    readEnvFileValue(envFile, 'SUPABASE_URL'),
    readEnvFileValue(envFile, 'SUPABASE_PROJECT_URL'),
    readEnvFileValue(envFile, 'NEXT_PUBLIC_SUPABASE_URL'),
    readEnvFileValue(envFile, 'NEXT_PUBLIC_SUPABASE_PROJECT_URL'),
    readEnvFileValue(envFile, 'VITE_SUPABASE_URL'),
    readEnvFileValue(envFile, 'VITE_SUPABASE_PROJECT_URL'),
  ]);

  const supabaseAnonKey = firstNonEmpty([
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    readEnvFileValue(envFile, 'SUPABASE_ANON_KEY'),
    readEnvFileValue(envFile, 'SUPABASE_PUBLISHABLE_KEY'),
    readEnvFileValue(envFile, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    readEnvFileValue(envFile, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    readEnvFileValue(envFile, 'VITE_SUPABASE_ANON_KEY'),
    readEnvFileValue(envFile, 'VITE_SUPABASE_PUBLISHABLE_KEY'),
  ]);

  const adminDashboardPassword = firstNonEmpty([
    process.env.ADMIN_DASHBOARD_PASSWORD,
    readEnvFileValue(envFile, 'ADMIN_DASHBOARD_PASSWORD'),
  ]);

  const configStatus = {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
    hasAdminDashboardPassword: Boolean(adminDashboardPassword),
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    adminDashboardPassword,
    configStatus,
  });
};
