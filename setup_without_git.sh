#!/bin/bash
# ChainSight — Local Setup (No Git)
# Usage:  chmod +x setup_without_git.sh && ./setup_without_git.sh

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo ""
echo -e "${BLUE}  🌊 ChainSight — Local Setup${NC}"
echo ""

# ── Check Python 3.12+ ──
echo -e "${YELLOW}[1/4] Checking Python...${NC}"
PY=""
command -v python3 &>/dev/null && PY="python3" || { command -v python &>/dev/null && PY="python"; }
[ -z "$PY" ] && echo -e "${RED}❌ Python not found. Install 3.12+ from python.org${NC}" && exit 1

VER=$($PY --version 2>&1 | awk '{print $2}')
MAJOR=$(echo $VER | cut -d. -f1); MINOR=$(echo $VER | cut -d. -f2)
[ "$MAJOR" -lt 3 ] || [ "$MINOR" -lt 12 ] && echo -e "${RED}❌ Need Python 3.12+, got $VER${NC}" && exit 1
echo -e "   ${GREEN}✅ Python $VER${NC}"

# ── Create & activate venv ──
echo -e "${YELLOW}[2/4] Virtual environment...${NC}"
[ ! -d ".venv" ] && $PY -m venv .venv
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
echo -e "   ${GREEN}✅ .venv activated${NC}"

# ── Install packages ──
echo -e "${YELLOW}[3/4] Installing packages (~1-2 min)...${NC}"
pip install --upgrade pip -q
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
    -q 2>&1 | tail -3
echo -e "   ${GREEN}✅ Done${NC}"

# ── Setup .env ──
echo -e "${YELLOW}[4/4] Environment config...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "   ${GREEN}✅ Created .env from template${NC}"
    echo ""
    echo "   Add your keys (works in demo mode without them):"
    echo "   GOOGLE_API_KEY      → https://aistudio.google.com"
    echo "   AISSTREAM_API_KEY   → https://aisstream.io"
    echo "   OPENWEATHER_API_KEY → https://openweathermap.org"
    echo "   GOOGLE_MAPS_API_KEY → Google Cloud Console"
else
    echo "   .env exists, skipping."
fi

# ── Verify ──
echo ""
echo -n "   Verify: "
$PY -c "import google.adk; print('adk✅', end=' ')" 2>/dev/null || echo -n "adk❌ "
$PY -c "import google.genai; print('genai✅', end=' ')" 2>/dev/null || echo -n "genai❌ "
$PY -c "import fastapi; print('fastapi✅', end=' ')" 2>/dev/null || echo -n "fastapi❌ "
$PY -c "import networkx; print('nx✅', end=' ')" 2>/dev/null || echo -n "nx❌ "
echo ""

echo ""
echo -e "${GREEN}  🎉 Ready! Next steps:${NC}"
echo ""
echo -e "  ${BLUE}source .venv/bin/activate${NC}"
echo -e "  ${BLUE}nano .env${NC}                        # add GOOGLE_API_KEY"
echo -e "  ${BLUE}adk web agents/sentinel${NC}           # test at localhost:8000"
echo -e "  ${BLUE}python launch_all.py${NC}              # all agents"
echo ""