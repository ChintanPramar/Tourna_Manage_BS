function normalizeStatus(row) {
  if (row.status) return String(row.status).toLowerCase();

  const now = new Date();
  const start = row.start_at ? new Date(row.start_at) : null;
  const end = row.end_at ? new Date(row.end_at) : null;

  if (start && now < start) return 'upcoming';
  if (start && end && now >= start && now <= end) return 'current';
  return 'previous';
}

export function initTournamentFeed({ getClient, notify }) {
  const sections = {
    upcoming: document.getElementById('tournamentsUpcoming'),
    current: document.getElementById('tournamentsCurrent'),
    previous: document.getElementById('tournamentsPrevious'),
  };

  function renderCard(row) {
    return `
      <article class="border-4 border-black rounded-2xl bg-white p-4 text-slate-900 shadow-[0_4px_0_#111]">
        <p class="font-black text-lg">${row.title ?? 'Untitled Tournament'}</p>
        <p class="text-sm">Mode: ${row.mode ?? 'N/A'}</p>
        <p class="text-sm">Start: ${row.start_at ? new Date(row.start_at).toLocaleString() : 'TBA'}</p>
        <p class="text-sm">End: ${row.end_at ? new Date(row.end_at).toLocaleString() : 'TBA'}</p>
      </article>
    `;
  }

  async function loadFeed() {
    const client = await getClient();
    const { data, error } = await client.from('tournaments').select('*').order('start_at', { ascending: false });
    if (error) {
      notify(error.message, 'error');
      return;
    }

    Object.values(sections).forEach((section) => {
      section.innerHTML = '<p class="text-slate-300">No tournaments found.</p>';
    });

    if (!data?.length) return;

    const grouped = { upcoming: [], current: [], previous: [] };
    data.forEach((row) => {
      const status = normalizeStatus(row);
      if (grouped[status]) grouped[status].push(row);
    });

    Object.entries(grouped).forEach(([status, rows]) => {
      const section = sections[status];
      section.innerHTML = rows.length
        ? rows.map(renderCard).join('')
        : '<p class="text-slate-300">No tournaments found.</p>';
    });
  }

  document.getElementById('refreshTournamentFeedBtn')?.addEventListener('click', loadFeed);
  loadFeed();
}
