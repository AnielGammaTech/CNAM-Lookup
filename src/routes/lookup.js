const express = require('express');
const multer = require('multer');
const { validatePhoneNumber, normalizePhone } = require('../middleware/validation');
const { lookupNumber } = require('../services/twilio');
const { insertLookup } = require('../services/database');
const { parseCSV } = require('../services/csv');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/single', validatePhoneNumber, async (req, res) => {
  try {
    const result = await lookupNumber(req.normalizedPhone);
    const saved = await insertLookup(result, req.user.id);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('Single lookup error:', error.message);
    res.status(500).json({ success: false, error: 'Lookup failed. Please try again.' });
  }
});

router.post('/bulk', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'CSV file is required' });
  }

  try {
    const rawNumbers = await parseCSV(req.file.buffer);

    if (rawNumbers.length === 0) {
      return res.status(400).json({ success: false, error: 'No phone numbers found in CSV' });
    }
    if (rawNumbers.length > 500) {
      return res.status(400).json({ success: false, error: 'Maximum 500 numbers per upload' });
    }

    const numbers = rawNumbers.map((n) => normalizePhone(n)).filter(Boolean);

    if (numbers.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid phone numbers found in CSV' });
    }

    const results = [];
    for (const phone of numbers) {
      const result = await lookupNumber(phone);
      const saved = await insertLookup(result, req.user.id);
      results.push(saved);
    }

    res.json({
      success: true,
      data: results,
      summary: {
        total: rawNumbers.length,
        processed: results.length,
        successful: results.filter((r) => !r.error_message).length,
        failed: results.filter((r) => r.error_message).length,
      },
    });
  } catch (error) {
    console.error('Bulk lookup error:', error.message);
    res.status(500).json({ success: false, error: 'Bulk lookup failed. Please try again.' });
  }
});

module.exports = router;
