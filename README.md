# Tourna_Manage_BS

Brawl Stars club management website with:
- Player registration by Brawl tag (Brawl API)
- Admin category management (Pro / Semi-Pro / Casual)
- Category-based spinner wheel
- Tournament feed (Upcoming / Current / Previous)

## Project Structure
- [index.html](index.html) UI shell
- [src/app.js](src/app.js) app bootstrap
- [src/modules](src/modules) feature modules
- [api](api) serverless routes (`config`, `brawl-player`)
- [supabase/schema.sql](supabase/schema.sql) database schema
- [prisma/schema.prisma](prisma/schema.prisma) Prisma datasource config

## Setup
1. Install dependencies:
	- `npm install`
2. Create `.env.local` (use [`.env.example`](.env.example) as template).
3. Apply DB schema from [supabase/schema.sql](supabase/schema.sql) in Supabase SQL Editor.
4. Start dev server:
	- `npm run dev`

## Notes
- Use Node 20 LTS on Windows for best compatibility with `vercel dev`.
- Tailwind CDN in `index.html` is fine for dev, but use Tailwind CLI/PostCSS for production builds.
