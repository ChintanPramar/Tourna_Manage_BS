const DEFAULT_CATEGORY = 'Pro';

export function initWheel({ getClient, notify }) {
  const categorySelect = document.getElementById('wheelCategorySelect');
  const spinBtn = document.getElementById('spinWheelBtn');
  const wheelNames = document.getElementById('wheelNames');
  const wheelContainer = document.getElementById('wheelContainer');
  const popup = document.getElementById('wheelWinnerPopup');
  const popupName = document.getElementById('wheelWinnerName');
  const closePopupBtn = document.getElementById('closeWinnerPopupBtn');

  let candidates = [];

  async function loadCandidates() {
    const client = await getClient();
    const selectedCategory = categorySelect.value || DEFAULT_CATEGORY;
    const { data, error } = await client
      .from('players')
      .select('id,name,role')
      .eq('role', selectedCategory)
      .order('name', { ascending: true });

    if (error) {
      notify(error.message, 'error');
      return;
    }

    candidates = data ?? [];
    wheelNames.innerHTML = '';

    if (!candidates.length) {
      wheelNames.innerHTML = '<p class="font-bold text-slate-700">No players in this category.</p>';
      return;
    }

    candidates.forEach((player) => {
      const badge = document.createElement('span');
      badge.className = 'px-3 py-1 rounded-full border-4 border-black bg-yellow-300 text-slate-900 font-bold';
      badge.textContent = player.name;
      wheelNames.appendChild(badge);
    });
  }

  function openWinnerPopup(name) {
    popupName.textContent = name;
    popup.classList.remove('hidden');
  }

  async function spinWheel() {
    if (!candidates.length) {
      notify('No players to spin in this category.', 'error');
      return;
    }

    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    const randomTurns = 1440 + Math.floor(Math.random() * 1080);
    wheelContainer.style.transform = `rotate(${randomTurns}deg)`;

    setTimeout(() => {
      openWinnerPopup(winner.name);
    }, 2400);
  }

  categorySelect?.addEventListener('change', loadCandidates);
  spinBtn?.addEventListener('click', spinWheel);
  closePopupBtn?.addEventListener('click', () => popup.classList.add('hidden'));
  document.addEventListener('players:updated', loadCandidates);

  loadCandidates();
}
