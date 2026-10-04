export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY non configurata su Vercel.' });
    }

    const { messages = [], system = '' } = req.body || {};
    const safeMessages = [];

    if (system) safeMessages.push({ role: 'system', content: String(system) });

    for (const m of messages) {
      if (!m || !m.content) continue;
      safeMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content)
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b',
        messages: safeMessages,
        max_tokens: 2500,
        temperature: 0.4
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq chat error:', groqRes.status, data);
      return res.status(groqRes.status).json({
        error: data?.error?.message || `Groq HTTP ${groqRes.status}`
      });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'Groq non ha restituito una risposta valida.' });

    return res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Errore interno.' });
  }
}
