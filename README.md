# De Ruwe Steen

Sprint 1 foundation van de 365-daagse PWA voor reflectie binnen de leerlinggraad.

## Tech stack

- React + TypeScript (strict)
- Vite
- React Router
- Tailwind CSS
- TanStack Query
- Supabase client
- Vite PWA plugin
- Three.js + React Three Fiber + Drei (voor Sprint 3)

## Starten

1. Installeer dependencies:

```bash
npm install
```

2. Maak je lokale environment:

```bash
cp .env.example .env
```

3. Vul je Supabase variabelen in `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Start development server:

```bash
npm run dev
```

## Scripts

- `npm run dev`: development server
- `npm run build`: typecheck + production build
- `npm run typecheck`: TypeScript checks
- `npm run lint`: Oxlint
- `npm run check`: typecheck + lint
- `npm run preview`: lokale preview van build output

## Huidige scope (Sprint 1)

- Basisrouting en layout voor:
  - Home
  - Dagelijkse vraag
  - Antwoord
  - Mijn Steen
  - Voortgang
- PWA manifest en service worker basis
- Supabase client bootstrap via environment variables
- Visuele fundering in de gewenste rustige, donkere, klassieke stijl

## Volgende stap

Sprint 2: Supabase schema + migraties + auth flow + eerste echte dagvraagselectie op basis van fase en dag.
