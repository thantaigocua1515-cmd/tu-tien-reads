# Tu Tiên Reads

A cultivation-themed novel platform built with React, Tailwind CSS, Supabase, and Vercel serverless APIs.

## Features
- Supabase Auth: signup/login
- Novel reading UI with chapter list and dark mode
- Cultivation realm progression + XP/Qi tracking
- Spirit Stones shop and purchases
- Profile dashboard + equipped items
- Admin panel for user and shop management
- OpenAPI story discovery with fallbacks

## Setup
1. Run the SQL migration in Supabase SQL editor.
2. Create a storage bucket named `avatars`.
3. Copy `.env.example` to `.env` and fill in values.
4. Install dependencies:

```bash
npm install
```

## Run locally
```bash
npm run dev
```

Open:
```text
http://localhost:5173
```

## Build production
```bash
npm run build
```

## Deploy to Vercel
1. Push repo to GitHub.
2. Import project into Vercel.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Admin user
Email configured:
```text
khangitvns123@gmail.com
```

To assign admin role via service key:
```bash
node scripts/setup-admin.mjs
```

## Notes
- API endpoints are stored under `api/` for secure Vercel serverless operations.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Never expose it in the browser or public repo.
