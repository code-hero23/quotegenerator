const express = require('express');
const router = express.Router();
const dbService = require('../services/db');

// GET /api/variants
router.get('/', async (req, res) => {
  try {
    const rawVariants = await dbService.getVariants();
    const seenIds = new Set();
    const seenNames = new Set();
    const variants = [];

    for (const v of rawVariants) {
      const rawName = String(v.name || '').trim().toUpperCase();
      const isLLElite =
        v.id === 'var-surabhi-ll-elite' ||
        v.id === 'var-ll-elite' ||
        rawName === 'SURABHI - LL ELITE' ||
        rawName === 'SURABHI  - LL ELITE' ||
        rawName === 'LL-ELITE' ||
        rawName === 'LL ELITE' ||
        (rawName.includes('ELITE') && !rawName.includes('ELEGANT'));

      const cleanId = isLLElite ? 'var-ll-elite' : v.id;
      const cleanName = isLLElite ? 'LL ELITE' : v.name;

      if (!seenIds.has(cleanId) && !seenNames.has(cleanName.toUpperCase())) {
        seenIds.add(cleanId);
        seenNames.add(cleanName.toUpperCase());
        variants.push({
          ...v,
          id: cleanId,
          name: cleanName,
          ...(isLLElite ? { slideIndices: [7, 8, 9] } : {})
        });
      }
    }
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
