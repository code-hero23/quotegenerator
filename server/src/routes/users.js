const express = require('express');
const router = express.Router();
const dbService = require('../services/db');

// POST /api/users/login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const user = await dbService.authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users - List all users (Sanitized)
router.get('/', async (req, res) => {
  try {
    const users = await dbService.getUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users - Create new Feasibility Architect (Admin only)
router.post('/', async (req, res) => {
  try {
    const { username, password, name, contactNumber, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const newUser = await dbService.createUser({
      username,
      password,
      name: name || username,
      contactNumber,
      email,
      role: role || 'architect'
    });

    res.status(201).json({
      success: true,
      message: 'Feasibility Architect created successfully',
      data: newUser
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/:id - Delete architect (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteUser(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'User not found or cannot be removed.' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

