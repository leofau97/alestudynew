export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { messages = [], system = '' } = req.body || {};
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY non configurata su Vercel.' });
    const groqMessages = [];
    if (system) groqMessages.push({ role: 'system', content: String(system) });
    for (const m of messages) if (m?.content) groqMessages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile', messages: groqMessages, max_tokens: 1200, temperature: 0.7 })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || `Groq HTTP ${r.status}` });
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'Groq non ha restituito una risposta valida.' });
    return res.status(200).json({ reply });
  } catch (e) { return res.status(500).json({ error: e?.message || 'Errore interno del server.' }); }
}
