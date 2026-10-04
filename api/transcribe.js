import Busboy from 'busboy';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 25 * 1024 * 1024 } });
    let fileBuffer = null;
    let filename = 'audio';
    let mime = 'application/octet-stream';
    let tooLarge = false;
    bb.on('file', (_field, file, info) => {
      filename = info.filename || filename;
      mime = info.mimeType || mime;
      const chunks = [];
      file.on('data', d => chunks.push(d));
      file.on('limit', () => { tooLarge = true; });
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('error', reject);
    bb.on('finish', () => resolve({ fileBuffer, filename, mime, tooLarge }));
    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY non configurata su Vercel.' });
    const { fileBuffer, filename, mime, tooLarge } = await parseMultipart(req);
    if (tooLarge) return res.status(413).json({ error: 'Il file supera il limite di 25 MB.' });
    if (!fileBuffer?.length) return res.status(400).json({ error: 'Nessun file audio ricevuto.' });

    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: mime }), filename);
    form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
    form.append('response_format', 'json');
    form.append('language', 'it');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Errore nella trascrizione OpenAI.' });
    return res.status(200).json({ text: data.text || '' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Errore del server.' });
  }
}
