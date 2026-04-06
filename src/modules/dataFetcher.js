export function cleanPlayerTag(tagInput = '') {
  return tagInput.trim().replace(/^#/, '').toUpperCase();
}

export async function fetchBrawlPlayerByTag(tagInput) {
  const cleanTag = cleanPlayerTag(tagInput);
  if (!cleanTag) {
    throw new Error('Please enter a valid player tag.');
  }

  async function parseResponse(response) {
    const textBody = await response.text();
    try {
      return JSON.parse(textBody);
    } catch {
      return { error: textBody };
    }
  }

  let response = await fetch(`/api/brawl-player?tag=${encodeURIComponent(cleanTag)}`);
  let payload = await parseResponse(response);

  if ((response.status === 404 || response.status === 500) && !response.ok) {
    response = await fetch(`https://api.brawlapi.com/v1/player?tag=${encodeURIComponent(cleanTag)}`);
    payload = await parseResponse(response);
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Failed to fetch Brawl Stars player.');
  }

  return payload;
}
