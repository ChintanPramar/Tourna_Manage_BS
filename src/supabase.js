import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export let supabase = null;
let appConfig = null;
let supabaseInitPromise = null;

export async function initSupabase() {
  if (supabase) return supabase;
  if (supabaseInitPromise) return supabaseInitPromise;

  supabaseInitPromise = (async () => {
    const config = await getAppConfig();
    const clean = (value) => String(value ?? '').trim().replace(/^"|"$/g, '');

    let localUrl = '';
    let localKey = '';
    try {
      localUrl =
        clean(window.localStorage?.getItem('SUPABASE_URL')) ||
        clean(window.localStorage?.getItem('SUPABASE_PROJECT_URL'));
      localKey =
        clean(window.localStorage?.getItem('SUPABASE_ANON_KEY')) ||
        clean(window.localStorage?.getItem('SUPABASE_PUBLISHABLE_KEY'));
    } catch {
      localUrl = '';
      localKey = '';
    }

    const supabaseUrl =
      clean(config.supabaseUrl) ||
      clean(window.__SUPABASE_URL__) ||
      clean(window.__SUPABASE_PROJECT_URL__) ||
      clean(window.__NEXT_PUBLIC_SUPABASE_URL__) ||
      clean(window.__NEXT_PUBLIC_SUPABASE_PROJECT_URL__) ||
      clean(window.__VITE_SUPABASE_URL__) ||
      clean(window.__VITE_SUPABASE_PROJECT_URL__) ||
      localUrl;

    const supabaseAnonKey =
      clean(config.supabaseAnonKey) ||
      clean(window.__SUPABASE_ANON_KEY__) ||
      clean(window.__SUPABASE_PUBLISHABLE_KEY__) ||
      clean(window.__NEXT_PUBLIC_SUPABASE_ANON_KEY__) ||
      clean(window.__NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY__) ||
      clean(window.__VITE_SUPABASE_ANON_KEY__) ||
      clean(window.__VITE_SUPABASE_PUBLISHABLE_KEY__) ||
      localKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      const apiConfigDebug = config.configStatus
        ? ` /api/config status: url=${config.configStatus.hasSupabaseUrl}, key=${config.configStatus.hasSupabaseAnonKey}`
        : '';
      throw new Error(
        `Missing Supabase configuration. Set SUPABASE_URL (or SUPABASE_PROJECT_URL) and SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) in Vercel env, then redeploy/restart.${apiConfigDebug}`,
      );
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    return supabase;
  })();

  try {
    return await supabaseInitPromise;
  } finally {
    supabaseInitPromise = null;
  }
}

export async function getAppConfig() {
  if (appConfig) return appConfig;
  try {
    const configResponse = await fetch('/api/config');
    if (!configResponse.ok) {
      appConfig = { configStatus: { configEndpointError: `HTTP ${configResponse.status}` } };
      return appConfig;
    }
    appConfig = await configResponse.json();
  } catch (error) {
    appConfig = { configStatus: { configEndpointError: error?.message ?? 'Network error' } };
  }
  return appConfig;
}

export const BRAWLERS = ['Frank', 'Hank', 'Edgar'];
export const ROLES = {
  PRO: 'Pro',
  SEMI_PRO: 'Semi-Pro',
  CASUAL: 'Casual',
};

export function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function poolNameFromIndex(index) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return `Pool ${alphabet[index] ?? index + 1}`;
}
