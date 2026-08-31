#!/bin/bash

# ==============================================================================
# CloudVault — Single-Command Project Launcher
# Usage: sh start-project.sh  OR  ./start-project.sh
# ==============================================================================

set -e

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║              🌟  CloudVault Private Cloud Storage                ║${NC}"
echo -e "${CYAN}${BOLD}║           Launching Backend, Frontend & Microservices            ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Check MongoDB
echo -e "${BLUE}▶ Checking MongoDB status...${NC}"
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✓ MongoDB is running.${NC}"
else
    echo -e "${YELLOW}ℹ MongoDB is not active. Attempting to start MongoDB service...${NC}"
    if command -v brew >/dev/null 2>&1; then
        brew services start mongodb-community || true
    elif [ -f "/opt/homebrew/bin/mongod" ]; then
        /opt/homebrew/bin/mongod --fork --logpath "$ROOT_DIR/scratch/mongod.log" --dbpath /opt/homebrew/var/mongodb || true
    fi
fi

# 2. Check and prepare .env configuration
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${YELLOW}ℹ Copying default environment configuration (.env)...${NC}"
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$ROOT_DIR/.env" "$BACKEND_DIR/.env"
fi

# 3. Create logs directory
mkdir -p "$ROOT_DIR/scratch/logs"
BACKEND_LOG="$ROOT_DIR/scratch/logs/backend.log"
FRONTEND_LOG="$ROOT_DIR/scratch/logs/frontend.log"

# Cleanup function on exit (Ctrl+C)
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down CloudVault services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Also kill any orphaned node processes on ports 3000 and 5173 if needed
    echo -e "${GREEN}✓ All CloudVault processes terminated cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 4. Start Backend API Server
echo -e "${BLUE}▶ Starting NestJS / Node.js Backend API on port 3000...${NC}"
cd "$BACKEND_DIR"
npm run start:dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend process launched (PID: $BACKEND_PID). Log: scratch/logs/backend.log${NC}"

# Wait for backend to become healthy
echo -e "${BLUE}▶ Waiting for Backend health check...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health | grep -q "healthy"; then
        echo -e "${GREEN}✓ Backend is healthy and listening on http://localhost:3000${NC}"
        break
    fi
    sleep 1
done

# 5. Start Frontend Vite Server
echo -e "${BLUE}▶ Starting Frontend Vite Application on port 5173...${NC}"
cd "$FRONTEND_DIR"
npm run dev -- --host > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend process launched (PID: $FRONTEND_PID). Log: scratch/logs/frontend.log${NC}"

# Wait for frontend to be ready
echo -e "${BLUE}▶ Waiting for Frontend application...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready on http://localhost:5173${NC}"
        break
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✨ CloudVault is running successfully!                         ${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 ${BOLD}Web Application:${NC}   ${CYAN}http://localhost:5173${NC}"
echo -e "  📡 ${BOLD}Backend API:${NC}       ${CYAN}http://localhost:3000/api/v1${NC}"
echo -e "  🛡️ ${BOLD}Security Health:${NC}   ${CYAN}http://localhost:3000/health${NC}"
echo ""
echo -e "  ${YELLOW}Press [Ctrl+C] to stop all services.${NC}"
echo ""

# Automatically open browser on macOS
if command -v open >/dev/null 2>&1; then
    open "http://localhost:5173" || true
fi

# Keep script running to monitor background processes
wait $BACKEND_PID $FRONTEND_PID
