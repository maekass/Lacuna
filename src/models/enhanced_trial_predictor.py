"""
Enhanced Trial Success Predictor with Advanced Features

Adds NLP features, temporal patterns, and sponsor intelligence to base model.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from typing import Dict


class EnhancedTrialPredictor:
    """
    Enhanced ML model for predicting clinical trial success.
    
    New features beyond base model:
        - NLP features from trial descriptions
        - Temporal enrollment patterns
        - Sponsor track record
        - Competitive landscape metrics
        - Disease-specific success rates
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = None
        self.feature_names = []
        
    def extract_nlp_features(self, trial_description: str) -> Dict[str, float]:
        """
        Extract NLP features from trial description/title.
        
        Features:
            - Keyword presence (novel, breakthrough, first-in-class, etc.)
            - Sentiment indicators
            - Technical complexity
        """
        if pd.isna(trial_description):
            trial_description = ""
        
        desc_lower = trial_description.lower()
        
        features = {
            # Innovation keywords
            'has_novel': 1.0 if 'novel' in desc_lower else 0.0,
            'has_breakthrough': 1.0 if 'breakthrough' in desc_lower else 0.0,
            'has_first_in_class': 1.0 if 'first-in-class' in desc_lower or 'first in class' in desc_lower else 0.0,
            'has_orphan': 1.0 if 'orphan' in desc_lower else 0.0,
            
            # Mechanism keywords
            'has_gene_therapy': 1.0 if 'gene therapy' in desc_lower or 'crispr' in desc_lower else 0.0,
            'has_antibody': 1.0 if 'antibody' in desc_lower or 'mab' in desc_lower else 0.0,
            'has_cell_therapy': 1.0 if 'cell therapy' in desc_lower or 'car-t' in desc_lower else 0.0,
            
            # Trial design quality
            'has_randomized': 1.0 if 'randomized' in desc_lower else 0.0,
            'has_placebo': 1.0 if 'placebo' in desc_lower else 0.0,
            'has_double_blind': 1.0 if 'double-blind' in desc_lower or 'double blind' in desc_lower else 0.0,
            
            # Description length (proxy for detail/quality)
            'description_length': min(len(trial_description) / 1000, 5.0),  # Cap at 5
            
            # Word count
            'word_count': min(len(trial_description.split()) / 100, 10.0),  # Cap at 10
        }
        
        return features
    
    def calculate_enrollment_velocity(self, enrollment: int, start_date: str, 
                                      current_date: str = None) -> float:
        """
        Calculate enrollment velocity (patients per month).
        
        Fast enrollment often indicates strong efficacy signal.
        """
        if pd.isna(enrollment) or pd.isna(start_date):
            return 0.0
        
        try:
            start = pd.to_datetime(start_date)
            end = pd.to_datetime(current_date) if current_date else pd.Timestamp.now()
            months = max((end - start).days / 30, 1)
            velocity = enrollment / months
            return min(velocity, 100.0)  # Cap at 100 patients/month
        except (ValueError, TypeError, OverflowError):
            return 0.0
    
    def get_sponsor_track_record(self, sponsor_name: str, 
                                  historical_approvals: Dict[str, int]) -> Dict[str, float]:
        """
        Get sponsor's historical success rate.
        
        Args:
            sponsor_name: Name of trial sponsor
            historical_approvals: Dict mapping sponsor -> # of FDA approvals
            
        Returns:
            Dict with sponsor features
        """
        if pd.isna(sponsor_name):
            sponsor_name = "Unknown"
        
        # Classify sponsor type
        sponsor_lower = sponsor_name.lower()
        is_big_pharma = any(name in sponsor_lower for name in [
            'pfizer', 'merck', 'roche', 'novartis', 'sanofi', 'gsk', 
            'astrazeneca', 'bristol', 'abbvie', 'amgen', 'gilead', 'regeneron'
        ])
        
        is_academic = any(term in sponsor_lower for term in [
            'university', 'hospital', 'institute', 'medical center', 'college'
        ])
        
        # Get approval count
        approval_count = historical_approvals.get(sponsor_name, 0)
        
        features = {
            'sponsor_is_big_pharma': 1.0 if is_big_pharma else 0.0,
            'sponsor_is_academic': 1.0 if is_academic else 0.0,
            'sponsor_approval_count': min(approval_count, 20.0),  # Cap at 20
            'sponsor_has_approvals': 1.0 if approval_count > 0 else 0.0,
        }
        
        return features
    
    def calculate_competitive_landscape(self, disease: str, phase: str,
                                         all_trials: pd.DataFrame) -> Dict[str, float]:
        """
        Calculate competitive landscape metrics.
        
        Features:
            - Number of competing trials in same disease/phase
            - Market saturation indicator
        """
        if pd.isna(disease) or pd.isna(phase):
            return {'competing_trials': 0.0, 'market_saturation': 0.0}
        
        # Count trials in same disease and phase
        same_disease = all_trials[all_trials['disease'] == disease]
        same_phase = same_disease[same_disease['phase'] == phase]
        
        competing_count = len(same_phase)
        
        # Market saturation = competing trials / disease prevalence
        # (More trials per patient = more saturated)
        # This is a simplified metric
        saturation = min(competing_count / 10, 5.0)  # Cap at 5
        
        features = {
            'competing_trials': min(competing_count, 50.0),
            'market_saturation': saturation
        }
        
        return features
    
    def engineer_features(self, trial: pd.Series, all_trials: pd.DataFrame = None,
                          historical_approvals: Dict[str, int] = None) -> Dict[str, float]:
        """
        Engineer all features for a single trial.
        
        Returns:
            Dict of feature_name -> value
        """
        features = {}
        
        # Base features
        features['phase'] = self._encode_phase(trial.get('phase', 'Unknown'))
        features['enrollment'] = min(trial.get('enrollment', 0), 5000)  # Cap
        features['is_randomized'] = 1.0 if trial.get('is_randomized', False) else 0.0
        features['is_blinded'] = 1.0 if trial.get('is_blinded', False) else 0.0
        
        # NLP features
        description = trial.get('description', '') or trial.get('title', '')
        nlp_features = self.extract_nlp_features(description)
        features.update(nlp_features)
        
        # Enrollment velocity
        features['enrollment_velocity'] = self.calculate_enrollment_velocity(
            trial.get('enrollment', 0),
            trial.get('start_date'),
            trial.get('completion_date')
        )
        
        # Sponsor track record
        if historical_approvals is not None:
            sponsor_features = self.get_sponsor_track_record(
                trial.get('sponsor', ''),
                historical_approvals
            )
            features.update(sponsor_features)
        else:
            features.update({
                'sponsor_is_big_pharma': 0.0,
                'sponsor_is_academic': 0.0,
                'sponsor_approval_count': 0.0,
                'sponsor_has_approvals': 0.0,
            })
        
        # Competitive landscape
        if all_trials is not None:
            competitive_features = self.calculate_competitive_landscape(
                trial.get('disease', ''),
                trial.get('phase', ''),
                all_trials
            )
            features.update(competitive_features)
        else:
            features.update({'competing_trials': 0.0, 'market_saturation': 0.0})
        
        # Disease-specific features
        features['disease_prevalence'] = trial.get('prevalence', 0)
        features['log_prevalence'] = np.log1p(trial.get('prevalence', 0))
        
        # Temporal features
        features['trial_duration_months'] = trial.get('duration_months', 0)
        features['is_long_trial'] = 1.0 if trial.get('duration_months', 0) > 24 else 0.0
        
        return features
    
    def _encode_phase(self, phase: str) -> float:
        """Encode trial phase as numeric."""
        phase_map = {
            'Phase 1': 1.0,
            'Phase 2': 2.0,
            'Phase 3': 3.0,
            'Phase 4': 4.0,
            'Phase 1/2': 1.5,
            'Phase 2/3': 2.5,
        }
        return phase_map.get(phase, 0.0)
    
    def fit(self, trials: pd.DataFrame, labels: pd.Series, 
            historical_approvals: Dict[str, int] = None) -> 'EnhancedTrialPredictor':
        """
        Fit the enhanced model.
        
        Args:
            trials: DataFrame of trial data
            labels: Binary labels (1 = success, 0 = failure)
            historical_approvals: Dict of sponsor -> approval count
            
        Returns:
            self
        """
        # Engineer features for all trials
        feature_dicts = []
        for idx, trial in trials.iterrows():
            features = self.engineer_features(trial, trials, historical_approvals)
            feature_dicts.append(features)
        
        # Convert to DataFrame
        X = pd.DataFrame(feature_dicts)
        self.feature_names = list(X.columns)
        
        # Handle missing values
        X = X.fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Build ensemble model
        rf = RandomForestClassifier(
            n_estimators=200, 
            max_depth=12, 
            min_samples_split=10,
            random_state=42
        )
        
        gb = GradientBoostingClassifier(
            n_estimators=150, 
            learning_rate=0.05, 
            max_depth=6,
            random_state=42
        )
        
        lr = LogisticRegression(
            C=0.1, 
            penalty='l2', 
            max_iter=1000,
            random_state=42
        )
        
        xgb = XGBClassifier(
            n_estimators=200, 
            max_depth=6, 
            learning_rate=0.05,
            random_state=42,
            eval_metric='logloss'
        )
        
        # Ensemble with optimized weights
        self.model = VotingClassifier(
            estimators=[
                ('rf', rf),
                ('gb', gb),
                ('lr', lr),
                ('xgb', xgb)
            ],
            voting='soft',
            weights=[1.2, 1.5, 0.8, 2.0]  # XGBoost highest weight
        )
        
        self.model.fit(X_scaled, labels)
        
        return self
    
    def predict_proba(self, trials: pd.DataFrame, 
                      historical_approvals: Dict[str, int] = None) -> np.ndarray:
        """
        Predict success probability for trials.
        
        Returns:
            Array of shape (n_trials, 2) with [prob_failure, prob_success]
        """
        # Engineer features
        feature_dicts = []
        for idx, trial in trials.iterrows():
            features = self.engineer_features(trial, trials, historical_approvals)
            feature_dicts.append(features)
        
        X = pd.DataFrame(feature_dicts)
        
        # Ensure same features as training
        for col in self.feature_names:
            if col not in X.columns:
                X[col] = 0
        X = X[self.feature_names]
        
        X = X.fillna(0)
        X_scaled = self.scaler.transform(X)
        
        return self.model.predict_proba(X_scaled)
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        Get feature importance from ensemble models.
        
        Returns:
            DataFrame with feature names and importance scores
        """
        importances = []
        
        # Get importance from tree-based models
        for name, model in self.model.named_estimators_.items():
            if hasattr(model, 'feature_importances_'):
                importances.append(model.feature_importances_)
        
        # Average importances
        avg_importance = np.mean(importances, axis=0)
        
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': avg_importance
        }).sort_values('importance', ascending=False)
        
        return importance_df


# Example usage
if __name__ == "__main__":
    # Demo with sample data
    sample_trials = pd.DataFrame({
        'phase': ['Phase 3', 'Phase 2', 'Phase 3', 'Phase 1'],
        'enrollment': [300, 150, 500, 50],
        'is_randomized': [True, True, True, False],
        'is_blinded': [True, False, True, False],
        'description': [
            'Novel gene therapy for sickle cell disease',
            'Monoclonal antibody for lupus',
            'First-in-class CRISPR therapy',
            'Small molecule for MS'
        ],
        'sponsor': ['Vertex', 'University of California', 'CRISPR Therapeutics', 'Novartis'],
        'disease': ['SCD', 'SLE', 'SCD', 'MS'],
        'prevalence': [118000, 322000, 118000, 1000000],
        'start_date': ['2020-01-01', '2021-06-01', '2019-03-01', '2022-01-01'],
        'completion_date': ['2023-12-01', '2024-06-01', '2023-06-01', '2025-01-01'],
        'duration_months': [48, 36, 51, 36]
    })
    
    # Sample labels (1 = success, 0 = failure)
    labels = pd.Series([1, 0, 1, 0])
    
    # Sample historical approvals
    historical_approvals = {
        'Vertex': 5,
        'CRISPR Therapeutics': 2,
        'Novartis': 15,
        'University of California': 0
    }
    
    # Train model
    print("Training enhanced model...")
    model = EnhancedTrialPredictor()
    model.fit(sample_trials, labels, historical_approvals)
    
    # Predict
    print("\nPredicting success probabilities...")
    probs = model.predict_proba(sample_trials, historical_approvals)
    
    for i, (idx, trial) in enumerate(sample_trials.iterrows()):
        print(f"\n{trial['description']}")
        print(f"  Phase: {trial['phase']}")
        print(f"  Success Probability: {probs[i][1]:.1%}")
    
    # Feature importance
    print("\n=== Top 10 Features ===")
    importance = model.get_feature_importance()
    print(importance.head(10).to_string(index=False))
