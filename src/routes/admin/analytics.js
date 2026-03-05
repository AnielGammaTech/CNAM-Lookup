const express = require('express');
const { getPool } = require('../../services/database');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const db = getPool();
    const [usersResult, lookupsResult, todayResult] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM users'),
      db.query('SELECT COUNT(*) as total FROM lookups'),
      db.query("SELECT COUNT(*) as total FROM lookups WHERE looked_up_at >= CURRENT_DATE"),
    ]);
    res.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0].total, 10),
        totalLookups: parseInt(lookupsResult.rows[0].total, 10),
        lookupsToday: parseInt(todayResult.rows[0].total, 10),
      },
    });
  } catch (error) {
    console.error('Analytics summary error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT DATE(looked_up_at) as date, COUNT(*) as lookups, COUNT(DISTINCT user_id) as unique_users
       FROM lookups WHERE looked_up_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(looked_up_at) ORDER BY date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Analytics usage error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get usage data' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT u.id, u.username, COUNT(l.id) as total_lookups, MAX(l.looked_up_at) as last_lookup
       FROM users u LEFT JOIN lookups l ON u.id = l.user_id
       GROUP BY u.id, u.username ORDER BY total_lookups DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Analytics users error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get user analytics' });
  }
});

module.exports = router;
