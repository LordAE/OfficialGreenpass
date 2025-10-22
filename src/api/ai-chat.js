// api/ai-chat.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Accept either { messages:[...], system } or { prompt, system }
    let body = req.body;
    // Some dev servers pass a string body; try to parse
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const {
      messages,
      prompt,
      system = 'You are GreenPass AI support. Be concise, helpful, and friendly.',
      model = 'gpt-4o-mini',
      temperature = 0.3
    } = body || {};

    const chatMessages = Array.isArray(messages) && messages.length
      ? messages
      : [{ role: 'user', content: String(prompt || '').trim() }];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          ...chatMessages
        ]
      })
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return res.status(r.status).json({ error: errTxt || 'OpenAI error' });
    }
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error('ai-chat error', e);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
