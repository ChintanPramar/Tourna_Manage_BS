# Tourna_Manage_BS

Brawl Stars club management website with:
- Player registration by Brawl tag (Brawl Stars API via secure backend proxy)
- Admin category management (Pro / Semi-Pro / Casual)
- Category-based spinner wheel
- Tournament feed (Upcoming / Current / Previous)

## Project Structure
- [index.html](index.html) UI shell
- [src/app.js](src/app.js) app bootstrap
- [src/modules](src/modules) feature modules
- [api](api) serverless routes (`config`, `player`, `brawl-player`)
- [supabase/schema.sql](supabase/schema.sql) database schema
- [prisma/schema.prisma](prisma/schema.prisma) Prisma datasource config

## Setup
1. Install dependencies:
	- `npm install`
2. Create `.env.local` (use [`.env.example`](.env.example) as template).
3. Required server env:
	- `BRAWL_STARS_API_KEY=...`
4. Apply DB schema from [supabase/schema.sql](supabase/schema.sql) in Supabase SQL Editor.
5. Start dev server:
	- `npm run dev`

## Security: Secret Rotation Checklist
If any `.env` values are exposed, rotate immediately in this order:
1. Supabase
	- Rotate database password (update `DATABASE_URL` and `DIRECT_URL`).
	- Rotate project API keys/JWT in Supabase dashboard (update `SUPABASE_ANON_KEY`).
2. Brawl Stars / RoyaleAPI proxy
	- Revoke old API key, create a new one, update `BRAWL_STARS_API_KEY`.
3. Vercel
	- Replace all affected environment variables in project settings.
	- Redeploy after updating env values.

## Notes
- Frontend fetches player data from local endpoint `/api/player`; backend forwards to `bsproxy.royaleapi.dev` using `BRAWL_STARS_API_KEY`.
- Use Node 20 LTS on Windows for best compatibility with `vercel dev`.
- Tailwind CDN in `index.html` is fine for dev, but use Tailwind CLI/PostCSS for production builds.
