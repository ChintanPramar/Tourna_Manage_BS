import { fetchBrawlPlayerByTag } from './dataFetcher.js';

export function initRegistration({ getClient, notify }) {
  const form = document.getElementById('registrationForm');
  const tagInput = document.getElementById('playerTagInput');
  const preview = document.getElementById('playerPreview');
  const confirmBtn = document.getElementById('confirmRegistrationBtn');

  let previewData = null;

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      previewData = await fetchBrawlPlayerByTag(tagInput.value);
      preview.classList.remove('hidden');
      document.getElementById('previewName').textContent = previewData.name ?? 'Unknown';
      document.getElementById('previewTag').textContent = `#${previewData.tag ?? ''}`;
      document.getElementById('previewTrophies').textContent = `${previewData.trophies ?? 0}`;
      notify('Player fetched. Confirm to register.', 'ok');
    } catch (error) {
      notify(error.message, 'error');
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
      brawl_tag: `#${previewData.tag}`,
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
