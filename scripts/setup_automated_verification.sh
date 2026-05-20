#!/bin/bash
# Setup automated verification
# This script configures automated data verification to run periodically

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "=========================================="
echo "AUTOMATED VERIFICATION SETUP"
echo "=========================================="
echo ""

# 1. Setup git hooks
echo "1. Setting up git hooks..."
if [ -d ".githooks" ]; then
    git config core.hooksPath .githooks
    chmod +x .githooks/pre-commit
    echo "   ✅ Git hooks configured"
else
    echo "   ⚠️  .githooks directory not found"
fi

# 2. Test verification script
echo ""
echo "2. Testing verification script..."
if python3 scripts/automated_verification.py; then
    echo "   ✅ Verification script works"
else
    echo "   ❌ Verification script failed"
    exit 1
fi

# 3. Setup cron job (optional)
echo ""
echo "3. Cron job setup (optional)"
echo "   To run verification daily at 2 AM, add this to your crontab:"
echo ""
echo "   0 2 * * * cd $PROJECT_ROOT && python3 scripts/automated_verification.py >> logs/verification.log 2>&1"
echo ""
read -p "   Add to crontab now? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create logs directory
    mkdir -p logs
    
    # Add cron job
    CRON_CMD="0 2 * * * cd $PROJECT_ROOT && python3 scripts/automated_verification.py >> $PROJECT_ROOT/logs/verification.log 2>&1"
    
    # Check if already exists
    if crontab -l 2>/dev/null | grep -q "automated_verification.py"; then
        echo "   ⚠️  Cron job already exists"
    else
        (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
        echo "   ✅ Cron job added"
        echo "   📄 Logs will be saved to: logs/verification.log"
    fi
fi

# 4. Setup GitHub Actions (already done via workflow file)
echo ""
echo "4. GitHub Actions"
if [ -f ".github/workflows/data-verification.yml" ]; then
    echo "   ✅ GitHub Actions workflow configured"
    echo "   📄 .github/workflows/data-verification.yml"
else
    echo "   ⚠️  GitHub Actions workflow not found"
fi

# 5. Create verification dashboard
echo ""
echo "5. Creating verification dashboard..."
cat > verification_dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Data Verification Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-pass { border-left: 4px solid #4caf50; }
        .status-fail { border-left: 4px solid #f44336; }
        .status-warn { border-left: 4px solid #ff9800; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-pass { background: #e8f5e9; color: #2e7d32; }
        .badge-fail { background: #ffebee; color: #c62828; }
        .badge-warn { background: #fff3e0; color: #e65100; }
        button {
            background: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover { background: #1565c0; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Data Verification Dashboard</h1>
        <p class="timestamp">Last updated: <span id="timestamp">Loading...</span></p>
        <button onclick="loadResults()">🔄 Refresh</button>
        <button onclick="runVerification()">▶️ Run Verification</button>
    </div>
    
    <div id="results">
        <p>Loading verification results...</p>
    </div>
    
    <script>
        async function loadResults() {
            try {
                const response = await fetch('data/raw/automated_verification.json');
                const data = await response.json();
                
                document.getElementById('timestamp').textContent = 
                    new Date(data.timestamp).toLocaleString();
                
                let html = '';
                
                for (const [checkName, result] of Object.entries(data.checks)) {
                    const status = result.status || 'UNKNOWN';
                    const statusClass = `status-${status.toLowerCase()}`;
                    const badgeClass = `badge-${status.toLowerCase()}`;
                    
                    html += `
                        <div class="status-card ${statusClass}">
                            <h3>${checkName} <span class="badge ${badgeClass}">${status}</span></h3>
                            <pre>${JSON.stringify(result, null, 2)}</pre>
                        </div>
                    `;
                }
                
                if (data.alerts && data.alerts.length > 0) {
                    html += `
                        <div class="status-card status-warn">
                            <h3>⚠️ Alerts</h3>
                            <ul>
                                ${data.alerts.map(a => `<li>${a}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                document.getElementById('results').innerHTML = html;
            } catch (error) {
                document.getElementById('results').innerHTML = 
                    `<div class="status-card status-fail">
                        <h3>❌ Error</h3>
                        <p>Failed to load verification results: ${error.message}</p>
                    </div>`;
            }
        }
        
        async function runVerification() {
            alert('Run: python3 scripts/automated_verification.py');
        }
        
        // Load on page load
        loadResults();
        
        // Auto-refresh every 60 seconds
        setInterval(loadResults, 60000);
    </script>
</body>
</html>
EOF

echo "   ✅ Dashboard created: verification_dashboard.html"

# Summary
echo ""
echo "=========================================="
echo "✅ SETUP COMPLETE"
echo "=========================================="
echo ""
echo "Automated verification is now configured:"
echo ""
echo "1. ✅ Git hooks (runs on commit)"
echo "2. ✅ Verification script (scripts/automated_verification.py)"
echo "3. ✅ GitHub Actions (runs on push/PR/daily)"
echo "4. ✅ Dashboard (verification_dashboard.html)"
echo ""
echo "To run verification manually:"
echo "  python3 scripts/automated_verification.py"
echo ""
echo "To view dashboard:"
echo "  open verification_dashboard.html"
echo ""
