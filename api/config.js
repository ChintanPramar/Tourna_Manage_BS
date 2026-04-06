module.exports = function handler(req, res) {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    '';

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    '';

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    adminDashboardPassword: process.env.ADMIN_DASHBOARD_PASSWORD ?? '',
  });
};
