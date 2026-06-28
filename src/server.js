import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBackendTargetUrl, normalizeBackendUrl } from './backend-utils.js';

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
const BACKEND_URL = normalizeBackendUrl(process.env.BACKEND_URL);
// API token must be provided via environment variable in production.
const API_TOKEN = process.env.API_TOKEN;

function sendBackendError(res, error, message, status = 503) {
  return res.status(status).json({ error, message });
}

async function proxyJsonRequest(req, res, proxyPath = '') {
  if (!BACKEND_URL) {
    return sendBackendError(res, 'backend_not_configured', 'BACKEND_URL is not configured');
  }

  if (!API_TOKEN) {
    return sendBackendError(res, 'missing_api_token', 'Server API_TOKEN not configured', 500);
  }

  try {
    const url = getBackendTargetUrl(BACKEND_URL, proxyPath);
    const fetchOptions = {
      method: req.method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${API_TOKEN}`,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
    };

    const resp = await fetch(url, fetchOptions);
    const data = await resp.text();
    const contentType = resp.headers.get('content-type') || 'application/json';

    res.status(resp.status).type(contentType).send(data);
  } catch (err) {
    console.error('proxy error', err);
    return sendBackendError(res, 'proxy_failure', String(err), 502);
  }
}

// Serve SPA at both / and /index.html
app.get(['/', '/index.html'], (req, res) => res.sendFile(indexPath));

// Serve other static assets (manifest, icons, sw.js if present, etc.)
app.use(express.static(repoRoot));

app.get('/healthz', (req, res) => res.json({ ok: true }));

// Generic proxy to an external backend. Clients POST JSON to /api/proxy/<path>
// and this server forwards the request body to `${BACKEND_URL}/<path>` with
// the `Authorization: Bearer ${API_TOKEN}` header.
app.post('/api/proxy/*', async (req, res) => {
  const proxyPath = req.params[0] || '';
  return proxyJsonRequest(req, res, proxyPath);
});

app.all('/api/*', async (req, res) => {
  const proxyPath = req.path.replace(/^\/api\/?/, '');
  return proxyJsonRequest(req, res, proxyPath);
});

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

