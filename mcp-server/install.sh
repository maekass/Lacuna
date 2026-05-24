#!/bin/bash

# Cascade Registry MCP Server Installation Script

set -e

echo "🔬 Installing Cascade Registry MCP Server..."
echo ""

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Python $(python3 --version) detected"

# Install npm dependencies
echo ""
echo "Installing npm dependencies..."
npm install

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build

# Make the script executable
chmod +x dist/index.js

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Ensure the Cascade Registry data is collected:"
echo "   cd .."
echo "   python3 src/data_collection/collect_all_data.py"
echo ""
echo "2. Add to your MCP client configuration:"
echo "   {"
echo "     \"cascade-registry\": {"
echo "       \"command\": \"node\","
echo "       \"args\": [\"$(pwd)/dist/index.js\"]"
echo "     }"
echo "   }"
echo ""
echo "3. Restart your MCP client (Cascade, Claude Desktop, etc.)"
echo ""
echo "🎉 Ready to use! The MCP server provides 10 tools for biotech/pharma research."
