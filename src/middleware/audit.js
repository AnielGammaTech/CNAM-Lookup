const { logAction } = require('../services/audit');

function auditAction(action, resourceFn) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) {
        const resource = resourceFn ? resourceFn(req) : null;
        logAction({
          userId: req.user.id,
          action,
          resource,
          detail: null,
          ipAddress: req.ip,
        }).catch((err) => console.error('Audit log error:', err.message));
      }
    });
    next();
  };
}

module.exports = { auditAction };
