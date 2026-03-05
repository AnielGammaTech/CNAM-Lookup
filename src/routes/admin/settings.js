const express = require('express');
const { getSetting, setSetting, getAllSettings, deleteSetting } = require('../../services/settings');
const { logAction } = require('../../services/audit');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('List settings error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list settings' });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (!value || typeof value !== 'string') {
      return res.status(400).json({ success: false, error: 'Value is required' });
    }
    const key = req.params.key;
    await setSetting(key, value, req.user.id);
    await logAction({
      userId: req.user.id,
      action: 'admin:update_setting',
      resource: key,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: `Setting "${key}" updated` });
  } catch (error) {
    console.error('Set setting error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    await deleteSetting(req.params.key);
    await logAction({
      userId: req.user.id,
      action: 'admin:delete_setting',
      resource: req.params.key,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Setting deleted' });
  } catch (error) {
    console.error('Delete setting error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete setting' });
  }
});

module.exports = router;
