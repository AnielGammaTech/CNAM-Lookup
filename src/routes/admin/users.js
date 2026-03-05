const express = require('express');
const { listUsers, updateUserRole, toggleUserActive, deleteUser } = require('../../services/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const result = await listUsers({ page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('List users error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be admin or user' });
    }
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }
    const user = await updateUserRole(userId, role);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update role error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

router.patch('/:id/active', async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive must be a boolean' });
    }
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });
    }
    const user = await toggleUserActive(userId, isActive);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Toggle active error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }
    await deleteUser(userId);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

module.exports = router;
