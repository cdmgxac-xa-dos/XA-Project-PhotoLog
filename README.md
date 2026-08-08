# XA Project PhotoLog — Standalone App

"One Lens, One Data." A dedicated, camera-first companion to XA DOS: open
the app, take a project photo, tag it, submit — no XA DOS login menus in
the way. Reads/writes the same Supabase project as `xadOS-app` (same
`project_photo_updates` table, `project-photos` storage bucket, and
`app_users`/`roles`/`project_team_assignments` for auth and access).

## Local setup

```
npm install
cp .env.example .env.local   # fill in the same VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY as xadOS-app
npm run dev
```

## Deploying

Same as xadOS-app: connect this repo to a new Netlify site, set the build
command (`npm run build`) and publish directory (`dist`) — already
configured via `netlify.toml` — and add the two environment variables in
Netlify's site settings.
