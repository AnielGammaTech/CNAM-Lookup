const { verifyToken, findUserById } = require('../services/auth');

async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  const user = await findUserById(payload.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, error: 'Account inactive or not found' });
  }

  req.user = { id: user.id, username: user.username, role: user.role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
