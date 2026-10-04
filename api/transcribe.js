import formidable from 'formidable';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY non configurata su Vercel.' });
  }

  try {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploaded) return res.status(400).json({ error: 'File audio mancante.' });

    const filePath = uploaded.filepath || uploaded.path;
    const buffer = await fs.readFile(filePath);
    const filename = uploaded.originalFilename || 'audio.wav';
    const mime = uploaded.mimetype || 'audio/wav';

    const fd = new FormData();
    fd.append('file', new Blob([buffer], { type: mime }), filename);
    fd.append('model', process.env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo');
    fd.append('language', String(Array.isArray(fields.language) ? fields.language[0] : (fields.language || 'it')));
    fd.append('prompt', String(Array.isArray(fields.prompt) ? fields.prompt[0] : (fields.prompt || 'Lezione universitaria in italiano.')));
    fd.append('response_format', 'json');
    fd.append('temperature', '0');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: fd,
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq transcription error:', groqRes.status, data);
      return res.status(groqRes.status).json({
        error: data?.error?.message || `Groq HTTP ${groqRes.status}`
      });
    }

    return res.status(200).json({ text: data?.text || '' });
  } catch (e) {
    console.error('Transcription error:', e);
    return res.status(500).json({ error: e?.message || 'Errore nella trascrizione.' });
  }
}
