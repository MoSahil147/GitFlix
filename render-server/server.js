const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { v4: uuid } = require('uuid');

const app = express();

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const RENDER_SECRET = process.env.RENDER_SECRET || '';

if (!RENDER_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: RENDER_SECRET is not set — render server is open to anyone');
}

app.use(cors({ origin: ALLOWED_ORIGIN }));

const jobs = new Map();

function checkSecret(req, res, next) {
  if (!RENDER_SECRET) return next();
  if (req.headers['x-render-secret'] !== RENDER_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function checkJobToken(req, res, next) {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.token && req.query.token !== job.token) return res.status(401).json({ error: 'Unauthorized' });
  req.job = job;
  next();
}

app.use(express.json({ limit: '5mb' }));


setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      if (job.outPath) fs.unlink(job.outPath, () => {});
      jobs.delete(id);
    }
  }
}, 10 * 60 * 1000);

let cachedBundle = null;

async function getBundle() {
  if (!cachedBundle) {
    console.log('Bundling composition (first time only)...');
    cachedBundle = bundle({
      entryPoint: path.join(__dirname, '../frontend/src/remotion/Root.tsx'),
      publicDir: path.join(__dirname, '../frontend/public'),
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          modules: [
            path.join(__dirname, '../frontend/node_modules'),
            'node_modules',
          ],
        },
      }),
    });
    cachedBundle.then(() => console.log('Bundle ready.'));
  }
  return cachedBundle;
}

app.post('/render', checkSecret, (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'script is required' });

  const id = uuid();
  const token = uuid();
  const outPath = path.join('/tmp', `gitflix-${id}.mp4`);
  jobs.set(id, { status: 'rendering', outPath, pct: 0, error: null, token, createdAt: Date.now() });
  res.json({ id, token });

  (async () => {
    try {
      const bundled = await getBundle();

      const composition = await selectComposition({
        serveUrl: bundled,
        id: 'Gitflix',
        inputProps: { script },
      });

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation: outPath,
        inputProps: { script },
        scale: 2 / 3,
        onProgress: ({ progress }) => {
          const job = jobs.get(id);
          if (job) job.pct = Math.round(progress * 100);
        },
      });

      jobs.get(id).status = 'done';
    } catch (err) {
      console.error('Render failed:', err.message);
      const job = jobs.get(id);
      if (job) { job.status = 'error'; job.error = 'Render failed. Check server logs for details.'; }
      fs.unlink(outPath, () => {});
    }
  })();
});

app.get('/render/:id/progress', checkJobToken, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const tick = setInterval(() => {
    const job = jobs.get(req.params.id);

    if (!job) {
      send({ type: 'error', message: 'Job not found' });
      clearInterval(tick);
      res.end();
      return;
    }

    if (job.status === 'error') {
      send({ type: 'error', message: job.error });
      clearInterval(tick);
      res.end();
      return;
    }

    if (job.status === 'done') {
      send({ type: 'done' });
      clearInterval(tick);
      res.end();
      return;
    }

    send({ type: 'progress', pct: job.pct });
  }, 1000);

  req.on('close', () => clearInterval(tick));
});

app.get('/render/:id/file', checkJobToken, (req, res) => {
  const job = req.job;
  if (job.status !== 'done') return res.status(404).json({ error: 'Not ready' });

  res.setHeader('Content-Disposition', 'attachment; filename="gitflix.mp4"');
  res.setHeader('Content-Type', 'video/mp4');

  const stream = fs.createReadStream(job.outPath);
  stream.pipe(res);
  stream.on('error', () => {
    fs.unlink(job.outPath, () => {});
    jobs.delete(req.params.id);
  });
  res.on('finish', () => {
    fs.unlink(job.outPath, () => {});
    jobs.delete(req.params.id);
  });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(3001, () => console.log('Render server on http://localhost:3001'));
