# your-nemt-app

Single user Non-Emergency Medical Transportation (NEMT) management web app.

## Requirements
- Node.js 18+
- PostgreSQL

## Setup
```
npm install
cp .env.example .env
# edit DATABASE_URL and API keys
# For Postgres: npm run db:migrate && npm run seed && npm run dev
# For SQLite fallback on Windows:
#   npx prisma generate --schema prisma/schema.sqlite.prisma
#   node prisma/seed.js
#   npm run dev
```

## Scripts
- `npm run dev` – run Next.js and Express server in dev mode
- `npm run build` – build frontend
- `npm start` – start server and frontend
- `npm test` – no tests yet

## Architecture
- Next.js frontend with Tailwind CSS
- Express backend with Prisma

## Notes
- Upload parsing: Integrated OCR. Images (JPG/PNG) are sent to Google Vision (`VISION_OCR_KEY`) for text; PDFs are parsed locally via `pdf-parse`. Parsed rows are heuristics; you should resolve each student's address via the autocomplete field (uses Maps JS + Places library). On accept, the server creates Students and Trips (including optional times when detected).
- Trip assignment uses Google Distance Matrix when `DM_SERVER_KEY` is set. If unavailable, it falls back to straight-line distance to keep local testing unblocked, and marks the assignment method in `assignment_json`.

### Troubleshooting
- If `prisma db push` fails on SQLite with a schema engine error, skip it and instead run:
  - `npx prisma generate --schema prisma/schema.sqlite.prisma`
  - `node prisma/seed.js`
- If server crashes on startup due to `pdf-parse` trying to read a test file, it's fixed here by importing the core parser directly (`pdf-parse/lib/pdf-parse.js`).

## Local Database
- Preferred: Docker Desktop + Postgres
  1. Install Docker Desktop (Windows) and start it
  2. In repo root: `docker compose up -d`
  3. Ensure `.env` has a Postgres `DATABASE_URL` (example in `.env.example`)
  4. Run: `npm run db:migrate && npm run seed`

- Dev fallback: SQLite (no external install)
  - Already configured in `.env` as `file:./dev.db`. To use it:
    - `npm run dev:sqlite`
  - For production, switch back to Postgres as above.

## License
MIT
