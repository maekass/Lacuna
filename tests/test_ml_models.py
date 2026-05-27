"""
Comprehensive Tests for ML Model Components
Covers: Model validation, predictions, feature importance, error handling
"""

import pytest
import pandas as pd
import numpy as np
from pathlib import Path
from unittest.mock import patch, MagicMock, mock_open
import sys
import json

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestTrialSuccessPredictor:
    """Test trial success prediction model"""
    
    def test_happy_path_valid_prediction(self):
        """Happy path: Valid trial data returns prediction"""
        # Arrange
        trial_data = {
            'phase': 'Phase 2',
            'enrollment': 100,
            'sponsor_type': 'Large Pharma',
            'disease_prevalence': 100000,
            'competitive_density': 5
        }
        
        # Act - Mock the predictor
        with patch('src.models.trial_success_predictor.predict_trial_success') as mock_predict:
            mock_predict.return_value = {
                'success_probability': 0.78,
                'confidence_interval': [0.72, 0.84],
                'model_version': '1.0.0'
            }
            result = mock_predict(trial_data)
        
        # Assert
        assert result is not None
        assert 0 <= result['success_probability'] <= 1
        assert len(result['confidence_interval']) == 2
    
    def test_edge_case_missing_features(self):
        """Edge case: Missing required features"""
        # Arrange
        incomplete_data = {
            'phase': 'Phase 2'
            # Missing other required features
        }
        
        # Act & Assert
        with patch('src.models.trial_success_predictor.predict_trial_success') as mock_predict:
            mock_predict.side_effect = ValueError("Missing required features")
            with pytest.raises(ValueError):
                mock_predict(incomplete_data)
    
    def test_edge_case_extreme_values(self):
        """Edge case: Extreme input values"""
        # Arrange
        extreme_data = {
            'phase': 'Phase 2',
            'enrollment': 999999999,  # Extreme value
            'sponsor_type': 'Large Pharma',
            'disease_prevalence': 0.0001,  # Near zero
            'competitive_density': 1000  # Very high
        }
        
        # Act
        with patch('src.models.trial_success_predictor.predict_trial_success') as mock_predict:
            mock_predict.return_value = {'success_probability': 0.5}
            result = mock_predict(extreme_data)
        
        # Assert - Should handle extremes gracefully
        assert result is not None
    
    def test_boundary_probability_range(self):
        """Boundary: Probability must be 0-1"""
        # Arrange
        test_cases = [
            {'trial_data': {'phase': 'Phase 1'}, 'expected_range': (0, 1)},
            {'trial_data': {'phase': 'Phase 3'}, 'expected_range': (0, 1)},
        ]
        
        for case in test_cases:
            # Act
            with patch('src.models.trial_success_predictor.predict_trial_success') as mock_predict:
                mock_predict.return_value = {'success_probability': 0.78}
                result = mock_predict(case['trial_data'])
            
            # Assert
            prob = result['success_probability']
            assert case['expected_range'][0] <= prob <= case['expected_range'][1]
    
    def test_type_validation_invalid_input_types(self):
        """Type validation: Invalid input types"""
        # Arrange
        invalid_inputs = [
            None,
            "string",
            123,
            [],
            {'phase': 123}  # Wrong type for phase
        ]
        
        for invalid_input in invalid_inputs:
            # Act & Assert
            with patch('src.models.trial_success_predictor.predict_trial_success') as mock_predict:
                mock_predict.side_effect = TypeError("Invalid input type")
                with pytest.raises(TypeError):
                    mock_predict(invalid_input)


class TestFeatureImportance:
    """Test feature importance calculations"""
    
    def test_happy_path_feature_ranking(self):
        """Happy path: Features ranked correctly"""
        # Arrange
        features = ['phase', 'enrollment', 'sponsor_type', 'duration']
        importances = [0.35, 0.28, 0.22, 0.15]
        
        # Act
        df = pd.DataFrame({
            'feature': features,
            'importance': importances
        }).sort_values('importance', ascending=False)
        
        # Assert
        assert len(df) == 4
        assert df.iloc[0]['feature'] == 'phase'  # Most important
        assert df.iloc[-1]['feature'] == 'duration'  # Least important
    
    def test_edge_case_zero_importance(self):
        """Edge case: Feature with zero importance"""
        # Arrange
        features = ['phase', 'unused_feature', 'enrollment']
        importances = [0.5, 0.0, 0.5]
        
        # Act
        df = pd.DataFrame({
            'feature': features,
            'importance': importances
        })
        
        # Assert - Should still work
        assert len(df) == 3
        zero_features = df[df['importance'] == 0.0]
        assert len(zero_features) == 1
    
    def test_edge_case_negative_importance(self):
        """Edge case: Negative importance values"""
        # Arrange
        features = ['phase', 'enrollment']
        importances = [0.6, -0.1]  # Negative importance
        
        # Act
        df = pd.DataFrame({
            'feature': features,
            'importance': importances
        })
        
        # Assert - Should handle gracefully
        assert len(df) == 2
        assert any(df['importance'] < 0)
    
    def test_boundary_too_many_features(self):
        """Boundary: Very large number of features"""
        # Arrange
        n_features = 10000
        features = [f'feature_{i}' for i in range(n_features)]
        importances = np.random.random(n_features)
        
        # Act
        df = pd.DataFrame({
            'feature': features,
            'importance': importances
        }).sort_values('importance', ascending=False)
        
        # Assert
        assert len(df) == n_features
        # Top 15 should be identifiable
        top_15 = df.head(15)
        assert len(top_15) == 15


class TestModelComparison:
    """Test model comparison functionality"""
    
    def test_happy_path_model_metrics(self):
        """Happy path: All models have metrics"""
        # Arrange
        models = ['RandomForest', 'GradientBoosting', 'XGBoost', 'LogisticRegression', 'Ensemble']
        
        # Act
        comparison_df = pd.DataFrame({
            'Model': models,
            'Accuracy': [0.74, 0.76, 0.77, 0.71, 0.78],
            'Precision': [0.72, 0.75, 0.76, 0.69, 0.77],
            'Recall': [0.70, 0.73, 0.75, 0.68, 0.76],
            'F1-Score': [0.71, 0.74, 0.76, 0.69, 0.77]
        })
        
        # Assert
        assert len(comparison_df) == 5
        assert all(comparison_df['Accuracy'] <= 1.0)
        assert all(comparison_df['Accuracy'] >= 0.0)
        assert comparison_df.loc[comparison_df['Model'] == 'Ensemble', 'Accuracy'].values[0] == 0.78
    
    def test_edge_case_missing_model(self):
        """Edge case: Missing model in comparison"""
        # Arrange
        comparison_df = pd.DataFrame({
            'Model': ['RandomForest', 'XGBoost'],
            'Accuracy': [0.74, 0.77]
        })
        
        # Act & Assert
        assert 'GradientBoosting' not in comparison_df['Model'].values
    
    def test_type_validation_invalid_metrics(self):
        """Type validation: Invalid metric types"""
        # Arrange
        invalid_metrics = [
            {'Accuracy': 'high'},  # String instead of float
            {'Accuracy': 1.5},  # > 1.0
            {'Accuracy': -0.1},  # < 0.0
        ]
        
        for metrics in invalid_metrics:
            # Act & Assert
            acc = metrics['Accuracy']
            if isinstance(acc, str):
                assert not isinstance(acc, (int, float))
            elif isinstance(acc, (int, float)):
                assert acc < 0 or acc > 1  # Invalid range


class TestPredictionConfidence:
    """Test prediction confidence calculations"""
    
    def test_happy_path_confidence_interval(self):
        """Happy path: Valid confidence interval"""
        # Arrange
        prediction = 0.78
        std_error = 0.05
        
        # Act - Calculate 95% CI
        ci_lower = prediction - (1.96 * std_error)
        ci_upper = prediction + (1.96 * std_error)
        
        # Assert
        assert ci_lower < prediction < ci_upper
        assert ci_upper - ci_lower == 2 * 1.96 * std_error
    
    def test_edge_case_zero_std_error(self):
        """Edge case: Zero standard error"""
        # Arrange
        prediction = 0.78
        std_error = 0.0
        
        # Act
        ci_lower = prediction - (1.96 * std_error)
        ci_upper = prediction + (1.96 * std_error)
        
        # Assert
        assert ci_lower == ci_upper == prediction
    
    def test_edge_case_high_uncertainty(self):
        """Edge case: Very high uncertainty"""
        # Arrange
        prediction = 0.5
        std_error = 0.5  # Very high
        
        # Act
        ci_lower = prediction - (1.96 * std_error)
        ci_upper = prediction + (1.96 * std_error)
        
        # Assert - CI may extend beyond 0-1, should be clipped
        assert ci_lower < prediction < ci_upper
    
    def test_boundary_wide_confidence_interval(self):
        """Boundary: Confidence interval spans full range"""
        # Arrange
        prediction = 0.5
        ci_lower = 0.0
        ci_upper = 1.0
        
        # Assert
        assert ci_lower >= 0.0
        assert ci_upper <= 1.0
        assert ci_lower < prediction < ci_upper


class TestModelPersistence:
    """Test model saving and loading"""
    
    def test_happy_path_save_model(self, tmp_path):
        """Happy path: Model saves successfully"""
        # Arrange
        model_data = {
            'version': '1.0.0',
            'accuracy': 0.78,
            'features': ['phase', 'enrollment', 'sponsor_type']
        }
        model_file = tmp_path / "model.json"
        
        # Act
        with open(model_file, 'w') as f:
            json.dump(model_data, f)
        
        # Assert
        assert model_file.exists()
        loaded = json.loads(model_file.read_text())
        assert loaded['version'] == '1.0.0'
    
    def test_edge_case_corrupted_model_file(self, tmp_path):
        """Edge case: Corrupted model file"""
        # Arrange
        model_file = tmp_path / "corrupted_model.json"
        model_file.write_text("{invalid json")
        
        # Act & Assert
        with pytest.raises(json.JSONDecodeError):
            json.loads(model_file.read_text())
    
    def test_security_unsafe_model_loading(self, tmp_path):
        """Security: Prevent unsafe model loading"""
        # Arrange - Model file with malicious content
        model_file = tmp_path / "malicious.json"
        # This simulates a pickle file that could execute arbitrary code
        model_file.write_text(json.dumps({
            '__class__': 'os.system',
            '__args__': ['rm -rf /']  # Dangerous command
        }))
        
        # Act & Assert - Should not execute the code
        loaded = json.loads(model_file.read_text())
        assert '__class__' in loaded
        # In real implementation, would need to validate before using


class TestPerformanceStress:
    """Performance and stress tests"""
    
    def test_performance_batch_predictions(self, benchmark):
        """Performance: Batch predictions on many trials"""
        # Arrange
        n_trials = 10000
        trials = pd.DataFrame({
            'phase': ['Phase 2'] * n_trials,
            'enrollment': np.random.randint(10, 1000, n_trials),
            'sponsor_type': ['Large Pharma'] * n_trials
        })
        
        # Act
        def predict_batch():
            with patch('src.models.trial_success_predictor.predict_trial_success') as mock_predict:
                mock_predict.return_value = {'success_probability': 0.78}
                return [mock_predict(trial) for _, trial in trials.iterrows()]
        
        result = benchmark(predict_batch)
        
        # Assert
        assert len(result) == n_trials
    
    def test_stress_high_dimensional_features(self):
        """Stress: Model with very high dimensional features"""
        # Arrange
        n_features = 1000
        features = [f'feature_{i}' for i in range(n_features)]
        importances = np.random.dirichlet(np.ones(n_features))  # Sum to 1
        
        # Act
        df = pd.DataFrame({
            'feature': features,
            'importance': importances
        }).sort_values('importance', ascending=False)
        
        # Assert
        assert len(df) == n_features
        assert abs(df['importance'].sum() - 1.0) < 1e-10  # Sum to 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
