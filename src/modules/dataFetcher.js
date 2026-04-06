export function cleanPlayerTag(tagInput = '') {
  const normalized = String(tagInput).trim().toUpperCase();
  if (!normalized) {
    return '';
  }

  return normalized.startsWith('#') ? normalized : `#${normalized}`;
}

export async function getPlayerStats(userInputTag) {
  const cleanTag = cleanPlayerTag(userInputTag);
  if (!cleanTag) {
    throw new Error('Please enter a valid player tag.');
  }

  const response = await fetch(`/api/player?tag=${encodeURIComponent(cleanTag)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Player not found or invalid tag.');
  }

  return payload;
}
