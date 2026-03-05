const express = require('express');
const { config } = require('../config');
const {
  hashPassword, verifyPassword, generateToken,
  findUserByUsername, createUser,
  redeemInviteCode, markInviteUsed,
} = require('../services/auth');
const { logAction } = require('../services/audit');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;

    if (!username || !password || !inviteCode) {
      return res.status(400).json({ success: false, error: 'Username, password, and invite code are required' });
    }
    if (username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, error: 'Username must be 3-50 alphanumeric characters' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    const { valid, invite } = await redeemInviteCode(inviteCode);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired invite code' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ username, passwordHash });
    await markInviteUsed(invite.id, user.id);

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.cookie('token', token, config.cookie);

    await logAction({ userId: user.id, action: 'auth:register', ipAddress: req.ip });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: 'Account is disabled' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.cookie('token', token, config.cookie);

    await logAction({ userId: user.id, action: 'auth:login', ipAddress: req.ip });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  await logAction({ userId: req.user.id, action: 'auth:logout', ipAddress: req.ip });
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
