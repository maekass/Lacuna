"""
Pytest configuration and fixtures
"""

import sys
from unittest.mock import MagicMock

# Mock streamlit before any imports try to use it
sys.modules['streamlit'] = MagicMock()
sys.modules['streamlit_lottie'] = MagicMock()

import pytest
import pandas as pd
import numpy as np
import tempfile
import shutil
from pathlib import Path


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing"""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def sample_clinical_trials():
    """Sample clinical trials DataFrame"""
    return pd.DataFrame({
        'nct_id': ['NCT12345678', 'NCT23456789', 'NCT34567890'],
        'phase': ['Phase 1', 'Phase 2', 'Phase 3'],
        'overall_status': ['Recruiting', 'Active, not recruiting', 'Completed'],
        'start_date': ['2023-01-15', '2023-02-20', '2023-03-10'],
        'completion_date': ['2024-01-15', '2024-02-20', '2024-03-10'],
        'enrollment_count': [50, 100, 200],
        'sponsor': ['University', 'Large Pharma', 'Small Biotech'],
        'intervention_type': ['Drug', 'Biological', 'Device'],
        'primary_outcome': ['Safety', 'Efficacy', 'Survival'],
    })


@pytest.fixture
def sample_stock_data():
    """Sample stock price DataFrame"""
    dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
    return pd.DataFrame({
        'date': dates,
        'ticker': ['CRSP'] * len(dates),
        'open': np.random.uniform(50, 100, len(dates)),
        'high': np.random.uniform(50, 100, len(dates)),
        'low': np.random.uniform(50, 100, len(dates)),
        'close': np.random.uniform(50, 100, len(dates)),
        'volume': np.random.randint(1000000, 10000000, len(dates)),
    })


@pytest.fixture
def sample_model_comparison():
    """Sample model comparison data"""
    return pd.DataFrame({
        'Model': ['RandomForest', 'GradientBoosting', 'XGBoost', 'LogisticRegression', 'Ensemble'],
        'Accuracy': [0.74, 0.76, 0.77, 0.71, 0.78],
        'Precision': [0.72, 0.75, 0.76, 0.69, 0.77],
        'Recall': [0.70, 0.73, 0.75, 0.68, 0.76],
        'F1-Score': [0.71, 0.74, 0.76, 0.69, 0.77],
    })


@pytest.fixture
def mock_api_response():
    """Mock API response for testing"""
    return {
        "status_code": 200,
        "json": {
            "studies": [
                {"protocolSection": {"identificationModule": {"nctId": "NCT12345678"}}}
            ]
        }
    }


@pytest.fixture
def benchmark():
    """Simple benchmark fixture"""
    import time
    
    class Benchmark:
        def __call__(self, func, *args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            end = time.time()
            print(f"Execution time: {end - start:.4f} seconds")
            return result
    
    return Benchmark()


@pytest.fixture(autouse=True)
def reset_cache():
    """Reset any caches before each test"""
    # Clear any module-level caches
    yield


@pytest.fixture
def valid_nct_id():
    """Valid NCT ID format"""
    return "NCT12345678"


@pytest.fixture
def invalid_nct_ids():
    """Invalid NCT ID formats"""
    return [
        "12345678",  # Missing NCT prefix
        "NCT123",    # Too short
        "nct12345678",  # Lowercase
        "NCT123456789012345",  # Too long
        "ABC12345678",  # Wrong prefix
    ]


@pytest.fixture
def sql_injection_payloads():
    """Common SQL injection payloads"""
    return [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "' UNION SELECT * FROM users --",
        "'; DELETE FROM trials WHERE 1=1; --",
        "1; SELECT * FROM passwords",
    ]


@pytest.fixture
def xss_payloads():
    """Common XSS payloads"""
    return [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "javascript:alert('xss')",
        "<iframe src='malicious.com'>",
        "<body onload=alert('xss')>",
    ]
