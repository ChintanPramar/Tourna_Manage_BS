import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export let supabase = null;

export async function initSupabase() {
  if (supabase) return supabase;

  const configResponse = await fetch('/api/config');
  const config = await configResponse.json();
  const supabaseUrl = config.supabaseUrl ?? window.__SUPABASE_URL__ ?? '';
  const supabaseAnonKey = config.supabaseAnonKey ?? window.__SUPABASE_ANON_KEY__ ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration.');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  return supabase;
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
