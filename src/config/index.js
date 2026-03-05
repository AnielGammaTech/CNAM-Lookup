const config = Object.freeze({
  port: parseInt(process.env.PORT, 10) || 3000,
  twilio: Object.freeze({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  }),
  database: Object.freeze({
    url: process.env.DATABASE_URL,
  }),
});

function validateConfig() {
  const missing = [];
  if (!config.twilio.accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!config.twilio.authToken) missing.push('TWILIO_AUTH_TOKEN');
  if (!config.database.url) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
