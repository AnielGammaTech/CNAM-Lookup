const express = require('express');
const path = require('path');
const { config, validateConfig } = require('./src/config');
const { initialize: initDatabase } = require('./src/services/database');
const lookupRoutes = require('./src/routes/lookup');
const historyRoutes = require('./src/routes/history');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/lookup', lookupRoutes);
app.use('/api/history', historyRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  validateConfig();
  await initDatabase();
  console.log('Database initialized');

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`CNAM Lookup running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
