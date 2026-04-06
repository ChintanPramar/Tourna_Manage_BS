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
      localUrl = clean(window.localStorage?.getItem('SUPABASE_URL'));
      localKey = clean(window.localStorage?.getItem('SUPABASE_ANON_KEY'));
    } catch {
      localUrl = '';
      localKey = '';
    }

    const supabaseUrl =
      clean(config.supabaseUrl) ||
      clean(window.__SUPABASE_URL__) ||
      clean(window.__NEXT_PUBLIC_SUPABASE_URL__) ||
      clean(window.__VITE_SUPABASE_URL__) ||
      localUrl;

    const supabaseAnonKey =
      clean(config.supabaseAnonKey) ||
      clean(window.__SUPABASE_ANON_KEY__) ||
      clean(window.__NEXT_PUBLIC_SUPABASE_ANON_KEY__) ||
      clean(window.__VITE_SUPABASE_ANON_KEY__) ||
      localKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel project env (or pass via query/localStorage), then redeploy/restart.');
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
      appConfig = {};
      return appConfig;
    }
    appConfig = await configResponse.json();
  } catch {
    appConfig = {};
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
