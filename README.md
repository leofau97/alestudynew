# AleStudy — versione completa Groq

Questa versione parte dal tuo `index.html` originale e mantiene le funzionalità esistenti.

## Funzioni integrate

- AleStudy AI con chat Groq
- pulsanti Spiegami / Fammi un quiz / Interrogami / Scheda di studio
- trascrizione audio con Groq Whisper Large V3 Turbo
- collegamento della trascrizione alla chat AI
- Solitario Klondike funzionante
- tutte le funzioni già presenti nell'app originale

## Vercel

Variabile obbligatoria:

GROQ_API_KEY

Opzionali:

GROQ_CHAT_MODEL=openai/gpt-oss-120b
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo

Non inserire mai la chiave nell'HTML.

## Nota trascrizione

I file piccoli vengono inviati direttamente. Per file più grandi, l'interfaccia prova a convertirli in WAV mono 16 kHz e li divide automaticamente in segmenti da 60 secondi, così da evitare richieste troppo grandi al serverless endpoint.
