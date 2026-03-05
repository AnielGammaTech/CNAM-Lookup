function normalizePhone(raw) {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return digits.startsWith('+') ? digits : `+1${digits}`;
}

function validatePhoneNumber(req, res, next) {
  const { phone } = req.body;

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required',
    });
  }

  const normalized = normalizePhone(phone.trim());
  if (!normalized) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Must be 10-15 digits.',
    });
  }

  req.normalizedPhone = normalized;
  next();
}

module.exports = { validatePhoneNumber, normalizePhone };
