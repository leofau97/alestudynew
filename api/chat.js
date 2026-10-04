const SYSTEM = `Sei AleStudy AI, l'assistente personale per lo studio basato su Grok di xAI. Rispondi in italiano salvo richiesta diversa. Sii chiaro, preciso e utile. Se l'utente fornisce materiale di studio, non inventare informazioni non supportate dal materiale: distingui ciò che deriva dal materiale dalle conoscenze generali. Per quiz e interrogazioni mantieni un livello coerente con la richiesta; per l'interrogazione fai una domanda alla volta. Puoi aiutare con spiegazioni, riassunti, quiz, flashcard, piani di studio e analisi di trascrizioni.`;

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });

  try {
    const key = process.env.GROK_API_KEY;
    if (!key) return res.status(500).json({ error: 'GROK_API_KEY non configurata nel deployment Vercel.' });

    const body = req.body || {};
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages = incoming
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 30000) }));

    if (!messages.length) return res.status(400).json({ error: 'Nessun messaggio ricevuto.' });

    const response = await fetch('https://api.grok-api.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROK_CHAT_MODEL || 'grok-4.7',
        messages: [{ role: 'system', content: SYSTEM }, ...messages],
        temperature: 0.2,
        stream: false
      })
    });

    const raw = await response.text();
    let data = {};
    try { data = JSON.parse(raw); } catch {}

    if (!response.ok) {
      const apiMessage = data?.error?.message || data?.error || raw || `HTTP ${response.status}`;
      return res.status(response.status).json({
        error: `GrokAPI (${response.status}): ${String(apiMessage).slice(0, 1000)}`
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(502).json({ error: 'GrokAPI ha risposto senza testo.' });
    }

    return res.status(200).json({
      content: content.trim(),
      model: data?.model || process.env.GROK_CHAT_MODEL || 'grok-4.7'
    });
  } catch (e) {
    return res.status(500).json({ error: `Errore server AleStudy: ${e?.message || 'errore sconosciuto'}` });
  }
}
