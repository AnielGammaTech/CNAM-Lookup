const { getPool } = require('./database');

async function logAction({ userId, action, resource = null, detail = null, ipAddress = null }) {
  const db = getPool();
  await db.query(
    'INSERT INTO audit_logs (user_id, action, resource, detail, ip_address) VALUES ($1, $2, $3, $4, $5)',
    [userId, action, resource, detail ? JSON.stringify(detail) : null, ipAddress]
  );
}

async function getAuditLogs({ page = 1, limit = 50, userId = null, action = null, startDate = null, endDate = null }) {
  const db = getPool();
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (userId) {
    conditions.push(`al.user_id = $${paramIdx++}`);
    params.push(userId);
  }
  if (action) {
    conditions.push(`al.action = $${paramIdx++}`);
    params.push(action);
  }
  if (startDate) {
    conditions.push(`al.created_at >= $${paramIdx++}`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`al.created_at <= $${paramIdx++}`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ${whereClause} ORDER BY al.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    ),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
    page,
    limit,
  };
}

module.exports = { logAction, getAuditLogs };
