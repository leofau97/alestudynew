export const config = { runtime: 'nodejs' };

const SYSTEM = `Sei AleStudy AI, un assistente didattico italiano. Aiuta l'utente a studiare in modo chiaro, rigoroso e pratico. Se l'utente fornisce materiale, non inventare informazioni che non sono supportate dal materiale. Distingui sempre ciò che deriva dal materiale da eventuali conoscenze generali. Per interrogazioni fai una domanda alla volta. Per quiz crea domande coerenti con l'argomento e indica le risposte solo quando richiesto. Rispondi in italiano salvo richiesta diversa.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY non configurata su Vercel.' });
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const clean = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 30000) }));
    if (!clean.length) return res.status(400).json({ error: 'Nessun messaggio ricevuto.' });

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-6-luna',
        instructions: SYSTEM,
        input: clean
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Errore OpenAI.' });
    return res.status(200).json({ content: data.output_text || '' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Errore del server.' });
  }
}
