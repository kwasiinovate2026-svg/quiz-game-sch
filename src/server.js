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
const repoRoot = process.cwd() || path.resolve(__dirname, '..');
const indexPath = path.join(repoRoot, 'index.html');

// Serve SPA at both / and /index.html
app.get(['/', '/index.html'], (req, res) => res.sendFile(indexPath));

// Serve other static assets (manifest, icons, sw.js if present, etc.)
app.use(express.static(repoRoot));

app.get('/healthz', (req, res) => res.json({ ok: true }));

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

