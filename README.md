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
npm run db:migrate
npm run seed
npm run dev
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
- Upload parsing is stubbed for now; after parsing, select a Route and resolve each student's address via the autocomplete field (uses `PLACES_BROWSER_KEY`). On accept, the server creates Students and Trips.
- Trip assignment uses Google Distance Matrix when `DM_SERVER_KEY` is set. If unavailable, it falls back to straight-line distance to keep local testing unblocked, and marks the assignment method in `assignment_json`.

## License
MIT
