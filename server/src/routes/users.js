const express = require('express');
const router = express.Router();
const dbService = require('../services/db');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await dbService.getUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
