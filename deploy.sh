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
echo "📥 [1/6] Pulling latest updates from GitHub (main)..."
git reset --hard HEAD || true
git pull origin main

# Ensure Nginx allows large multi-image quotation payloads
if [ -d /etc/nginx ]; then
    echo "Ensuring Nginx client_max_body_size is set to 100M for quotation image uploads..."
    echo "client_max_body_size 100M;" | sudo tee /etc/nginx/conf.d/quotegenerator_limits.conf > /dev/null || true
    sudo systemctl reload nginx 2>/dev/null || true
fi

# 2. Install Presentation Fonts (including Baskerville, Klein, Moontime, Caudex Bold, Inter, Calibri, Segoe UI)
echo ""
echo "🔤 [2/6] Installing presentation fonts into system font cache..."
sudo mkdir -p /usr/local/share/fonts/quotegenerator
sudo mkdir -p /usr/share/fonts/truetype/quotegenerator
mkdir -p "$HOME/.local/share/fonts/quotegenerator"

if [ -d "$APP_DIR/server/fonts" ]; then
    echo "Copying presentation fonts from $APP_DIR/server/fonts..."
    sudo cp -f "$APP_DIR/server/fonts"/*.* /usr/local/share/fonts/quotegenerator/ || true
    sudo cp -f "$APP_DIR/server/fonts"/*.* /usr/share/fonts/truetype/quotegenerator/ || true
    sudo chmod 644 /usr/local/share/fonts/quotegenerator/* || true
    sudo chmod 644 /usr/share/fonts/truetype/quotegenerator/* || true
    
    cp -f "$APP_DIR/server/fonts"/*.* "$HOME/.local/share/fonts/quotegenerator/" || true
    chmod 644 "$HOME/.local/share/fonts/quotegenerator/"* || true

    # Install Fontconfig alias configuration for Caudex Bold, Inter, Baskerville
    if [ -f "$APP_DIR/server/fonts/99-quotegenerator-fonts.conf" ]; then
        echo "Installing fontconfig aliases for Caudex Bold and Inter..."
        sudo mkdir -p /etc/fonts/conf.d
        sudo cp -f "$APP_DIR/server/fonts/99-quotegenerator-fonts.conf" /etc/fonts/conf.d/99-quotegenerator-fonts.conf || true
        mkdir -p "$HOME/.config/fontconfig/conf.d"
        cp -f "$APP_DIR/server/fonts/99-quotegenerator-fonts.conf" "$HOME/.config/fontconfig/conf.d/99-quotegenerator-fonts.conf" || true
    fi
fi

echo "Installing font packages (fonts-inter, fontconfig, liberation, crosextra)..."
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-inter \
    fonts-crosextra-carlito \
    fonts-crosextra-caladea \
    fonts-liberation \
    libreoffice-impress \
    libreoffice-common

echo "Rebuilding font cache to register presentation fonts..."
sudo fc-cache -f
fc-cache -f

echo "Verifying registered presentation fonts:"
fc-list : family | grep -iE "caudex|inter|baskerville|klein|moontime" | sort -u || true

# 3. Install ONLYOFFICE Document Builder for 100% Microsoft OOXML fidelity
echo ""
echo "🏢 [3/6] Setting up ONLYOFFICE Document Builder for 100% OOXML presentation export..."
if ! command -v docbuilder &> /dev/null && [ ! -f /opt/onlyoffice/documentbuilder/docbuilder ]; then
    echo "Installing ONLYOFFICE Document Builder on Ubuntu..."
    sudo mkdir -p -m 700 /root/.gnupg 2>/dev/null || true
    curl -fsSL https://download.onlyoffice.com/GPG-KEY-ONLYOFFICE | sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/onlyoffice.gpg --import 2>/dev/null || true
    if [ -f /usr/share/keyrings/onlyoffice.gpg ]; then
        sudo chmod 644 /usr/share/keyrings/onlyoffice.gpg
        echo "deb [signed-by=/usr/share/keyrings/onlyoffice.gpg] https://download.onlyoffice.com/repo/debian squeeze main" | sudo tee /etc/apt/sources.list.d/onlyoffice.list > /dev/null
        sudo apt-get update -qq || true
        sudo apt-get install -y onlyoffice-documentbuilder || true
    fi

    # Fallback to direct .deb download if apt repository had any issue
    if ! command -v docbuilder &> /dev/null && [ ! -f /opt/onlyoffice/documentbuilder/docbuilder ]; then
        echo "Downloading ONLYOFFICE Document Builder direct deb package..."
        curl -fsSL -o /tmp/onlyoffice-documentbuilder.deb https://download.onlyoffice.com/install/desktop/docbuilder/linux/onlyoffice-documentbuilder_amd64.deb || true
        if [ -f /tmp/onlyoffice-documentbuilder.deb ]; then
            sudo dpkg -i /tmp/onlyoffice-documentbuilder.deb || sudo apt-get -f install -y || true
            rm -f /tmp/onlyoffice-documentbuilder.deb
        fi
    fi
else
    echo "ONLYOFFICE Document Builder is already installed."
fi

# 4. Update Server Dependencies & Configure Port 5002
echo ""
echo "⚙️ [4/6] Setting up Backend Server on port 5002..."
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

# 5. Build Frontend Application
echo ""
echo "🎨 [5/6] Building Client Frontend (Vite Production Build)..."
cd "$APP_DIR/client"
npm install
npm run build

# 6. Restart Application via PM2
echo ""
echo "🔄 [6/6] Restarting Backend Service via PM2 on port 5002..."
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
