export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { niche, type, variation } = req.body;
  if (!niche || !type || !variation) {
    return res.status(400).json({ error: 'Missing fields: ' + JSON.stringify({ niche, type, variation }) });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured in environment variables' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: 'You are an Etsy listing generator. Generate a phone case listing with TITLE, DESCRIPTION and TAGS.',
        messages: [{ role: 'user', content: 'Generate a listing for: ' + niche }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Anthropic error ' + response.status, details: data });
    }

    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'No content in response', data });
    }

    const text = data.content[0].text;
    return res.status(200).json({ title: 'Test OK', description: text.slice(0, 100), tags: 'test tag' });

  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed: ' + err.message });
  }
}
