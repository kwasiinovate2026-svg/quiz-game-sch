import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Prefer the process working directory in production (containers), fallback to repo layout in dev
const repoRoot = process.cwd() || path.resolve(__dirname, '..');
const indexPath = path.join(repoRoot, 'index.html');

// Backend proxy configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://api';
// API token must be provided via environment variable in production.
const API_TOKEN = process.env.API_TOKEN;

// Serve SPA at both / and /index.html
app.get(['/', '/index.html'], (req, res) => res.sendFile(indexPath));

// Serve other static assets (manifest, icons, sw.js if present, etc.)
app.use(express.static(repoRoot));

app.get('/healthz', (req, res) => res.json({ ok: true }));

// Generic proxy to an external backend. Clients POST JSON to /api/proxy/<path>
// and this server forwards the request body to `${BACKEND_URL}/<path>` with
// the `Authorization: Bearer ${API_TOKEN}` header.
app.post('/api/proxy/*', async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'missing_api_token', message: 'Server API_TOKEN not configured' });
    }

    const proxyPath = req.params[0] || '';
    const url = new URL(proxyPath, BACKEND_URL).toString();

    const fetchOptions = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(req.body),
    };

    const resp = await fetch(url, fetchOptions);
    const data = await resp.text();

    // Mirror status and content-type where possible
    const contentType = resp.headers.get('content-type') || 'application/json';
    res.status(resp.status).type(contentType).send(data);
  } catch (err) {
    console.error('proxy error', err);
    res.status(502).json({ error: 'proxy_failure', detail: String(err) });
  }
});

// ---- Minimal API stubs (so Fly can deploy even before wiring full game logic) ----
app.post('/api/login', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/signup', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/create', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/join', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/start', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/state', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/answer', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/skip', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/leave', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));
app.post('/api/league', (req, res) => res.status(501).json({ error: 'Not implemented (backend API missing)' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', () => {
    ws.send(JSON.stringify({ error: 'WebSocket backend not implemented yet' }));
  });
});

server.listen(PORT, () => {
  console.log(`DasQuiz server listening on :${PORT}`);
});

