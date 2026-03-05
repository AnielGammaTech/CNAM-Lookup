const crypto = require('crypto');
const { config } = require('../config');
const { getPool } = require('./database');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const key = config.settingsEncryptionKey;
  if (!key || key.length < 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be at least 32 characters');
  }
  return crypto.scryptSync(key, 'toolboxit-salt', 32);
}

function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function decrypt(stored) {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, encrypted] = stored.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getSetting(key) {
  const db = getPool();
  const { rows } = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
  if (rows.length === 0) return null;
  try {
    return decrypt(rows[0].value);
  } catch {
    return null;
  }
}

async function setSetting(key, value, updatedBy) {
  const db = getPool();
  const encrypted = encrypt(value);
  await db.query(
    `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
    [key, encrypted, updatedBy]
  );
}

async function getAllSettings() {
  const db = getPool();
  const { rows } = await db.query(
    'SELECT s.key, s.updated_at, u.username as updated_by_name FROM settings s LEFT JOIN users u ON s.updated_by = u.id ORDER BY s.key'
  );
  return rows.map((row) => ({
    key: row.key,
    hasValue: true,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name,
  }));
}

async function deleteSetting(key) {
  const db = getPool();
  await db.query('DELETE FROM settings WHERE key = $1', [key]);
}

module.exports = { getSetting, setSetting, getAllSettings, deleteSetting };
