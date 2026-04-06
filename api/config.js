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

module.exports = function handler(req, res) {
  const projectRoot = path.resolve(__dirname, '..');
  const envFile = path.join(projectRoot, '.env.local');
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    readEnvFileValue(envFile, 'SUPABASE_URL') ??
    '';

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    readEnvFileValue(envFile, 'SUPABASE_ANON_KEY') ??
    '';

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
  });
};
