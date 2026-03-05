const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { config } = require('../config');
const { getPool } = require('./database');

function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 12);
}

function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

function generateInviteCode() {
  return crypto.randomBytes(6).toString('base64url');
}

async function createInviteCode(createdByUserId) {
  const db = getPool();
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await db.query(
    'INSERT INTO invite_codes (code, created_by, expires_at) VALUES ($1, $2, $3) RETURNING *',
    [code, createdByUserId, expiresAt]
  );
  return result.rows[0];
}

async function redeemInviteCode(code) {
  const db = getPool();
  const { rows } = await db.query(
    'SELECT * FROM invite_codes WHERE code = $1 AND is_used = false AND (expires_at IS NULL OR expires_at > NOW())',
    [code]
  );
  if (rows.length === 0) return { valid: false };
  return { valid: true, invite: rows[0] };
}

async function markInviteUsed(inviteId, userId) {
  const db = getPool();
  await db.query(
    'UPDATE invite_codes SET is_used = true, used_by = $1 WHERE id = $2',
    [userId, inviteId]
  );
}

async function createUser({ username, passwordHash, role = 'user' }) {
  const db = getPool();
  const result = await db.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, is_active, created_at',
    [username, passwordHash, role]
  );
  return result.rows[0];
}

async function findUserByUsername(username) {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const db = getPool();
  const { rows } = await db.query(
    'SELECT id, username, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function listUsers({ page = 1, limit = 50 }) {
  const db = getPool();
  const offset = (page - 1) * limit;
  const [dataResult, countResult] = await Promise.all([
    db.query('SELECT id, username, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
    db.query('SELECT COUNT(*) as total FROM users'),
  ]);
  return { data: dataResult.rows, total: parseInt(countResult.rows[0].total, 10), page, limit };
}

async function updateUserRole(userId, role) {
  const db = getPool();
  const { rows } = await db.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role, is_active',
    [role, userId]
  );
  return rows[0] || null;
}

async function toggleUserActive(userId, isActive) {
  const db = getPool();
  const { rows } = await db.query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role, is_active',
    [isActive, userId]
  );
  return rows[0] || null;
}

async function deleteUser(userId) {
  const db = getPool();
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
}

async function listInviteCodes({ page = 1, limit = 50 }) {
  const db = getPool();
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    `SELECT ic.*, u1.username as created_by_name, u2.username as used_by_name
     FROM invite_codes ic
     LEFT JOIN users u1 ON ic.created_by = u1.id
     LEFT JOIN users u2 ON ic.used_by = u2.id
     ORDER BY ic.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function deleteInviteCode(id) {
  const db = getPool();
  await db.query('DELETE FROM invite_codes WHERE id = $1 AND is_used = false', [id]);
}

module.exports = {
  hashPassword, verifyPassword, generateToken, verifyToken,
  createInviteCode, redeemInviteCode, markInviteUsed,
  createUser, findUserByUsername, findUserById,
  listUsers, updateUserRole, toggleUserActive, deleteUser,
  listInviteCodes, deleteInviteCode,
};
