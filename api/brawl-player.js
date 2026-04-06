module.exports = async function handler(req, res) {
  try {
    const tag = String(req.query?.tag ?? '').trim().replace(/^#/, '').toUpperCase();
    if (!tag) {
      return res.status(400).json({ error: 'Missing player tag.' });
    }

    const response = await fetch(`https://api.brawlapi.com/v1/player?tag=${encodeURIComponent(tag)}`);

    const rawBody = await response.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { message: rawBody };
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: payload?.reason ?? payload?.message ?? 'Brawl API error.' });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message ?? 'Failed to fetch player.' });
  }
};
