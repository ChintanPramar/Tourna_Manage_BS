const CATEGORIES = ['Pro', 'Semi-Pro', 'Casual'];

export function initAdminDashboard({ getClient, getConfig, notify }) {
  const loginForm = document.getElementById('adminLoginForm');
  const passwordInput = document.getElementById('adminPasswordInput');
  const gatedPanel = document.getElementById('adminPanel');
  const playersList = document.getElementById('adminPlayersList');

  let unlocked = false;

  async function loadPlayers() {
    if (!unlocked) return;
    const client = await getClient();
    const { data, error } = await client.from('players').select('*').order('name', { ascending: true });
    if (error) {
      notify(error.message, 'error');
      return;
    }

    playersList.innerHTML = '';
    if (!data?.length) {
      playersList.innerHTML = '<p class="text-slate-300">No registered players yet.</p>';
      return;
    }

    data.forEach((player) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'border-4 border-black rounded-2xl bg-white/80 text-slate-900 p-3 flex items-center justify-between gap-3';

      const left = document.createElement('div');
      left.innerHTML = `<p class="font-bold">${player.name}</p><p class="text-xs">${player.brawl_tag ?? ''} · ${player.trophies ?? 0} trophies</p>`;

      const select = document.createElement('select');
      select.className = 'px-3 py-2 rounded-xl border-4 border-black bg-yellow-300 font-bold';
      CATEGORIES.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        if ((player.role ?? 'Casual') === category) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', async () => {
        const { error: updateError } = await client.from('players').update({ role: select.value }).eq('id', player.id);
        if (updateError) {
          notify(updateError.message, 'error');
          return;
        }
        notify(`${player.name} moved to ${select.value}.`, 'ok');
        document.dispatchEvent(new CustomEvent('players:updated'));
      });

      wrapper.appendChild(left);
      wrapper.appendChild(select);
      playersList.appendChild(wrapper);
    });
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const config = await getConfig();
    const adminPassword = config.adminDashboardPassword ?? '';
    if (!adminPassword) {
      notify('Set ADMIN_DASHBOARD_PASSWORD in environment first.', 'error');
      return;
    }

    if (passwordInput.value !== adminPassword) {
      notify('Incorrect admin password.', 'error');
      return;
    }

    unlocked = true;
    gatedPanel.classList.remove('hidden');
    notify('Admin dashboard unlocked.', 'ok');
    await loadPlayers();
  });

  document.addEventListener('players:updated', loadPlayers);
}
