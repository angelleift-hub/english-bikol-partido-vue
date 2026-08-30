# English–Bikol Partido Translator

A Vue 3 + Vite migration of the original static translator interface.

## Included

- English → Bikol Partido direction
- Bikol Partido → English direction selector and swap button
- Responsive desktop and mobile layout
- Loading, empty, error, source, alternative, and review states
- A translation service layer ready for a Python API
- A small set of validated prototype phrases for UI testing before the API is connected

## Run locally

```bash
npm install
npm run dev
```

## Connect the translation backend

1. Copy `.env.example` to `.env`.
2. Set `VITE_TRANSLATION_API_URL` to the Python API base URL.
3. The frontend sends this request to `POST /translate`:

```json
{
  "text": "I work",
  "direction": "en-bikol",
  "dialect": "partido"
}
```

Expected response:

```json
{
  "translation": "nagtrabaho ako",
  "source": "validated_translation_memory",
  "review_recommended": false,
  "alternatives": []
}
```

The reverse direction uses `"direction": "bikol-en"`. A separate reverse translation memory and model are still required for unrestricted Bikol → English translation.
