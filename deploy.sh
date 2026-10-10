#!/usr/bin/env bash
# ==============================================================================
# COOKSCAPE QUOTATION GENERATOR - DEPLOYMENT SCRIPT (Ubuntu VPS)
# ==============================================================================
set -e

# Change directory to the repository root where this script resides
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "=========================================================="
echo "🚀 Starting Deployment for Quotation Generator..."
echo "📁 Working Directory: $APP_DIR"
echo "🕒 Timestamp: $(date)"
echo "=========================================================="

# 1. Pull latest code from GitHub
echo ""
echo "📥 [1/4] Pulling latest updates from GitHub (main)..."
git pull origin main

# 2. Update Server Dependencies
echo ""
echo "⚙️ [2/4] Setting up Backend Server..."
cd "$APP_DIR/server"
npm install --omit=dev

# Ensure uploads directories exist
mkdir -p uploads/generated uploads/snips

# Ensure .env exists with defaults if not already present
if [ ! -f .env ]; then
    echo "⚠️ .env file missing in server directory. Creating default .env on port 5005..."
    cat <<EOT > .env
PORT=5005
MASTER_TEMPLATE_PATH="../Master-Template.pptx"
EOT
fi

# 3. Build Frontend Application
echo ""
echo "🎨 [3/4] Building Client Frontend (Vite Production Build)..."
cd "$APP_DIR/client"
npm install
npm run build

# 4. Restart Application via PM2
echo ""
echo "🔄 [4/4] Restarting Backend Service via PM2..."
cd "$APP_DIR/server"

if pm2 list | grep -q "quotegenerator-api"; then
    echo "Restarting existing PM2 process 'quotegenerator-api'..."
    pm2 restart quotegenerator-api
else
    echo "Starting new PM2 process 'quotegenerator-api' on port 5005..."
    pm2 start src/index.js --name "quotegenerator-api"
    pm2 save
fi

echo ""
echo "=========================================================="
echo "✅ Deployment completed successfully!"
echo "📡 Subdomain: http://quotegenerator.orbixdesigns.com"
echo "=========================================================="
