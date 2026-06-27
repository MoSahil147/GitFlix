const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { v4: uuid } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const jobs = new Map();

let cachedBundle = null;

async function getBundle() {
  if (cachedBundle) return cachedBundle;
  console.log('Bundling composition (first time only)...');
  cachedBundle = await bundle({
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
  console.log('Bundle ready.');
  return cachedBundle;
}

app.post('/render', (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'script is required' });

  const id = uuid();
  const outPath = path.join('/tmp', `gitflix-${id}.mp4`);
  jobs.set(id, { status: 'rendering', outPath, pct: 0, error: null });
  res.json({ id });

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
      if (job) { job.status = 'error'; job.error = err.message; }
      fs.unlink(outPath, () => {});
    }
  })();
});

app.get('/render/:id/progress', (req, res) => {
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

app.get('/render/:id/file', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== 'done') return res.status(404).json({ error: 'Not ready' });

  res.setHeader('Content-Disposition', 'attachment; filename="gitflix.mp4"');
  res.setHeader('Content-Type', 'video/mp4');

  const stream = fs.createReadStream(job.outPath);
  stream.pipe(res);
  stream.on('end', () => {
    fs.unlink(job.outPath, () => {});
    jobs.delete(req.params.id);
  });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(3001, () => console.log('Render server on http://localhost:3001'));
