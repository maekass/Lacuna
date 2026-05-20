#!/usr/bin/env python3
"""
Run real data validation

This script:
1. Fetches real clinical trial data from ClinicalTrials.gov
2. Trains models on historical data (2010-2020)
3. Validates on recent data (2021-2023)
4. Compares to published benchmarks
5. Generates validation report

Usage:
    python scripts/validate_with_real_data.py
"""

import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.models.real_data_validator import main

if __name__ == "__main__":
    print("Starting real data validation...")
    print("This will fetch data from ClinicalTrials.gov API")
    print("Estimated time: 5-10 minutes\n")
    
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nValidation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError during validation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
