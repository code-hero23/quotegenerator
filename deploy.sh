#!/usr/bin/env bash
# ==============================================================================
# COOKSCAPE QUOTATION GENERATOR - DEPLOYMENT SCRIPT (Ubuntu VPS)
# Backend Port: 5002
# ==============================================================================
set -e

# Change directory to the repository root where this script resides
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "=========================================================="
echo "🚀 Starting Deployment for Quotation Generator..."
echo "📁 Working Directory: $APP_DIR"
echo "🔌 Target Backend Port: 5002"
echo "🕒 Timestamp: $(date)"
echo "=========================================================="

# 1. Pull latest code from GitHub
echo ""
echo "📥 [1/5] Pulling latest updates from GitHub (main)..."
git pull origin main

# 2. Ensure LibreOffice is installed for direct PPTX to PDF export
echo ""
echo "📄 [2/5] Checking LibreOffice converter availability..."
if ! command -v soffice &> /dev/null && ! command -v libreoffice &> /dev/null; then
    echo "Installing LibreOffice for headless PPTX to PDF export..."
    sudo apt-get update -qq
    sudo apt-get install -y --no-install-recommends libreoffice-impress libreoffice-common
else
    echo "LibreOffice is already installed and ready for PPTX to PDF export."
fi

# 3. Update Server Dependencies & Configure Port 5002
echo ""
echo "⚙️ [3/5] Setting up Backend Server on port 5002..."
cd "$APP_DIR/server"
npm install --omit=dev

# Ensure uploads directories exist
mkdir -p uploads/generated uploads/snips

# Ensure .env exists with PORT=5002
if [ ! -f .env ]; then
    echo "Creating server .env configured to port 5002..."
    cat <<EOT > .env
PORT=5002
MASTER_TEMPLATE_PATH="../Master-Template.pptx"
EOT
else
    # Update PORT to 5002 if already present, or append
    if grep -q "^PORT=" .env; then
        sed -i 's/^PORT=.*/PORT=5002/' .env
    else
        echo "PORT=5002" >> .env
    fi
    echo "Configured server/.env to PORT=5002"
fi

# 4. Build Frontend Application
echo ""
echo "🎨 [4/5] Building Client Frontend (Vite Production Build)..."
cd "$APP_DIR/client"
npm install
npm run build

# 5. Restart Application via PM2
echo ""
echo "🔄 [5/5] Restarting Backend Service via PM2 on port 5002..."
cd "$APP_DIR/server"

if pm2 list | grep -q "quotegenerator-api"; then
    echo "Restarting existing PM2 process 'quotegenerator-api'..."
    pm2 restart quotegenerator-api --update-env
else
    echo "Starting new PM2 process 'quotegenerator-api' on port 5002..."
    pm2 start src/index.js --name "quotegenerator-api"
    pm2 save
fi

echo ""
echo "=========================================================="
echo "✅ Deployment completed successfully!"
echo "🔌 Backend API: http://127.0.0.1:5002"
echo "📡 Subdomain: http://quotegenerator.orbixdesigns.com"
echo "=========================================================="
