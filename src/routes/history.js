const express = require('express');
const { getHistory, clearHistory } = require('../services/database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const search = (req.query.search || '').trim().slice(0, 100);

    const result = await getHistory({ page, limit, search });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('History fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch history.' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await clearHistory();
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    console.error('History clear error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to clear history.' });
  }
});

module.exports = router;
