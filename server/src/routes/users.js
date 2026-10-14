const express = require('express');
const router = express.Router();
const dbService = require('../services/db');

// POST /api/users/login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt for username="${username}"`);

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const user = await dbService.authenticateUser(username, password);
    if (!user) {
      console.warn(`[AUTH] Login FAILED for username="${username}"`);
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    console.log(`[AUTH] Login SUCCESS: username="${username}", role="${user.role}", name="${user.name}"`);

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

// GET /api/users - List users (scoped by role & user)
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;
    const users = await dbService.getUsers({ userId, role });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users - Create new User (Admin or Business Head)
router.post('/', async (req, res) => {
  try {
    const { username, password, name, contactNumber, email, role, bhId, bhName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const newUser = await dbService.createUser({
      username,
      password,
      name: name || username,
      contactNumber,
      email,
      role: role || 'fa',
      bhId,
      bhName
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/users/:id - Update user details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, contactNumber, email, role, bhId, bhName } = req.body;

    const updatedUser = await dbService.updateUser(id, {
      username,
      password,
      name,
      contactNumber,
      email,
      role,
      bhId,
      bhName
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
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

