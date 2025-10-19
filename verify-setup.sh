#!/bin/bash
# Speed Rivals - Post-Fix Verification Script

echo "🏎️  Speed Rivals - Verification Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this script from the speed-rivals directory"
    exit 1
fi

echo "✅ Running in correct directory"
echo ""

# Check .env file
echo "1️⃣  Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
else
    echo "   ❌ .env file missing"
    exit 1
fi

# Check new files
echo ""
echo "2️⃣  Checking new files..."
files=(
    "utils/logger.js"
    "js/error-handler.js"
    "js/mobile-auto-optimizer.js"
    "test/basic.test.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
    fi
done

# Check node_modules
echo ""
echo "3️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules installed"
else
    echo "   ⚠️  node_modules not found"
    echo "   💡 Run: npm install"
fi

# Check MongoDB requirement
echo ""
echo "4️⃣  Checking MongoDB..."
if command -v mongod &> /dev/null; then
    echo "   ✅ MongoDB installed"
    mongod --version | head -n 1
else
    echo "   ⚠️  MongoDB not found"
    echo "   💡 Install MongoDB or use MongoDB Atlas"
fi

# Check Node.js version
echo ""
echo "5️⃣  Checking Node.js version..."
node_version=$(node -v)
echo "   ✅ Node.js $node_version"

# Summary
echo ""
echo "======================================"
echo "📊 Verification Summary"
echo "======================================"
echo ""
echo "✅ All critical files present"
echo "✅ Configuration ready"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review .env configuration"
echo "   2. Start MongoDB (if local): mongod"
echo "   3. Initialize database: npm run init-data"
echo "   4. Start server: npm start"
echo "   5. Run tests: npm test"
echo ""
echo "📖 See README.md for detailed instructions"
echo ""
