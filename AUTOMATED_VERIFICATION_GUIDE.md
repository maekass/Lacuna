# Automated Verification System

**Status:** ✅ **ACTIVE**  
**Last Updated:** May 20, 2026

---

## 🎯 Overview

Automated verification system that continuously monitors data quality, API health, and ensures no synthetic data in production.

---

## 🚀 Quick Start

### Run Verification Now

```bash
python3 scripts/automated_verification.py
```

### Setup Automated Verification

```bash
bash scripts/setup_automated_verification.sh
```

This will configure:
- ✅ Git hooks (runs on commit)
- ✅ GitHub Actions (runs on push/PR/daily)
- ✅ Optional cron job (runs daily)
- ✅ Verification dashboard

---

## 📋 What Gets Verified

### 1. **API Health Check**
- Tests ClinicalTrials.gov API v2 connectivity
- Measures response time
- Alerts if API is down

### 2. **Data Quality Check**
- Verifies field completeness thresholds:
  - `nct_id`: 100% required
  - `status`: 100% required
  - `sponsor_type`: 100% required
  - `outcome`: 100% required
  - `enrollment`: 95% required
- Alerts if any field below threshold

### 3. **Data Freshness Check**
- Checks collection date
- Warns if data is >30 days old
- Recommends refresh

### 4. **Synthetic Data Detection**
- Scans data manifest for "illustrative" markers
- Checks for demo/test data patterns
- Blocks commit if synthetic data detected

---

## 🔄 Automation Levels

### Level 1: Manual (Always Available)

```bash
# Run full verification
python3 scripts/automated_verification.py

# Run specific checks
python3 scripts/validate_real_data.py
python3 scripts/verify_enhanced_data.py
python3 scripts/debug_enhanced_data.py
```

### Level 2: Git Hooks (Local)

**Runs automatically on:**
- Every `git commit`
- When data files or parser modified

**Setup:**
```bash
git config core.hooksPath .githooks
```

**What it does:**
- Validates data quality before commit
- Tests parser if modified
- Blocks commit if checks fail

### Level 3: GitHub Actions (CI/CD)

**Runs automatically on:**
- Every push to main/develop
- Every pull request
- Daily at 2 AM UTC
- Manual trigger

**What it does:**
- Full verification suite
- API health check
- Data quality validation
- Synthetic data detection
- Comments on PRs with results

**View workflow:**
```
.github/workflows/data-verification.yml
```

### Level 4: Cron Job (Scheduled)

**Runs:**
- Daily at 2 AM (configurable)

**Setup:**
```bash
# Add to crontab
0 2 * * * cd /path/to/project && python3 scripts/automated_verification.py >> logs/verification.log 2>&1
```

**Logs:**
```bash
tail -f logs/verification.log
```

---

## 📊 Verification Dashboard

### View Dashboard

```bash
open verification_dashboard.html
```

**Features:**
- Real-time verification status
- Check results for each component
- Alerts and warnings
- Auto-refresh every 60 seconds
- Manual refresh button

### Dashboard Screenshot

```
┌─────────────────────────────────────────┐
│  🔍 Data Verification Dashboard         │
│  Last updated: May 20, 2026 3:43 AM     │
│  [🔄 Refresh] [▶️ Run Verification]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  API Health              ✅ PASS         │
│  Response time: 245ms                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Data Quality            ✅ PASS         │
│  nct_id: 100.0%                          │
│  status: 100.0%                          │
│  outcome: 100.0%                         │
└─────────────────────────────────────────┘
```

---

## 🔔 Alerts & Notifications

### Alert Types

| Alert | Severity | Action |
|-------|----------|--------|
| API Down | 🔴 Critical | Check ClinicalTrials.gov status |
| Data Quality < Threshold | 🔴 Critical | Re-collect data |
| Synthetic Data Detected | 🔴 Critical | Remove synthetic data |
| Data >30 days old | 🟡 Warning | Consider refresh |

### Where Alerts Appear

1. **Console Output** - When running scripts
2. **GitHub PR Comments** - Automatic on pull requests
3. **Verification Dashboard** - Real-time display
4. **Log Files** - `logs/verification.log`
5. **JSON Report** - `data/raw/automated_verification.json`

---

## 📁 Files & Structure

```
.github/workflows/
  └── data-verification.yml          # GitHub Actions workflow

.githooks/
  └── pre-commit                      # Git pre-commit hook

scripts/
  ├── automated_verification.py      # Main verification script
  ├── validate_real_data.py          # API validation
  ├── verify_enhanced_data.py        # Data verification
  ├── debug_enhanced_data.py         # Debug suite
  └── setup_automated_verification.sh # Setup script

data/raw/
  └── automated_verification.json    # Latest results

logs/
  └── verification.log                # Cron job logs

verification_dashboard.html          # Web dashboard
```

---

## 🛠️ Configuration

### Adjust Quality Thresholds

Edit `scripts/automated_verification.py`:

```python
thresholds = {
    'nct_id': 100.0,      # Must be 100%
    'status': 100.0,      # Must be 100%
    'sponsor_type': 100.0, # Must be 100%
    'outcome': 100.0,     # Must be 100%
    'enrollment': 95.0,   # At least 95% (adjust here)
}
```

### Change Freshness Warning

```python
# Warn if older than 30 days (adjust here)
if age_days > 30:
    # warning logic
```

### Modify GitHub Actions Schedule

Edit `.github/workflows/data-verification.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC (adjust here)
```

---

## 🧪 Testing

### Test Individual Components

```bash
# Test API health
python3 -c "from scripts.automated_verification import AutomatedVerification; v = AutomatedVerification(); v.check_api_health()"

# Test data quality
python3 -c "from scripts.automated_verification import AutomatedVerification; v = AutomatedVerification(); v.check_data_quality()"

# Test synthetic data detection
python3 -c "from scripts.automated_verification import AutomatedVerification; v = AutomatedVerification(); v.check_no_synthetic_data()"
```

### Test Git Hook

```bash
# Make a change
echo "# test" >> README.md

# Try to commit (hook will run)
git add README.md
git commit -m "test"

# Hook should run verification
```

### Test GitHub Actions Locally

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run workflow
act -j verify-data-quality
```

---

## 📈 Monitoring

### Check Verification History

```bash
# View latest results
cat data/raw/automated_verification.json | python3 -m json.tool

# View cron logs
tail -100 logs/verification.log

# View GitHub Actions runs
# Visit: https://github.com/YOUR_REPO/actions
```

### Verification Metrics

Track over time:
- API response time
- Data completeness percentages
- Data freshness (days)
- Number of alerts

---

## 🚨 Troubleshooting

### Verification Fails

**Problem:** API health check fails

**Solution:**
```bash
# Check if API is accessible
curl "https://clinicaltrials.gov/api/v2/studies?query.cond=cancer&pageSize=1"

# If down, wait and retry
# If up, check network/firewall
```

**Problem:** Data quality below threshold

**Solution:**
```bash
# Re-collect data
python3 scripts/collect_enhanced_trial_data.py

# Verify again
python3 scripts/automated_verification.py
```

**Problem:** Synthetic data detected

**Solution:**
```bash
# Check which files
cat data/raw/automated_verification.json | grep synthetic_files

# Remove or regenerate with real data
# Then verify again
```

### Git Hook Not Running

```bash
# Ensure hooks path is set
git config core.hooksPath .githooks

# Ensure hook is executable
chmod +x .githooks/pre-commit

# Test manually
.githooks/pre-commit
```

### GitHub Actions Not Running

1. Check workflow file exists: `.github/workflows/data-verification.yml`
2. Check branch protection rules
3. View Actions tab in GitHub
4. Check workflow permissions

---

## 💡 Best Practices

### 1. Run Before Committing

```bash
# Always verify before commit
python3 scripts/automated_verification.py
git add -A
git commit -m "your message"
```

### 2. Monitor Dashboard Regularly

- Check dashboard daily
- Review alerts immediately
- Keep data fresh (<30 days)

### 3. Keep Thresholds Strict

- Don't lower quality thresholds
- Maintain 100% for critical fields
- Fix data issues, don't adjust thresholds

### 4. Review Logs

```bash
# Check cron logs weekly
tail -100 logs/verification.log

# Look for patterns
grep "FAIL" logs/verification.log
```

### 5. Update Dependencies

```bash
# Keep verification tools updated
pip install --upgrade requests pandas
```

---

## 📚 Related Documentation

- `ENHANCED_DATA_SUMMARY.md` - Data collection guide
- `REAL_DATA_SUMMARY.md` - Validation results
- `docs/REAL_DATA_VALIDATION.md` - Methodology

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] Automated verification setup complete
- [ ] Git hooks configured and tested
- [ ] GitHub Actions workflow active
- [ ] All checks passing
- [ ] No synthetic data detected
- [ ] Data quality thresholds met
- [ ] API health confirmed
- [ ] Dashboard accessible
- [ ] Alerts configured
- [ ] Logs being captured

---

## 🎉 Summary

Your automated verification system:

✅ **Runs automatically** on commit, push, PR, and daily  
✅ **Monitors 4 key areas** (API, quality, freshness, synthetic data)  
✅ **Blocks bad commits** via git hooks  
✅ **Comments on PRs** with results  
✅ **Provides dashboard** for real-time monitoring  
✅ **Logs everything** for audit trail  

**Your data quality is now continuously monitored! 🚀**

---

**Last Verification:** Run `python3 scripts/automated_verification.py` to check current status
