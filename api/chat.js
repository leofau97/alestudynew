const SYSTEM = `Sei AleStudy AI, l'assistente personale per lo studio basato su Grok di xAI. Rispondi in italiano salvo richiesta diversa. Sii chiaro, preciso e utile. Se l'utente fornisce materiale di studio, non inventare informazioni non supportate dal materiale: distingui ciò che deriva dal materiale dalle conoscenze generali. Per quiz e interrogazioni mantieni un livello coerente con la richiesta; per l'interrogazione fai una domanda alla volta. Puoi aiutare con spiegazioni, riassunti, quiz, flashcard, piani di studio e analisi di trascrizioni.`;

export const config = { runtime: 'nodejs' };

function extractText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const out = Array.isArray(data?.output) ? data.output : [];
  const parts = [];
  for (const item of out) {
    if (Array.isArray(item?.content)) {
      for (const c of item.content) {
        if (typeof c?.text === 'string') parts.push(c.text);
      }
    }
  }
  return parts.join('\n').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });
  try {
    if (!process.env.XAI_API_KEY) return res.status(500).json({ error: 'XAI_API_KEY non configurata su Vercel.' });

    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const clean = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 30000) }));

    if (!clean.length) return res.status(400).json({ error: 'Nessun messaggio ricevuto.' });

    const input = [{ role: 'system', content: SYSTEM }, ...clean];
    const r = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.XAI_CHAT_MODEL || 'grok-4.7',
        input,
        temperature: 0.2
      })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Errore Grok.' });

    return res.status(200).json({
      content: extractText(data) || 'Non ho ricevuto una risposta.',
      model: process.env.XAI_CHAT_MODEL || 'grok-4.7'
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Errore del server.' });
  }
}
