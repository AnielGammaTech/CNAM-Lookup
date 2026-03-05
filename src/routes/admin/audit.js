const express = require('express');
const { getAuditLogs } = require('../../services/audit');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    const action = req.query.action || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const result = await getAuditLogs({ page, limit, userId, action, startDate, endDate });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Audit logs error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
