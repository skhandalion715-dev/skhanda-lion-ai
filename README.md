# Skhanda Lion AI

A simple, professional, dependency-free AI companion interface with a warm, patient personality.

## Run it

From this directory, start any static web server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Included

- Warm, responsive chat interface for desktop and mobile
- Friendly local conversation engine with supportive, planning, teaching and advice modes
- Browser-local “remember that…” memory with a review and clear screen
- Optional browser text-to-speech replies
- Light/dark theme toggle
- No credit meters, payments, or usage gating
- Safety-minded crisis response for urgent self-harm language

## Connecting a real model

This version is intentionally runnable without an API key or paid service. The response engine in `app.js` is a front-end demo. For production intelligence, replace `generateReply()` in `handleSubmit()` with a call to your own server-side `/api/chat` endpoint. Keep provider keys on the server, not in the browser, and retain the same calm, personal system prompt and safety behavior.
