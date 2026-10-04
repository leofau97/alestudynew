# AleStudy + Groq — versione completa

Include:
- AleStudy AI con Groq (`openai/gpt-oss-120b`)
- materiali di studio: PDF/TXT/MD/CSV/JSON letti nel browser e usabili come contesto
- trascrizione audio con Groq Whisper (`whisper-large-v3-turbo`)
- ricerca web tramite Groq Browser Search, con fonti restituite dall'API
- ricerca diretta su PubMed/NCBI tramite E-utilities e sintesi degli abstract
- Solitario Klondike e tutte le funzioni già presenti in AleStudy

## Vercel

Necessaria:
`GROQ_API_KEY`

Opzionali:
`GROQ_CHAT_MODEL` (default `openai/gpt-oss-120b`)
`GROQ_TRANSCRIBE_MODEL` (default `whisper-large-v3-turbo`)
`NCBI_EMAIL` (opzionale, utile per identificare il client nelle richieste NCBI)

La chiave Groq resta esclusivamente lato server.
