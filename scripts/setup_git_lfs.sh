#!/bin/bash
# Setup Git LFS for the project
# Run this after installing Git LFS

set -e

echo ""
echo "=========================================="
echo "GIT LFS SETUP"
echo "=========================================="
echo ""

# Check if git-lfs is installed
if ! command -v git-lfs &> /dev/null; then
    echo "❌ Git LFS is not installed"
    echo ""
    echo "Please install Git LFS first:"
    echo ""
    echo "Option 1: Download from https://git-lfs.github.com/"
    echo ""
    echo "Option 2: Use package manager"
    echo "  macOS (Homebrew): brew install git-lfs"
    echo "  macOS (MacPorts): sudo port install git-lfs"
    echo "  Linux (Debian/Ubuntu): sudo apt-get install git-lfs"
    echo ""
    exit 1
fi

echo "✅ Git LFS is installed: $(git-lfs version)"
echo ""

# Initialize Git LFS in the repository
echo "1. Initializing Git LFS..."
git lfs install
echo "   ✅ Git LFS initialized"
echo ""

# Show what will be tracked
echo "2. Files configured to track with LFS:"
echo "   - data/processed/*.csv"
echo "   - data/validation/*.csv"
echo "   - *.pkl (model files)"
echo "   - data/models/*.pkl"
echo "   - data/validation/models/*.pkl"
echo ""

# Check current status
echo "3. Checking for large files..."
if [ -f "data/processed/enhanced_clinical_trials.csv" ]; then
    SIZE=$(du -h "data/processed/enhanced_clinical_trials.csv" | cut -f1)
    echo "   📊 enhanced_clinical_trials.csv: $SIZE"
else
    echo "   ⚠️  enhanced_clinical_trials.csv not found"
    echo "   Run: python3 scripts/collect_enhanced_trial_data.py"
fi
echo ""

# Check if files are already in git
echo "4. Checking git status..."
if git ls-files | grep -q "data/processed/enhanced_clinical_trials.csv"; then
    echo "   ⚠️  File is already tracked by git (not LFS)"
    echo ""
    echo "   To migrate to LFS, run:"
    echo "   git rm --cached data/processed/enhanced_clinical_trials.csv"
    echo "   git add data/processed/enhanced_clinical_trials.csv"
    echo "   git commit -m 'Migrate to Git LFS'"
else
    echo "   ✅ File not yet tracked - ready to add with LFS"
fi
echo ""

# Show next steps
echo "=========================================="
echo "✅ SETUP COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Add .gitattributes:"
echo "   git add .gitattributes"
echo ""
echo "2. Add your large files:"
echo "   git add data/processed/enhanced_clinical_trials.csv"
echo "   git add data/validation/models/*.pkl"
echo ""
echo "3. Commit and push:"
echo "   git commit -m 'Add data files via Git LFS'"
echo "   git push"
echo ""
echo "4. Verify LFS is working:"
echo "   git lfs ls-files"
echo ""
echo "GitHub Free Tier Limits:"
echo "  - Storage: 1 GB"
echo "  - Bandwidth: 1 GB/month"
echo "  - Your current usage will be minimal"
echo ""
