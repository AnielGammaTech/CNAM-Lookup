const config = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 3000,
  twilio: Object.freeze({
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
  }),
  database: Object.freeze({
    url: process.env.DATABASE_URL,
  }),
  jwt: Object.freeze({
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  }),
  cookie: Object.freeze({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  }),
  settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || '',
  admin: Object.freeze({
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  }),
});

function validateConfig() {
  const missing = [];
  if (!config.database.url) missing.push('DATABASE_URL');
  if (!config.jwt.secret) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
