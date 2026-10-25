#!/usr/bin/env bash
# ==============================================================================
# COOKSCAPE QUOTATION GENERATOR - SAFE DEPLOYMENT SCRIPT (Ubuntu VPS)
# Backend Port: 5002
# Safe for shared multi-project VPS servers:
# - No sudo / system-wide package installs (no apt-get locks)
# - No global Nginx rewrites or service reloads
# - No global font cache flushes (strictly user-scoped)
# - Capped Node build memory (prevents Linux OOM killer on other projects)
# - No unscoped pm2 save
# ==============================================================================
set -e

# Change directory to the repository root where this script resides
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "=========================================================="
echo "🚀 Starting Safe Deployment for Quotation Generator..."
echo "📁 Working Directory: $APP_DIR"
echo "🔌 Target Backend Port: 5002"
echo "🕒 Timestamp: $(date)"
echo "=========================================================="

# 1. Safeguard existing database & pull latest code from GitHub
echo ""
echo "📥 [1/4] Preserving database and pulling latest updates from GitHub..."

LOCAL_STORE="$APP_DIR/server/uploads/local_store.json"
BACKUP_DIR="$APP_DIR/server/uploads/backups"
PRESERVE_FILE="/tmp/quotegenerator_local_store_preserve.json"

if [ -f "$LOCAL_STORE" ]; then
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    echo "💾 Creating automatic safety backup: $BACKUP_DIR/local_store_backup_${TIMESTAMP}.json"
    cp -f "$LOCAL_STORE" "$BACKUP_DIR/local_store_backup_${TIMESTAMP}.json"
    cp -f "$LOCAL_STORE" "$PRESERVE_FILE"
fi

# Fetch and merge updates safely
git pull origin main

# Restore database if git pull touched or reset it
if [ -f "$PRESERVE_FILE" ]; then
    echo "🛡️ Restoring preserved database to ensure zero data loss..."
    mkdir -p "$APP_DIR/server/uploads"
    cp -f "$PRESERVE_FILE" "$LOCAL_STORE"
    rm -f "$PRESERVE_FILE"
fi

# 2. Register presentation fonts strictly in user/local cache
if [ -d "$APP_DIR/server/fonts" ]; then
    echo ""
    echo "🔤 [2/4] Updating user presentation font cache..."
    mkdir -p "$HOME/.local/share/fonts/quotegenerator"
    cp -f "$APP_DIR/server/fonts"/*.* "$HOME/.local/share/fonts/quotegenerator/" 2>/dev/null || true
    fc-cache -f "$HOME/.local/share/fonts/quotegenerator" 2>/dev/null || true
fi

# 3. Update Server Dependencies & Configure Port 5002
echo ""
echo "⚙️ [3/4] Setting up Backend Server on port 5002..."
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

# 4. Build Frontend with memory cap & restart PM2 service
echo ""
echo "🎨 [4/4] Building Client Frontend (Vite) & Restarting PM2..."
cd "$APP_DIR/client"
npm install

# Cap memory during build to prevent Linux OOM killer from terminating other VPS processes
NODE_OPTIONS="--max-old-space-size=1024" npm run build

cd "$APP_DIR/server"
if pm2 list | grep -q "quotegenerator-api"; then
    echo "Restarting existing PM2 process 'quotegenerator-api'..."
    pm2 restart quotegenerator-api --update-env
else
    echo "Starting new PM2 process 'quotegenerator-api' on port 5002..."
    pm2 start src/index.js --name "quotegenerator-api"
fi

echo ""
echo "=========================================================="
echo "✅ Quotation Generator deployed safely!"
echo "🔌 Backend API: http://127.0.0.1:5002"
echo "📡 Subdomain: http://quotegenerator.orbixdesigns.com"
echo "🛡️ Zero impact on other projects on this server."
echo "=========================================================="
