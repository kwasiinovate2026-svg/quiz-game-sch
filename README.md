# DasQuiz — Live multiplayer quiz

This repository contains a small Node.js server that serves a single-page quiz client and provides a proxy/fallback local backend for development.

Getting started

- Install dependencies:

```bash
npm install
```

- Run in development mode:

```bash
npm run dev
```

- Run tests:

```bash
npm test
```

Production

- Create a `.env` file (or set environment variables). See `.env.example`.
- Start the server:

```bash
npm run start:prod
```

Docker

- Build the image:

```bash
docker build -t dasquiz:latest .
```

- Run the container (example):

```bash
docker run -p 3000:3000 --env-file .env -e NODE_ENV=production dasquiz:latest
```

Notes

- The server will serve `index.html` and static assets from the repository root. If `BACKEND_URL` and `API_TOKEN` are provided, the server will proxy `/api/*` requests to the configured backend.
- In development, if `BACKEND_URL` or `API_TOKEN` are not set, the server uses a local in-memory fallback backend implemented in `src/backend-utils.js`.

Contact

For questions or help, open an issue.
