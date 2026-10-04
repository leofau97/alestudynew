export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  return res.status(501).json({ error: 'Trascrizione Groq predisposta ma il parser multipart deve essere collegato prima della produzione.', model: process.env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo' });
}
