const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const linkStore = new Map();

const generateKey = () => Math.random().toString(36).substring(2, 8);

const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const buildShortUrl = (req, key) => `${req.protocol}://${req.get('host')}/api/redirect/${key}`;

app.use(cors({ origin: true }));
app.use(express.json());

app.post('/api/shorten', (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'Missing "url" in request body.' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ message: 'The provided URL is not valid.' });
  }

  let key = generateKey();
  while (linkStore.has(key)) {
    key = generateKey();
  }

  const payload = {
    originalUrl: url,
    clickCount: 0,
    createdAt: new Date().toISOString(),
  };

  linkStore.set(key, payload);

  return res.status(201).json({
    key,
    shortUrl: buildShortUrl(req, key),
    ...payload,
  });
});

app.get('/api/redirect/:key', (req, res) => {
  const { key } = req.params;

  if (!linkStore.has(key)) {
    return res.status(404).json({ message: 'Short link not found.' });
  }

  const entry = linkStore.get(key);
  entry.clickCount += 1;

  return res.json({
    key,
    shortUrl: buildShortUrl(req, key),
    ...entry,
  });
});

app.get('/api/links', (req, res) => {
  const payload = Array.from(linkStore.entries()).map(([key, entry]) => ({
    key,
    shortUrl: buildShortUrl(req, key),
    ...entry,
  }));

  res.json(payload);
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`Fake URL shortener API listening on http://localhost:${PORT}`);
});
