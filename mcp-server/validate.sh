#!/bin/bash

# Cascade Registry MCP Server Validation Script
# Ensures everything is ready for Windsurf integration

set -e

echo "🔍 Validating Cascade Registry MCP Server..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Check 1: Node.js version
echo -n "Checking Node.js version... "
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Node.js is not installed"
    ERRORS=$((ERRORS + 1))
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Node.js version must be 18+. Current: $(node -v)"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ PASSED${NC} ($(node -v))"
    fi
fi

# Check 2: Python version
echo -n "Checking Python version... "
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Python 3 is not installed"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ PASSED${NC} ($(python3 --version))"
fi

# Check 3: node_modules installed
echo -n "Checking npm dependencies... "
if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Run: npm install"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ PASSED${NC}"
fi

# Check 4: TypeScript compiled
echo -n "Checking TypeScript build... "
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Run: npm run build"
    ERRORS=$((ERRORS + 1))
else
    SIZE=$(ls -lh dist/index.js | awk '{print $5}')
    echo -e "${GREEN}✓ PASSED${NC} (dist/index.js: $SIZE)"
fi

# Check 5: Package.json valid
echo -n "Checking package.json... "
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ FAILED${NC}"
    ERRORS=$((ERRORS + 1))
else
    if node -e "require('./package.json')" 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Invalid JSON"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 6: Data files exist
echo -n "Checking data files... "
if [ ! -d "../data/demo" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo "  Data not collected. Run: python3 ../src/data_collection/collect_all_data.py"
else
    TRIAL_FILES=$(ls -1 ../data/demo/clinical_trials_*.csv 2>/dev/null | wc -l)
    if [ "$TRIAL_FILES" -gt 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC} ($TRIAL_FILES trial files found)"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo "  No trial data files. Run data collection script."
    fi
fi

# Check 7: Documentation exists
echo -n "Checking documentation... "
DOCS=0
[ -f "README.md" ] && DOCS=$((DOCS + 1))
[ -f "QUICKSTART.md" ] && DOCS=$((DOCS + 1))
[ -f "USAGE_EXAMPLES.md" ] && DOCS=$((DOCS + 1))
[ -f "WINDSURF_INTEGRATION.md" ] && DOCS=$((DOCS + 1))

if [ "$DOCS" -eq 4 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (4/4 docs present)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} ($DOCS/4 docs present)"
fi

# Check 8: Shebang in index.js
echo -n "Checking executable shebang... "
if [ -f "dist/index.js" ]; then
    if head -n 1 dist/index.js | grep -q "^#!/usr/bin/env node"; then
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo "  Missing shebang (not critical)"
    fi
else
    echo -e "${RED}✗ SKIPPED${NC}"
fi

# Check 9: Project structure
echo -n "Checking project structure... "
REQUIRED_DIRS=("src" "dist")
MISSING_DIRS=()
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        MISSING_DIRS+=("$dir")
    fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Missing directories: ${MISSING_DIRS[*]}"
    ERRORS=$((ERRORS + 1))
fi

# Check 10: Windsurf config template
echo -n "Checking Windsurf config... "
if [ -f "windsurf-config.json" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo "  windsurf-config.json not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "The Cascade Registry MCP server is ready for Windsurf integration."
    echo ""
    echo "Next steps:"
    echo "1. Add to Windsurf MCP config:"
    echo "   cat windsurf-config.json"
    echo ""
    echo "2. Restart Windsurf"
    echo ""
    echo "3. Test with: 'What are the active trials for Sickle Cell Disease?'"
    echo ""
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo ""
    echo "Found $ERRORS error(s). Please fix them before integrating with Windsurf."
    echo ""
    echo "Run ./install.sh to fix common issues."
    echo ""
    exit 1
fi
