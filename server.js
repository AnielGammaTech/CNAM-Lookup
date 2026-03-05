const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { config, validateConfig } = require('./src/config');
const { initialize: initDatabase } = require('./src/services/database');
const { requireAuth, requireAdmin } = require('./src/middleware/auth');
const { getTools } = require('./src/tools/registry');

const authRoutes = require('./src/routes/auth');
const lookupRoutes = require('./src/routes/lookup');
const historyRoutes = require('./src/routes/history');
const adminUserRoutes = require('./src/routes/admin/users');
const adminInviteRoutes = require('./src/routes/admin/invites');
const adminSettingsRoutes = require('./src/routes/admin/settings');
const adminAnalyticsRoutes = require('./src/routes/admin/analytics');
const adminAuditRoutes = require('./src/routes/admin/audit');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/lookup', requireAuth, lookupRoutes);
app.use('/api/history', requireAuth, historyRoutes);

// Admin routes
app.use('/api/admin/users', requireAuth, requireAdmin, adminUserRoutes);
app.use('/api/admin/invites', requireAuth, requireAdmin, adminInviteRoutes);
app.use('/api/admin/settings', requireAuth, requireAdmin, adminSettingsRoutes);
app.use('/api/admin/analytics', requireAuth, requireAdmin, adminAnalyticsRoutes);
app.use('/api/admin/audit', requireAuth, requireAdmin, adminAuditRoutes);

// Tool discovery
app.get('/api/tools', requireAuth, (_req, res) => {
  res.json({ success: true, data: getTools() });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  validateConfig();
  await initDatabase();
  console.log('Database initialized');

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`ToolboxIT running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
