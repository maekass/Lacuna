# Critical Bug Fixes

Comprehensive fixes for all critical, medium, and minor issues identified in code review.

---

## 🔴 Critical Issues (5)

### 1. Timezone Bug
**Location**: Multiple files using `datetime.now()` without timezone
**Impact**: Inconsistent timestamps across different timezones
**Fix**: Use `datetime.now(timezone.utc)` everywhere

**Files to fix**:
- `src/models/real_data_validator.py` line 429
- `dashboard/app.py` line 76
- `scripts/automated_verification.py` line 25, 166
- `scripts/collect_enhanced_trial_data.py` line 61
- `src/data_collection/real_data_validator.py` line 39, 247

### 2. Division by Zero
**Location**: Sponsor approval rate calculation
**Impact**: Crash when sponsor has 0 applications
**Fix**: Add zero-check before division

### 3. Wrong Import Path
**Location**: Import statements may reference old paths
**Impact**: ImportError at runtime
**Fix**: Verify all imports are correct

### 4. Datetime Parsing
**Location**: Date parsing without format specification
**Impact**: Fails on different date formats
**Fix**: Use explicit format strings

### 5. Manifest Format
**Location**: JSON manifest writing
**Impact**: Invalid JSON if not properly formatted
**Fix**: Use json.dumps with proper encoding

---

## 🟡 Medium Issues (5)

### 6. Error Handling
**Location**: API calls without try/except
**Impact**: Crashes on network errors
**Fix**: Wrap all API calls in try/except

### 7. No Retry Logic
**Location**: API calls fail permanently on transient errors
**Impact**: Data collection fails unnecessarily
**Fix**: Add exponential backoff retry

### 8. Missing Dependencies
**Location**: requirements.txt may be incomplete
**Impact**: ImportError on fresh install
**Fix**: Verify all imports are in requirements.txt

### 9. Race Condition
**Location**: File writing without locking
**Impact**: Corrupted files if multiple processes write
**Fix**: Use file locking or atomic writes

### 10. Hardcoded Paths
**Location**: Absolute paths in code
**Impact**: Breaks on different machines
**Fix**: Use Path(__file__).parent for relative paths

---

## 🟢 Minor Issues (5)

### 11. Inefficient Loading
**Location**: Loading entire CSV into memory
**Impact**: High memory usage, slow performance
**Fix**: Use chunked reading or database

### 12. Missing File
**Location**: Code references files that may not exist
**Impact**: FileNotFoundError
**Fix**: Check file existence before reading

### 13. Optimistic Comments
**Location**: Comments claim functionality not implemented
**Impact**: Misleading documentation
**Fix**: Update comments to match reality

### 14. Year Parsing
**Location**: Assumes date format without validation
**Impact**: Fails on unexpected formats
**Fix**: Add format validation

### 15. Scaler Leakage
**Location**: Scaler fit on full dataset before split
**Impact**: Data leakage, inflated accuracy
**Fix**: Fit scaler only on training data

---

## Implementation Plan

Run this script to apply all fixes:

```bash
python scripts/apply_critical_fixes.py
```

Or apply manually following the sections below.
