"""
Comprehensive Tests for Data Loading Functions
Covers: Happy path, edge cases, error handling, type validation
"""

import pytest
import pandas as pd
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dashboard.app import (
    load_csv,
    load_ml_json,
    load_manifest,
    load_certification,
    _ml_artifacts_ready,
    _quant_artifacts_ready,
    DATA,
    ML_DATA,
    QUANT_DATA,
    ROOT
)


class TestLoadCSV:
    """Test load_csv function with comprehensive scenarios"""
    
    def test_happy_path_existing_file(self, tmp_path):
        """Happy path: File exists and loads successfully"""
        # Arrange
        test_file = tmp_path / "test.csv"
        test_data = pd.DataFrame({
            'col1': [1, 2, 3],
            'col2': ['a', 'b', 'c']
        })
        test_data.to_csv(test_file, index=False)
        
        # Act
        result = load_csv("test.csv", base=tmp_path)
        
        # Assert
        assert result is not None
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 3
        assert list(result.columns) == ['col1', 'col2']
    
    def test_edge_case_empty_file(self, tmp_path):
        """Edge case: Empty CSV file"""
        # Arrange
        test_file = tmp_path / "empty.csv"
        test_file.write_text("")
        
        # Act & Assert
        with pytest.raises(pd.errors.EmptyDataError):
            load_csv("empty.csv", base=tmp_path)
    
    def test_edge_case_missing_file(self, tmp_path):
        """Edge case: File doesn't exist - should return None"""
        # Act
        result = load_csv("nonexistent.csv", base=tmp_path)
        
        # Assert
        assert result is None
    
    def test_edge_case_malformed_csv(self, tmp_path):
        """Edge case: Malformed CSV content"""
        # Arrange
        test_file = tmp_path / "malformed.csv"
        test_file.write_text("col1,col2\n1,2\n3")  # Missing value in row 2
        
        # Act
        result = load_csv("malformed.csv", base=tmp_path)
        
        # Assert - pandas handles this gracefully
        assert result is not None
        assert isinstance(result, pd.DataFrame)
    
    def test_type_validation_invalid_base(self):
        """Type validation: Invalid base type"""
        # Act & Assert
        with pytest.raises((TypeError, AttributeError)):
            load_csv("test.csv", base="invalid_string")
    
    def test_type_validation_none_filename(self, tmp_path):
        """Type validation: None filename"""
        # Act & Assert
        with pytest.raises((TypeError, AttributeError)):
            load_csv(None, base=tmp_path)
    
    def test_boundary_large_file(self, tmp_path):
        """Boundary condition: Very large CSV file"""
        # Arrange
        test_file = tmp_path / "large.csv"
        large_data = pd.DataFrame({
            'col1': range(100000),
            'col2': ['data'] * 100000
        })
        large_data.to_csv(test_file, index=False)
        
        # Act
        result = load_csv("large.csv", base=tmp_path)
        
        # Assert
        assert result is not None
        assert len(result) == 100000
    
    def test_boundary_special_characters(self, tmp_path):
        """Boundary condition: Special characters in data"""
        # Arrange
        test_file = tmp_path / "special.csv"
        test_data = pd.DataFrame({
            'col1': ['test\n', 'test\t', 'test,', 'test"', "test'"],
            'col2': [1, 2, 3, 4, 5]
        })
        test_data.to_csv(test_file, index=False)
        
        # Act
        result = load_csv("special.csv", base=tmp_path)
        
        # Assert
        assert result is not None
        assert len(result) == 5


class TestLoadMLJson:
    """Test load_ml_json function"""
    
    def test_happy_path_valid_json(self, tmp_path):
        """Happy path: Valid JSON loads successfully"""
        # Arrange
        ml_dir = tmp_path / "ml"
        ml_dir.mkdir()
        test_file = ml_dir / "model.json"
        test_data = {"accuracy": 0.78, "features": ["phase", "enrollment"]}
        test_file.write_text(json.dumps(test_data))
        
        # Patch ML_DATA to use tmp_path
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act
            result = load_ml_json("model.json")
            
            # Assert
            assert result is not None
            assert result["accuracy"] == 0.78
            assert len(result["features"]) == 2
    
    def test_edge_case_missing_file(self, tmp_path):
        """Edge case: JSON file doesn't exist"""
        # Arrange
        ml_dir = tmp_path / "ml"
        ml_dir.mkdir()
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act
            result = load_ml_json("nonexistent.json")
            
            # Assert
            assert result is None
    
    def test_edge_case_invalid_json(self, tmp_path):
        """Edge case: Invalid JSON content"""
        # Arrange
        ml_dir = tmp_path / "ml"
        ml_dir.mkdir()
        test_file = ml_dir / "invalid.json"
        test_file.write_text("{invalid json}")
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act & Assert
            with pytest.raises(json.JSONDecodeError):
                load_ml_json("invalid.json")
    
    def test_edge_case_empty_json(self, tmp_path):
        """Edge case: Empty JSON file"""
        # Arrange
        ml_dir = tmp_path / "ml"
        ml_dir.mkdir()
        test_file = ml_dir / "empty.json"
        test_file.write_text("")
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act & Assert
            with pytest.raises(json.JSONDecodeError):
                load_ml_json("empty.json")
    
    def test_type_validation_none_filename(self, tmp_path):
        """Type validation: None filename"""
        # Arrange
        ml_dir = tmp_path / "ml"
        ml_dir.mkdir()
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act & Assert
            with pytest.raises((TypeError, AttributeError)):
                load_ml_json(None)
    
    def test_security_path_traversal(self, tmp_path):
        """Security: Path traversal attempt"""
        # Arrange
        ml_dir = tmp_path / "ml"
        ml_dir.mkdir()
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act - this should be handled safely
            result = load_ml_json("../../../etc/passwd")
            
            # Assert - should return None (file doesn't exist in safe path)
            assert result is None


class TestLoadManifest:
    """Test load_manifest function"""
    
    def test_happy_path_valid_manifest(self, tmp_path):
        """Happy path: Valid manifest loads"""
        # Arrange
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        manifest_file = data_dir / "data_manifest.json"
        manifest_data = {
            "sources": [
                {"name": "clinical_trials", "type": "sourced_public"}
            ]
        }
        manifest_file.write_text(json.dumps(manifest_data))
        
        # Patch DATA
        with patch('dashboard.app.DATA', data_dir):
            # Act
            result = load_manifest()
            
            # Assert
            assert result is not None
            assert "sources" in result
    
    def test_edge_case_missing_manifest(self, tmp_path):
        """Edge case: Manifest file missing"""
        # Arrange
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        
        # Patch DATA
        with patch('dashboard.app.DATA', data_dir):
            # Act
            result = load_manifest()
            
            # Assert
            assert result is None
    
    def test_edge_case_corrupted_manifest(self, tmp_path):
        """Edge case: Corrupted JSON"""
        # Arrange
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        manifest_file = data_dir / "data_manifest.json"
        manifest_file.write_text("{corrupted")
        
        # Patch DATA
        with patch('dashboard.app.DATA', data_dir):
            # Act & Assert
            with pytest.raises(json.JSONDecodeError):
                load_manifest()


class TestMLArtifactsReady:
    """Test ML artifacts checking functions"""
    
    def test_happy_path_artifacts_present(self, tmp_path):
        """Happy path: All ML artifacts present"""
        # Arrange
        ml_dir = tmp_path / "processed"
        ml_dir.mkdir(parents=True)
        (ml_dir / "model_comparison.csv").write_text("model,accuracy\nrf,0.74")
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act
            result = _ml_artifacts_ready()
            
            # Assert
            assert result is True
    
    def test_edge_case_missing_artifacts(self, tmp_path):
        """Edge case: ML artifacts missing"""
        # Arrange
        ml_dir = tmp_path / "processed"
        ml_dir.mkdir(parents=True)
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act
            result = _ml_artifacts_ready()
            
            # Assert
            assert result is False
    
    def test_edge_case_empty_directory(self, tmp_path):
        """Edge case: Empty ML directory"""
        # Arrange
        ml_dir = tmp_path / "processed"
        ml_dir.mkdir(parents=True)
        
        # Patch ML_DATA
        with patch('dashboard.app.ML_DATA', ml_dir):
            # Act
            result = _ml_artifacts_ready()
            
            # Assert
            assert result is False


class TestPerformanceStress:
    """Performance and stress tests"""
    
    def test_performance_large_csv(self, tmp_path, benchmark):
        """Performance: Load large CSV efficiently"""
        # Arrange
        test_file = tmp_path / "large.csv"
        large_data = pd.DataFrame({
            'col1': range(1000000),
            'col2': ['data'] * 1000000
        })
        large_data.to_csv(test_file, index=False)
        
        # Act & Assert - Should complete in reasonable time
        result = benchmark(load_csv, "large.csv", base=tmp_path)
        assert result is not None
    
    def test_stress_many_files(self, tmp_path):
        """Stress test: Many files in directory"""
        # Arrange
        for i in range(100):
            test_file = tmp_path / f"file_{i}.csv"
            pd.DataFrame({'col': [1, 2, 3]}).to_csv(test_file, index=False)
        
        # Act - Load multiple files
        results = []
        for i in range(100):
            result = load_csv(f"file_{i}.csv", base=tmp_path)
            results.append(result)
        
        # Assert
        assert all(r is not None for r in results)


class TestErrorHandling:
    """Error handling scenarios"""
    
    def test_error_permission_denied(self, tmp_path):
        """Error handling: Permission denied"""
        # Arrange
        test_file = tmp_path / "protected.csv"
        pd.DataFrame({'col': [1]}).to_csv(test_file, index=False)
        test_file.chmod(0o000)  # Remove all permissions
        
        try:
            # Act & Assert
            with pytest.raises((PermissionError, OSError)):
                load_csv("protected.csv", base=tmp_path)
        finally:
            # Restore permissions for cleanup
            test_file.chmod(0o644)
    
    def test_error_directory_instead_of_file(self, tmp_path):
        """Error handling: Directory instead of file"""
        # Arrange
        (tmp_path / "not_a_file").mkdir()
        
        # Act & Assert
        with pytest.raises((IsADirectoryError, PermissionError, OSError)):
            load_csv("not_a_file", base=tmp_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
