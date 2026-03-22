#!/usr/bin/env bash
set -e

REPO="https://github.com/scanbott/rawclaw-chat.git"
DIR="rawclaw-chat"

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║       RawClaw Chat Install       ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# 1. Check Node.js >= 20
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed."
  echo "Install Node.js 20+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "ERROR: Node.js 20+ required. Found: $(node -v)"
  echo "Install Node.js 20+ from https://nodejs.org"
  exit 1
fi
echo "[ok] Node.js $(node -v)"

# 2. Clone repo
if [ -d "$DIR" ]; then
  echo "[ok] Directory $DIR already exists, pulling latest..."
  cd "$DIR"
  git pull --ff-only
else
  echo "[..] Cloning repository..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi
echo "[ok] Repository ready"

# 3. Install dependencies
echo "[..] Installing dependencies..."
npm install --production=false
echo "[ok] Dependencies installed"

# 4. Run setup wizard
echo ""
node bin/setup.js
echo ""

# 5. Build
echo "[..] Building Next.js app..."
npm run build
echo "[ok] Build complete"

# 6. Start with PM2
if command -v pm2 &> /dev/null; then
  pm2 start ecosystem.config.cjs
  pm2 save
  echo ""
  echo "  ╔══════════════════════════════════╗"
  echo "  ║         Install Complete         ║"
  echo "  ╠══════════════════════════════════╣"
  echo "  ║  Running at http://localhost:3000║"
  echo "  ║  Managed by PM2                  ║"
  echo "  ║                                  ║"
  echo "  ║  pm2 logs rawclaw-chat           ║"
  echo "  ║  pm2 restart rawclaw-chat        ║"
  echo "  ╚══════════════════════════════════╝"
else
  echo ""
  echo "  PM2 not found. Install it globally for process management:"
  echo "    npm install -g pm2"
  echo "    pm2 start ecosystem.config.cjs"
  echo ""
  echo "  Or start manually:"
  echo "    npm start"
  echo ""
  echo "  ╔══════════════════════════════════╗"
  echo "  ║         Install Complete         ║"
  echo "  ╠══════════════════════════════════╣"
  echo "  ║  Start: npm start                ║"
  echo "  ║  URL:   http://localhost:3000     ║"
  echo "  ╚══════════════════════════════════╝"
fi
echo ""
