module.exports = async function handler(req, res) {
  try {
    const rawTag = String(req.query?.tag ?? '').trim().toUpperCase();
    if (!rawTag) {
      return res.status(400).json({ error: 'Player tag is required.' });
    }

    // Normalize to RoyaleAPI path format: %23PLAYER
    const normalizedTag = rawTag.replace(/^(%23|#)+/i, '');
    const cleanTag = `%23${normalizedTag}`;

    const apiKey = process.env.BRAWL_STARS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing BRAWL_STARS_API_KEY.' });
    }

    const upstreamResponse = await fetch(`https://bsproxy.royaleapi.dev/v1/players/${cleanTag}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const rawBody = await upstreamResponse.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { message: rawBody };
    }

    if (upstreamResponse.status === 404) {
      return res.status(404).json({ error: 'Player not found or invalid tag.' });
    }

    if (!upstreamResponse.ok) {
      return res.status(500).json({
        error: payload?.reason ?? payload?.message ?? 'Failed to fetch player data.',
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message ?? 'Unexpected server error.' });
  }
};

