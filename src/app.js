import { getAppConfig, initSupabase, supabase } from './supabase.js';
import { initRegistration } from './modules/registration.js';
import { initAdminDashboard } from './modules/adminDashboard.js';
import { initWheel } from './modules/wheel.js';
import { initTournamentFeed } from './modules/tournamentFeed.js';

const notice = document.getElementById('notice');

function showNotice(message, type = 'ok') {
  if (!notice) return;
  notice.textContent = message;
  notice.className = type === 'error'
    ? 'rounded-2xl border-4 border-black bg-red-400 text-black px-4 py-3 font-bold'
    : 'rounded-2xl border-4 border-black bg-green-300 text-black px-4 py-3 font-bold';
}

async function getClient() {
  if (!supabase) {
    await initSupabase();
  }
  return supabase;
}

function wireTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  const sections = document.querySelectorAll('[data-section]');

  function setTab(tab) {
    sections.forEach((section) => section.classList.toggle('hidden', section.dataset.section !== tab));
    tabs.forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('bg-yellow-300', active);
      btn.classList.toggle('bg-blue-300', !active);
    });
  }

  tabs.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  setTab('registration');
}

async function bootstrap() {
  wireTabs();

  initRegistration({
    getClient,
    notify: showNotice,
  });

  initAdminDashboard({
    getClient,
    getConfig: getAppConfig,
    notify: showNotice,
  });

  initWheel({
    getClient,
    notify: showNotice,
  });

  initTournamentFeed({
    getClient,
    notify: showNotice,
  });

  showNotice('Modules ready. Register players to begin.', 'ok');
}

bootstrap().catch((error) => showNotice(error.message, 'error'));
