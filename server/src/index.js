require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dbService = require('./services/db');

const variantsRouter = require('./routes/variants');
const clientsRouter = require('./routes/clients');
const usersRouter = require('./routes/users');
const quotationsRouter = require('./routes/quotations');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static downloads and uploads
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/variants', variantsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/users', usersRouter);
app.use('/api/quotations', quotationsRouter);

// Alias endpoint as specified in Blueprint Phase 4: POST /api/generate-quote
app.use('/api/generate-quote', (req, res, next) => {
  req.url = '/generate-quote';
  quotationsRouter(req, res, next);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    masterTemplatePath: process.env.MASTER_TEMPLATE_PATH || path.resolve(__dirname, '../../Master-Template.pptx')
  });
});

// Serve frontend static build if built (Production deployment)
const clientDistDir = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.resolve(clientDistDir, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Server
function startServer() {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Quotation Generator Backend running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📄 Variants API: http://localhost:${PORT}/api/variants`);
    console.log(`====================================================`);
  });
}

startServer();
