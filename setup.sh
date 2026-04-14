#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║        ChainSight — Local Setup Script                      ║
# ║        Run this ONCE to set up your dev environment         ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#
# Prerequisites:
#   - Python 3.12+ installed
#   - Node.js 18+ installed (for frontend)
#   - Git installed

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        🌊 ChainSight — Local Setup                         ║${NC}"
echo -e "${BLUE}║        Multi-Agent Supply Chain Intelligence                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 0: Check prerequisites ──
echo -e "${YELLOW}[0/7] Checking prerequisites...${NC}"

# Check Python version
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python not found. Please install Python 3.12+${NC}"
    echo "   Download: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

echo "   Python: $PYTHON_VERSION"

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 12 ]); then
    echo -e "${RED}❌ Python 3.12+ required. You have $PYTHON_VERSION${NC}"
    echo "   Download: https://www.python.org/downloads/"
    exit 1
fi
echo -e "   ${GREEN}✅ Python $PYTHON_VERSION — OK${NC}"

# Check Node.js (optional, for frontend)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "   ${GREEN}✅ Node.js $NODE_VERSION — OK${NC}"
else
    echo -e "   ${YELLOW}⚠️  Node.js not found. Frontend setup will be skipped.${NC}"
    echo "   Install later: https://nodejs.org/"
fi

# Check Git
if command -v git &> /dev/null; then
    echo -e "   ${GREEN}✅ Git — OK${NC}"
else
    echo -e "   ${YELLOW}⚠️  Git not found. You'll need it for GitHub submission.${NC}"
fi

echo ""

# ── Step 1: Create virtual environment ──
echo -e "${YELLOW}[1/7] Creating Python virtual environment...${NC}"

if [ -d ".venv" ]; then
    echo "   .venv already exists. Skipping creation."
else
    $PYTHON_CMD -m venv .venv
    echo -e "   ${GREEN}✅ Virtual environment created at .venv/${NC}"
fi

# Activate venv
echo "   Activating virtual environment..."
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
echo -e "   ${GREEN}✅ Virtual environment activated${NC}"
echo ""

# ── Step 2: Upgrade pip ──
echo -e "${YELLOW}[2/7] Upgrading pip...${NC}"
pip install --upgrade pip --quiet
echo -e "   ${GREEN}✅ pip upgraded${NC}"
echo ""

# ── Step 3: Install Python dependencies ──
echo -e "${YELLOW}[3/7] Installing Python dependencies (this may take 1-2 minutes)...${NC}"

pip install \
    "google-adk[a2a]>=1.30.0" \
    "google-genai>=1.0.0" \
    "uvicorn>=0.30.0" \
    "fastapi>=0.115.0" \
    "httpx>=0.27.0" \
    "websockets>=12.0" \
    "pydantic>=2.0.0" \
    "firebase-admin>=6.0.0" \
    "feedparser>=6.0.0" \
    "networkx>=3.0" \
    "python-dotenv>=1.0.0" \
    "aiohttp>=3.9.0" \
    --quiet 2>&1 | tail -5

echo -e "   ${GREEN}✅ All Python packages installed${NC}"
echo ""

# ── Step 4: Set up environment file ──
echo -e "${YELLOW}[4/7] Setting up environment configuration...${NC}"

if [ -f ".env" ]; then
    echo "   .env already exists. Skipping."
else
    cp .env.example .env
    echo -e "   ${GREEN}✅ Created .env from template${NC}"
    echo ""
    echo -e "   ${YELLOW}⚠️  IMPORTANT: You need to add your API keys to .env${NC}"
    echo ""
    echo "   Required keys:"
    echo "   ┌──────────────────────────────────────────────────────────────┐"
    echo "   │ GOOGLE_API_KEY      → Get from https://aistudio.google.com  │"
    echo "   │                       (Click 'Get API Key' → Create)        │"
    echo "   ├──────────────────────────────────────────────────────────────┤"
    echo "   │ AISSTREAM_API_KEY   → Get from https://aisstream.io         │"
    echo "   │                       (Free signup → API key in dashboard)  │"
    echo "   ├──────────────────────────────────────────────────────────────┤"
    echo "   │ OPENWEATHER_API_KEY → Get from https://openweathermap.org   │"
    echo "   │                       (Free signup → API keys tab)          │"
    echo "   ├──────────────────────────────────────────────────────────────┤"
    echo "   │ GOOGLE_MAPS_API_KEY → Get from Google Cloud Console         │"
    echo "   │                       (APIs & Services → Credentials)       │"
    echo "   └──────────────────────────────────────────────────────────────┘"
    echo ""
    echo -e "   ${BLUE}Tip: The app works in DEMO MODE without API keys.${NC}"
    echo "   You can test immediately and add real keys later."
fi
echo ""

# ── Step 5: Initialize Git repo ──
echo -e "${YELLOW}[5/7] Initializing Git repository...${NC}"

if [ -d ".git" ]; then
    echo "   Git repo already initialized. Skipping."
else
    if command -v git &> /dev/null; then
        git init --quiet
        
        # Create .gitignore
        cat > .gitignore << 'GITEOF'
# Python
.venv/
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/

# Environment
.env
*.env.local

# Firebase
config/firebase-service-account.json

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Node (frontend)
frontend/node_modules/
frontend/.next/
frontend/out/
GITEOF
        
        git add -A
        git commit -m "Initial scaffold: ChainSight multi-agent supply chain system" --quiet
        echo -e "   ${GREEN}✅ Git initialized with first commit${NC}"
    else
        echo "   Skipped (git not installed)"
    fi
fi
echo ""

# ── Step 6: Set up frontend (if Node.js available) ──
echo -e "${YELLOW}[6/7] Setting up frontend...${NC}"

if command -v node &> /dev/null; then
    cd frontend
    
    if [ -f "package.json" ]; then
        echo "   Frontend already initialized. Skipping."
    else
        echo "   Initializing Next.js project..."
        npx --yes create-next-app@latest . \
            --typescript \
            --tailwind \
            --app \
            --src-dir \
            --no-import-alias \
            --eslint \
            --no-turbopack \
            --yes 2>&1 | tail -3
        
        echo "   Installing additional frontend dependencies..."
        npm install @react-google-maps/api firebase recharts --quiet 2>&1 | tail -2
        
        echo -e "   ${GREEN}✅ Frontend initialized with Next.js + Tailwind + Google Maps${NC}"
    fi
    
    cd ..
else
    echo "   Skipped (Node.js not installed). Install later with:"
    echo "   cd frontend && npx create-next-app@latest . --typescript --tailwind --app"
fi
echo ""

# ── Step 7: Verify installation ──
echo -e "${YELLOW}[7/7] Verifying installation...${NC}"

echo -n "   google-adk: "
$PYTHON_CMD -c "import google.adk; print('✅ ' + google.adk.__version__)" 2>/dev/null || echo "❌ not found"

echo -n "   google-genai: "
$PYTHON_CMD -c "import google.genai; print('✅ installed')" 2>/dev/null || echo "❌ not found"

echo -n "   fastapi: "
$PYTHON_CMD -c "import fastapi; print('✅ ' + fastapi.__version__)" 2>/dev/null || echo "❌ not found"

echo -n "   networkx: "
$PYTHON_CMD -c "import networkx; print('✅ ' + networkx.__version__)" 2>/dev/null || echo "❌ not found"

echo -n "   firebase-admin: "
$PYTHON_CMD -c "import firebase_admin; print('✅ installed')" 2>/dev/null || echo "❌ not found"

echo -n "   websockets: "
$PYTHON_CMD -c "import websockets; print('✅ installed')" 2>/dev/null || echo "❌ not found"

echo -n "   adk CLI: "
if command -v adk &> /dev/null; then
    echo "✅ available"
else
    echo "⚠️  not in PATH (try: python -m google.adk.cli)"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        🎉 Setup Complete!                                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Next steps:"
echo ""
echo "  1. Add your API keys:"
echo -e "     ${BLUE}nano .env${NC}  (or open in your editor)"
echo ""
echo "  2. Activate venv (every new terminal):"
echo -e "     ${BLUE}source .venv/bin/activate${NC}"
echo ""
echo "  3. Test the Sentinel agent:"
echo -e "     ${BLUE}adk web agents/sentinel${NC}"
echo "     → Opens http://localhost:8000"
echo "     → Try: 'Scan the Asia-Europe corridor for disruptions'"
echo ""
echo "  4. Start all agents:"
echo -e "     ${BLUE}python launch_all.py${NC}"
echo ""
echo "  5. Start frontend (separate terminal):"
echo -e "     ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo -e "  ${YELLOW}⏰ Submission deadline: April 24, 2026 11:59 PM IST${NC}"
echo ""