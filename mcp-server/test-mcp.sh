#!/bin/bash

# Simple test to verify the MCP server can be invoked
# This doesn't test full MCP protocol, just that the server starts

echo "Testing Cascade Registry MCP Server..."
echo ""

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js not found"
    echo "Run: npm run build"
    exit 1
fi

# Try to start the server (it will wait for stdin, so we'll timeout)
echo "Starting MCP server (will timeout in 2 seconds)..."
timeout 2s node dist/index.js 2>&1 | head -n 5 &

# Wait a moment
sleep 1

# Check if node process started
if pgrep -f "node.*dist/index.js" > /dev/null; then
    echo "✅ MCP server started successfully!"
    echo ""
    echo "The server is running and waiting for MCP protocol messages on stdio."
    echo "This is expected behavior."
    echo ""
    pkill -f "node.*dist/index.js"
    exit 0
else
    echo "⚠️  Server may have exited. Check for errors above."
    exit 1
fi
