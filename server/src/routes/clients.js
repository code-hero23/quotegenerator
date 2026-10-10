const express = require('express');
const router = express.Router();
const dbService = require('../services/db');

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const clients = await dbService.getClients();
    res.json({ success: true, count: clients.length, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const client = await dbService.upsertClient(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
