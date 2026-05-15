"""
Clinical Trial Success Predictor
Multi-disease ML model predicting clinical trial phase transition and approval probability.
Uses XGBoost, RandomForest, and Logistic Regression with interpretable outputs (SHAP-ready).
All training data generated from public domain distributions — legally compliant.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix,
    precision_recall_curve, average_precision_score
)
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
import os
import sys
import warnings
warnings.filterwarnings('ignore')

from src.data_collection.disease_config import DiseaseConfig

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


class TrialSuccessPredictor:
    """
    Predicts clinical trial success probability for immunology trials.
    
    Features used:
    - Disease area & code
    - Trial phase (1, 2, 3)
    - Enrollment count
    - Sponsor type (pharma, biotech, academic)
    - Mechanism class (gene therapy, antibody, small molecule, etc.)
    - Trial duration (months)
    - Historical phase transition rate for disease
    - Number of prior approvals in disease area
    """

    MECHANISM_MAP = {
        "Gene Editing": 0, "Gene Therapy": 1, "CAR-T": 2,
        "Anti-CD20": 3, "BTK Inhibitor": 4, "JAK Inhibitor": 5,
        "IL-17 Inhibitor": 6, "IL-23 Inhibitor": 7, "TNF Inhibitor": 8,
        "SGLT2 Inhibitor": 9, "GLP-1 Agonist": 10, "FXR Agonist": 11,
        "PPAR Agonist": 12, "S1P Modulator": 13, "Monoclonal Antibody": 14,
        "Small Molecule": 15, "Novel Mechanism": 16
    }

    SPONSOR_MAP = {"pharma": 0, "biotech": 1, "academic": 2}

    PHASE_SUCCESS_RATES = {
        1: 0.64,  # Phase 1 → completion
        2: 0.36,  # Phase 2 → Phase 3
        3: 0.58,  # Phase 3 → approval
    }

    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.is_trained = False
        self.feature_names = [
            "phase", "enrollment_log", "sponsor_type", "mechanism_id",
            "duration_months", "disease_trial_rate", "prior_approvals",
            "disease_prevalence_log", "phase_success_rate"
        ]

    def _generate_training_data(self, n_samples: int = 3000) -> pd.DataFrame:
        """
        Generate synthetic training data from publicly known base rates.
        Distributions calibrated to published clinical trial outcomes literature:
        - Hay et al. (2014) Clinical Development Success Rates
        - Wong et al. (2019) Estimation of clinical trial success rates
        - BIO industry analysis reports
        """
        rng = np.random.default_rng(42)
        diseases = DiseaseConfig.get_disease_names()
        records = []

        for _ in range(n_samples):
            disease = rng.choice(diseases)
            config = DiseaseConfig.get_disease_config(disease)

            phase = rng.choice([1, 2, 3], p=[0.35, 0.40, 0.25])
            enrollment = int(rng.lognormal(mean=np.log(150), sigma=1.1))
            enrollment = max(10, min(enrollment, 5000))
            sponsor = rng.choice(["pharma", "biotech", "academic"], p=[0.40, 0.45, 0.15])
            mechanism = rng.choice(list(self.MECHANISM_MAP.keys()))
            duration = int(rng.normal(loc=30 + phase * 12, scale=10))
            duration = max(6, min(duration, 120))

            disease_trial_rate = config.get("active_trials_estimate", 50) / 200.0
            prior_approvals = config.get("key_metrics", {}).get("fda_approvals_2019_2024", 2)
            base_success = config.get("key_metrics", {}).get("avg_trial_success_rate", 0.60)
            prevalence_log = np.log10(max(config.get("prevalence_us", 100000), 1))

            # Phase-specific success probability with realistic adjustments
            p_success = self.PHASE_SUCCESS_RATES[phase] * base_success / 0.60
            # Enrollment effect: larger well-powered trials more likely to succeed
            enrollment_boost = min(0.15, np.log(enrollment / 100) * 0.05)
            # Sponsor effect: pharma has more resources
            sponsor_boost = {"pharma": 0.05, "biotech": 0.0, "academic": -0.08}[sponsor]
            # Mechanism maturity: established mechanisms higher success
            mature_mechs = ["Monoclonal Antibody", "Small Molecule", "SGLT2 Inhibitor",
                            "TNF Inhibitor", "JAK Inhibitor"]
            mech_boost = 0.05 if mechanism in mature_mechs else -0.02
            # Prior approvals signal: active regulatory pathway
            approval_boost = min(0.08, prior_approvals * 0.015)

            p_final = np.clip(
                p_success + enrollment_boost + sponsor_boost + mech_boost + approval_boost,
                0.05, 0.95
            )
            success = int(rng.random() < p_final)

            records.append({
                "phase": phase,
                "enrollment_log": np.log(enrollment + 1),
                "sponsor_type": self.SPONSOR_MAP[sponsor],
                "mechanism_id": self.MECHANISM_MAP.get(mechanism, 16),
                "duration_months": duration,
                "disease_trial_rate": disease_trial_rate,
                "prior_approvals": prior_approvals,
                "disease_prevalence_log": prevalence_log,
                "phase_success_rate": self.PHASE_SUCCESS_RATES[phase],
                "success": success,
                "disease": disease,
                "raw_probability": p_final
            })

        return pd.DataFrame(records)

    def train(self, verbose: bool = True) -> dict:
        """
        Train ensemble of classifiers and return CV performance metrics.
        Returns dict with per-model AUC scores.
        """
        df = self._generate_training_data(3000)
        X = df[self.feature_names].values
        y = df["success"].values

        X_scaled = self.scaler.fit_transform(X)

        classifiers = {
            "random_forest": RandomForestClassifier(
                n_estimators=200, max_depth=8, min_samples_leaf=10,
                class_weight="balanced", random_state=42, n_jobs=-1
            ),
            "gradient_boosting": GradientBoostingClassifier(
                n_estimators=150, max_depth=4, learning_rate=0.05,
                subsample=0.8, random_state=42
            ),
            "logistic_regression": Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(C=1.0, class_weight="balanced",
                                           max_iter=500, random_state=42))
            ]),
        }

        if XGBOOST_AVAILABLE:
            classifiers["xgboost"] = XGBClassifier(
                n_estimators=200, max_depth=5, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8, eval_metric="logloss",
                random_state=42, verbosity=0
            )

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        results = {}

        for name, clf in classifiers.items():
            if name == "logistic_regression":
                scores = cross_val_score(clf, X, y, cv=cv, scoring="roc_auc")
                clf.fit(X, y)
            else:
                scores = cross_val_score(clf, X_scaled, y, cv=cv, scoring="roc_auc")
                clf.fit(X_scaled, y)

            self.models[name] = clf
            results[name] = {
                "auc_mean": scores.mean(),
                "auc_std": scores.std(),
                "auc_scores": scores.tolist()
            }

            if verbose:
                print(f"  {name}: AUC = {scores.mean():.3f} ± {scores.std():.3f}")

        # Feature importance from RF
        rf = self.models["random_forest"]
        self.feature_importances_ = dict(zip(
            self.feature_names, rf.feature_importances_
        ))

        self.is_trained = True
        if verbose:
            print("\nTop Features:")
            sorted_fi = sorted(self.feature_importances_.items(), key=lambda x: x[1], reverse=True)
            for feat, imp in sorted_fi[:5]:
                print(f"  {feat}: {imp:.3f}")

        return results

    def predict(self, phase: int, enrollment: int, sponsor: str,
                mechanism: str, duration_months: int, disease_name: str) -> dict:
        """
        Predict trial success probability for a single trial.

        Returns dict with probability, confidence interval, and model ensemble.
        """
        if not self.is_trained:
            self.train(verbose=False)

        config = DiseaseConfig.get_disease_config(disease_name)
        features = np.array([[
            phase,
            np.log(max(enrollment, 1) + 1),
            self.SPONSOR_MAP.get(sponsor, 1),
            self.MECHANISM_MAP.get(mechanism, 16),
            duration_months,
            config.get("active_trials_estimate", 50) / 200.0,
            config.get("key_metrics", {}).get("fda_approvals_2019_2024", 2),
            np.log10(max(config.get("prevalence_us", 100000), 1)),
            self.PHASE_SUCCESS_RATES.get(phase, 0.50)
        ]])

        features_scaled = self.scaler.transform(features)

        probas = []
        for name, clf in self.models.items():
            if name == "logistic_regression":
                p = clf.predict_proba(features)[0][1]
            else:
                p = clf.predict_proba(features_scaled)[0][1]
            probas.append(p)

        ensemble_prob = np.mean(probas)
        std = np.std(probas)

        return {
            "probability": round(ensemble_prob, 3),
            "ci_lower": round(max(0, ensemble_prob - 1.96 * std), 3),
            "ci_upper": round(min(1, ensemble_prob + 1.96 * std), 3),
            "confidence": "High" if std < 0.05 else "Medium" if std < 0.10 else "Low",
            "model_breakdown": {
                name: round(p, 3) for name, p in zip(self.models.keys(), probas)
            },
            "phase_base_rate": self.PHASE_SUCCESS_RATES.get(phase, 0.50),
            "disease": disease_name
        }

    def batch_predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Run predictions on a DataFrame with columns:
        phase, enrollment, sponsor, mechanism, duration_months, disease_name
        """
        results = []
        for _, row in df.iterrows():
            pred = self.predict(
                phase=int(row.get("phase", 2)),
                enrollment=int(row.get("enrollment", 150)),
                sponsor=row.get("sponsor", "biotech"),
                mechanism=row.get("mechanism", "Novel Mechanism"),
                duration_months=int(row.get("duration_months", 36)),
                disease_name=row.get("disease_name", "Sickle Cell Disease")
            )
            results.append(pred)
        return pd.DataFrame(results)

    def get_feature_importance_df(self) -> pd.DataFrame:
        """Return sorted feature importances as a DataFrame"""
        if not self.is_trained:
            self.train(verbose=False)
        return (
            pd.DataFrame.from_dict(self.feature_importances_, orient="index", columns=["importance"])
            .sort_values("importance", ascending=False)
            .reset_index()
            .rename(columns={"index": "feature"})
        )
