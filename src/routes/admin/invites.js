const express = require('express');
const { createInviteCode, listInviteCodes, deleteInviteCode } = require('../../services/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const invite = await createInviteCode(req.user.id);
    res.json({ success: true, data: invite });
  } catch (error) {
    console.error('Create invite error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create invite code' });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const data = await listInviteCodes({ page, limit });
    res.json({ success: true, data });
  } catch (error) {
    console.error('List invites error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list invite codes' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteInviteCode(parseInt(req.params.id, 10));
    res.json({ success: true, message: 'Invite code revoked' });
  } catch (error) {
    console.error('Delete invite error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to revoke invite code' });
  }
});

module.exports = router;
