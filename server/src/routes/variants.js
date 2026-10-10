const express = require('express');
const router = express.Router();
const dbService = require('../services/db');

// GET /api/variants
router.get('/', async (req, res) => {
  try {
    const variants = await dbService.getVariants();
    res.json({ success: true, count: variants.length, data: variants });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/variants/:id
router.get('/:id', async (req, res) => {
  try {
    const variant = await dbService.getVariantById(req.params.id);
    if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' });
    res.json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
