import { getPlayerStats } from './dataFetcher.js';

export function initRegistration({ getClient, notify }) {
  const form = document.getElementById('registrationForm');
  const tagInput = document.getElementById('playerTagInput');
  const preview = document.getElementById('playerPreview');
  const confirmBtn = document.getElementById('confirmRegistrationBtn');

  let previewData = null;

  function formatPlayerTag(tag) {
    const normalized = String(tag ?? '').trim().toUpperCase();
    if (!normalized) {
      return '';
    }

    return normalized.startsWith('#') ? normalized : `#${normalized}`;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      previewData = await getPlayerStats(tagInput.value);
      preview.classList.remove('hidden');
      document.getElementById('previewName').textContent = previewData.name ?? 'Unknown';
      document.getElementById('previewTag').textContent = formatPlayerTag(previewData.tag ?? tagInput.value);
      document.getElementById('previewTrophies').textContent = `${previewData.trophies ?? 0}`;
      document.getElementById('previewClub').textContent = previewData.club?.name ?? 'No club';
      document.getElementById('preview3v3').textContent = `${previewData['3vs3Victories'] ?? 0}`;
      notify('Player verified. Confirm to register.', 'ok');
    } catch (_error) {
      previewData = null;
      preview.classList.add('hidden');
      notify('Player not found or invalid tag.', 'error');
    }
  });

  confirmBtn?.addEventListener('click', async () => {
    if (!previewData) {
      notify('Fetch player data before confirming.', 'error');
      return;
    }

    const client = await getClient();
    const insertPayload = {
      name: previewData.name,
      brawl_tag: formatPlayerTag(previewData.tag ?? tagInput.value),
      trophies: previewData.trophies ?? 0,
      role: 'Casual',
      available: true,
      mvp_eligible: false,
    };

    const { error } = await client.from('players').insert(insertPayload);
    if (error) {
      notify(error.message, 'error');
      return;
    }

    notify('Player registered successfully.', 'ok');
    preview.classList.add('hidden');
    tagInput.value = '';
    previewData = null;
    document.dispatchEvent(new CustomEvent('players:updated'));
  });
}
