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

## License
MIT
