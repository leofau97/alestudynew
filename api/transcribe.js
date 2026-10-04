import Busboy from 'busboy';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };

// Vercel Functions have a request-payload limit. This version keeps the upload
// safely below the common 4.5 MB limit; direct storage can be added later for
// very long university recordings. xAI itself supports files up to 500 MB.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_FILE_SIZE } });
    let fileBuffer = null;
    let filename = 'audio';
    let mime = 'application/octet-stream';
    let tooLarge = false;
    let foundFile = false;

    bb.on('file', (_field, file, info) => {
      foundFile = true;
      filename = info.filename || filename;
      mime = info.mimeType || mime;
      const chunks = [];
      file.on('data', d => chunks.push(d));
      file.on('limit', () => { tooLarge = true; });
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('error', reject);
    bb.on('finish', () => resolve({ fileBuffer, filename, mime, tooLarge, foundFile }));
    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito.' });
  try {
    if (!process.env.XAI_API_KEY) return res.status(500).json({ error: 'XAI_API_KEY non configurata su Vercel.' });

    const { fileBuffer, filename, mime, tooLarge, foundFile } = await parseMultipart(req);
    if (tooLarge) return res.status(413).json({ error: 'Il file supera 4 MB in questa prima versione. Per registrazioni lunghe va aggiunto un upload diretto allo storage.' });
    if (!foundFile || !fileBuffer?.length) return res.status(400).json({ error: 'Nessun file audio ricevuto.' });

    const form = new FormData();
    // xAI requires the file field to be the last multipart field.
    form.append('format', 'true');
    form.append('language', 'it');
    form.append('file', new Blob([fileBuffer], { type: mime }), filename);

    const r = await fetch('https://api.x.ai/v1/stt', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}` },
      body: form
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Errore nella trascrizione Grok.' });

    return res.status(200).json({
      text: data?.text || '',
      duration: data?.duration || null,
      language: data?.language || 'Italian',
      words: Array.isArray(data?.words) ? data.words : [],
      model: 'grok-voice-transcribe-2.0'
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Errore del server.' });
  }
}
