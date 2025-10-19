#!/bin/bash
# Speed Rivals - Production Readiness Verification
# This script performs comprehensive checks for production deployment

echo "🏎️  Speed Rivals - Production Readiness Check"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

info() {
    echo -e "ℹ️  $1"
}

# Check if server is running
check_server() {
    echo "1️⃣  Checking Server Status..."
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        pass "Server is running on port 3000"
    else
        fail "Server is not running"
        info "Start with: npm start"
        return 1
    fi
    echo ""
}

# Check health endpoint
check_health() {
    echo "2️⃣  Checking Health Endpoint..."
    health=$(curl -s http://localhost:3000/health)
    
    if echo "$health" | grep -q '"status":"ok"'; then
        pass "Health endpoint returns OK"
    elif echo "$health" | grep -q '"status":"degraded"'; then
        warn "Health endpoint returns DEGRADED (MongoDB optional)"
    else
        fail "Health endpoint not responding properly"
    fi
    echo ""
}

# Check critical files
check_files() {
    echo "3️⃣  Checking Critical Files..."
    
    files=(
        "server.js:Server entry point"
        "package.json:Package configuration"
        ".env:Environment variables"
        "js/game.js:Main game logic"
        "js/car.js:Car physics"
        "js/track.js:Track generation"
        "js/ai-opponent.js:AI system"
        "js/error-handler.js:Error handling"
        "utils/logger.js:Logging system"
        "test/basic.test.js:Test suite"
    )
    
    for item in "${files[@]}"; do
        IFS=':' read -r file desc <<< "$item"
        if [ -f "$file" ]; then
            pass "$desc ($file)"
        else
            fail "$desc missing ($file)"
        fi
    done
    echo ""
}

# Check game pages
check_pages() {
    echo "4️⃣  Checking Game Pages..."
    
    pages=(
        "/:Main game"
        "/hub:Game hub"
        "/3d-working:3D racing"
        "/multiplayer:Multiplayer"
        "/mobile-racing:Mobile version"
    )
    
    for item in "${pages[@]}"; do
        IFS=':' read -r path desc <<< "$item"
        status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
        if [ "$status" = "200" ]; then
            pass "$desc ($path)"
        else
            fail "$desc ($path) - HTTP $status"
        fi
    done
    echo ""
}

# Check libraries
check_libraries() {
    echo "5️⃣  Checking Game Libraries..."
    
    # Check Three.js
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/libs/three.min.js")
    if [ "$status" = "200" ]; then
        pass "Three.js library accessible"
    else
        fail "Three.js library not found"
    fi
    
    # Check Cannon.js
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/libs/cannon.min.js")
    if [ "$status" = "200" ]; then
        pass "Cannon.js library accessible"
    else
        fail "Cannon.js library not found"
    fi
    echo ""
}

# Check API endpoints
check_api() {
    echo "6️⃣  Checking API Endpoints..."
    
    endpoints=(
        "/api/leaderboard:Leaderboard API"
        "/api/achievements:Achievements API"
    )
    
    for item in "${endpoints[@]}"; do
        IFS=':' read -r path desc <<< "$item"
        status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
        if [ "$status" = "200" ] || [ "$status" = "304" ]; then
            pass "$desc ($path)"
        else
            warn "$desc ($path) - HTTP $status (may require auth)"
        fi
    done
    echo ""
}

# Check PWA components
check_pwa() {
    echo "7️⃣  Checking PWA Components..."
    
    # Check manifest
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/manifest.json")
    if [ "$status" = "200" ]; then
        pass "PWA manifest.json accessible"
    else
        fail "PWA manifest.json not found"
    fi
    
    # Check service worker
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/sw.js")
    if [ "$status" = "200" ]; then
        pass "Service worker (sw.js) accessible"
    else
        fail "Service worker not found"
    fi
    echo ""
}

# Check Node.js and dependencies
check_environment() {
    echo "8️⃣  Checking Environment..."
    
    # Node.js version
    node_version=$(node -v)
    pass "Node.js version: $node_version"
    
    # npm packages
    if [ -d "node_modules" ]; then
        pass "Dependencies installed (node_modules exists)"
    else
        fail "Dependencies not installed - run: npm install"
    fi
    
    # .env file
    if [ -f ".env" ]; then
        pass "Environment file (.env) exists"
    else
        fail "Environment file (.env) missing"
    fi
    echo ""
}

# Check security headers
check_security() {
    echo "9️⃣  Checking Security..."
    
    headers=$(curl -s -I http://localhost:3000/)
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        pass "Security headers present"
    else
        warn "Security headers may be missing"
    fi
    
    if [ -f ".env" ] && grep -q "JWT_SECRET" ".env"; then
        pass "JWT secret configured"
    else
        warn "JWT secret should be set in .env"
    fi
    echo ""
}

# Performance check
check_performance() {
    echo "🔟  Checking Performance..."
    
    # Measure response time
    response_time=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:3000/)
    
    # Convert to integer milliseconds using awk instead of bc
    response_ms=$(echo "$response_time" | awk '{printf "%.0f", $1 * 1000}')
    
    if [ "$response_ms" -lt 1000 ]; then
        pass "Response time: ${response_ms}ms (excellent)"
    elif [ "$response_ms" -lt 2000 ]; then
        pass "Response time: ${response_ms}ms (good)"
    else
        warn "Response time: ${response_ms}ms (consider optimization)"
    fi
    echo ""
}

# Run all checks
check_server || exit 1
check_health
check_files
check_pages
check_libraries
check_api
check_pwa
check_environment
check_security
check_performance

# Summary
echo "=============================================="
echo "📊 Production Readiness Summary"
echo "=============================================="
echo ""
echo -e "${GREEN}✅ Passed:   $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed:   $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Review warnings (if any)"
    echo "   2. Configure production environment variables"
    echo "   3. Set up MongoDB (optional, for monetization)"
    echo "   4. Deploy to your hosting platform"
    echo ""
    echo "📖 Deployment guides available in README.md"
    exit 0
else
    echo -e "${RED}⚠️  NOT READY FOR PRODUCTION${NC}"
    echo ""
    echo "🔧 Fix the failed checks above before deploying"
    exit 1
fi
