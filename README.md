# Pacto

A quiet, editorial shared-life app — daily check-ins, tasks, reminders, calendar, timetables, and an AI voice assistant — for solo, pair, and crew spaces.

Expo SDK 56 (expo-router) · React Native 0.85 · [Convex](https://convex.dev) backend · OpenAI voice (Whisper + Realtime).

## Develop

```bash
npm install
npx convex dev      # backend (terminal 1)
npx expo start      # app (terminal 2)
```

Native features (push, liquid glass, WebRTC voice, native sign-in) need the dev client: `npx expo run:ios --device`. Web (`npx expo start` → w) is a test surface only.
