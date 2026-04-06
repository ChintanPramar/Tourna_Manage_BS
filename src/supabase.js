import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export let supabase = null;
let appConfig = null;

export async function initSupabase() {
  if (supabase) return supabase;

  const config = await getAppConfig();
  const clean = (value) => String(value ?? '').trim().replace(/^"|"$/g, '');
  const supabaseUrl = clean(config.supabaseUrl ?? window.__SUPABASE_URL__ ?? '');
  const supabaseAnonKey = clean(config.supabaseAnonKey ?? window.__SUPABASE_ANON_KEY__ ?? '');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local (or NEXT_PUBLIC_/VITE_ variants), then restart vercel dev.');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  return supabase;
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
