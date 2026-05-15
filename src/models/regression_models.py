"""
ML Regression Models for Sickle Cell Health Trend Analysis
Includes linear regression, time series forecasting, ensemble methods, and causal inference models
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor
from sklearn.svm import SVR
from sklearn.neighbors import KNeighborsRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error, mean_absolute_percentage_error
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.pipeline import Pipeline
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.seasonal import seasonal_decompose
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

class SickleCellRegressionModels:
    def __init__(self, data_dir="data/processed"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.models = {}
        self.scalers = {}
        
    def load_data(self):
        """
        Load and merge health and stock data
        """
        print("Loading data...")
        
        # Load health data
        health_df = pd.read_csv("data/raw/cdc_sickle_cell_data.csv")
        health_df['date'] = pd.to_datetime(health_df['date'])
        health_df.set_index('date', inplace=True)
        
        # Load stock data directly using yfinance for simplicity
        import yfinance as yf
        companies = {
            "CRISPR Therapeutics": "CRSP",
            "Vertex Pharmaceuticals": "VRTX",
            "Novartis": "NVS",
            "Editas Medicine": "EDIT",
            "Pfizer": "PFE",
            "Bristol Myers Squibb": "BMY"
        }
        
        prices = {}
        for name, ticker in companies.items():
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period="5y")
                if not hist.empty:
                    # Remove timezone from index to match health data
                    hist.index = hist.index.tz_localize(None)
                    prices[ticker] = hist['Close']
                    print(f"  ✓ {ticker}")
            except Exception as e:
                print(f"  ✗ {ticker}: {e}")
        
        close_prices = pd.DataFrame(prices)
        
        return health_df, close_prices
    
    def prepare_features(self, health_df, stock_df, target_ticker='CRSP', use_polynomial=False):
        """
        Prepare enhanced features for regression analysis
        """
        print("Preparing features...")
        
        # Merge datasets on date
        merged = pd.merge(health_df, stock_df[[target_ticker]], 
                         left_index=True, right_index=True, how='inner')
        
        # Create lagged features
        for col in ['scd_births_per_1000', 'new_treatments_approved', 'clinical_trials_active']:
            merged[f'{col}_lag1'] = merged[col].shift(1)
            merged[f'{col}_lag2'] = merged[col].shift(2)
            merged[f'{col}_lag3'] = merged[col].shift(3)
        
        # Create rolling averages
        for window in [3, 6]:
            merged[f'scd_births_ma{window}'] = merged['scd_births_per_1000'].rolling(window=window).mean()
            merged[f'clinical_trials_ma{window}'] = merged['clinical_trials_active'].rolling(window=window).mean()
        
        # Create rolling standard deviations (volatility)
        merged['scd_births_std3'] = merged['scd_births_per_1000'].rolling(window=3).std()
        merged['clinical_trials_std3'] = merged['clinical_trials_active'].rolling(window=3).std()
        
        # Create stock returns and volatility
        merged['stock_return'] = merged[target_ticker].pct_change()
        merged['stock_return_lag1'] = merged['stock_return'].shift(1)
        merged['stock_return_lag2'] = merged['stock_return'].shift(2)
        merged['stock_volatility_5'] = merged['stock_return'].rolling(window=5).std()
        
        # Create interaction features
        merged['treatments_per_trial'] = merged['new_treatments_approved'] / (merged['clinical_trials_active'] + 1)
        merged['prevalence_growth'] = merged['scd_prevalence_us'].pct_change()
        
        # Create momentum indicators
        merged['stock_momentum_5'] = merged[target_ticker].pct_change(5)
        merged['stock_momentum_10'] = merged[target_ticker].pct_change(10)
        
        # Drop NaN values
        merged = merged.dropna()
        
        # Dynamically select feature columns (exclude target ticker and stock_return)
        exclude_cols = [target_ticker, 'stock_return']
        feature_cols = [col for col in merged.columns if col not in exclude_cols]
        
        X = merged[feature_cols]
        y = merged['stock_return']
        
        if use_polynomial:
            poly = PolynomialFeatures(degree=2, include_bias=False)
            X_poly = poly.fit_transform(X)
            X_poly = pd.DataFrame(X_poly, columns=poly.get_feature_names_out(feature_cols))
            return X_poly, y, merged, feature_cols
        
        return X, y, merged, feature_cols
    
    def train_linear_regression(self, X, y):
        """
        Train linear regression model with cross-validation
        """
        print("Training Linear Regression...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = LinearRegression()
        model.fit(X_train_scaled, y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred),
            'cv_mean_r2': cv_scores.mean(),
            'cv_std_r2': cv_scores.std()
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        print(f"  MAPE: {metrics['mape']:.6f}")
        print(f"  CV R²: {metrics['cv_mean_r2']:.6f} (+/- {metrics['cv_std_r2']:.6f})")
        
        # Feature importance (coefficients)
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'coefficient': model.coef_
        }).sort_values('coefficient', key=abs, ascending=False)
        
        print("\n  Top Features:")
        print(feature_importance.head(5))
        
        self.models['linear_regression'] = model
        self.scalers['linear_regression'] = scaler
        
        return model, metrics, feature_importance
    
    def train_ridge_regression(self, X, y):
        """
        Train Ridge regression with hyperparameter tuning
        """
        print("\nTraining Ridge Regression...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Hyperparameter tuning
        param_grid = {'alpha': [0.01, 0.1, 1.0, 10.0, 100.0]}
        grid_search = GridSearchCV(Ridge(), param_grid, cv=5, scoring='r2')
        grid_search.fit(X_train_scaled, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best alpha: {grid_search.best_params_['alpha']}")
        
        # Evaluate
        y_pred = best_model.predict(X_test_scaled)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['ridge_regression'] = best_model
        self.scalers['ridge_regression'] = scaler
        
        return best_model, metrics
    
    def train_lasso_regression(self, X, y):
        """
        Train Lasso regression with hyperparameter tuning
        """
        print("\nTraining Lasso Regression...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Hyperparameter tuning
        param_grid = {'alpha': [0.001, 0.01, 0.1, 1.0, 10.0]}
        grid_search = GridSearchCV(Lasso(), param_grid, cv=5, scoring='r2')
        grid_search.fit(X_train_scaled, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best alpha: {grid_search.best_params_['alpha']}")
        
        # Evaluate
        y_pred = best_model.predict(X_test_scaled)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['lasso_regression'] = best_model
        self.scalers['lasso_regression'] = scaler
        
        return best_model, metrics
    
    def train_elastic_net(self, X, y):
        """
        Train ElasticNet regression with hyperparameter tuning
        """
        print("\nTraining ElasticNet...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Hyperparameter tuning
        param_grid = {
            'alpha': [0.01, 0.1, 1.0, 10.0],
            'l1_ratio': [0.1, 0.5, 0.7, 0.9]
        }
        grid_search = GridSearchCV(ElasticNet(), param_grid, cv=5, scoring='r2')
        grid_search.fit(X_train_scaled, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best params: {grid_search.best_params_}")
        
        # Evaluate
        y_pred = best_model.predict(X_test_scaled)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['elastic_net'] = best_model
        self.scalers['elastic_net'] = scaler
        
        return best_model, metrics
    
    def train_random_forest(self, X, y):
        """
        Train Random Forest regressor with hyperparameter tuning
        """
        print("\nTraining Random Forest...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Hyperparameter tuning
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [5, 10, 15, None],
            'min_samples_split': [2, 5, 10]
        }
        grid_search = GridSearchCV(RandomForestRegressor(random_state=42, n_jobs=-1), 
                                  param_grid, cv=3, scoring='r2', n_jobs=-1)
        grid_search.fit(X_train, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best params: {grid_search.best_params_}")
        
        y_pred = best_model.predict(X_test)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n  Top Features:")
        print(feature_importance.head(5))
        
        self.models['random_forest'] = best_model
        
        return best_model, metrics, feature_importance
    
    def train_svr(self, X, y):
        """
        Train Support Vector Regression with hyperparameter tuning
        """
        print("\nTraining Support Vector Regression...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features (critical for SVR)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Hyperparameter tuning
        param_grid = {
            'C': [0.1, 1, 10, 100],
            'epsilon': [0.01, 0.1, 0.5],
            'kernel': ['rbf', 'linear']
        }
        grid_search = GridSearchCV(SVR(), param_grid, cv=3, scoring='r2')
        grid_search.fit(X_train_scaled, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best params: {grid_search.best_params_}")
        
        y_pred = best_model.predict(X_test_scaled)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['svr'] = best_model
        self.scalers['svr'] = scaler
        
        return best_model, metrics
    
    def train_knn(self, X, y):
        """
        Train K-Nearest Neighbors regressor with hyperparameter tuning
        """
        print("\nTraining K-Nearest Neighbors...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features (critical for KNN)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Hyperparameter tuning
        param_grid = {
            'n_neighbors': [3, 5, 7, 9, 11],
            'weights': ['uniform', 'distance'],
            'algorithm': ['auto', 'ball_tree', 'kd_tree']
        }
        grid_search = GridSearchCV(KNeighborsRegressor(), param_grid, cv=3, scoring='r2')
        grid_search.fit(X_train_scaled, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best params: {grid_search.best_params_}")
        
        y_pred = best_model.predict(X_test_scaled)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['knn'] = best_model
        self.scalers['knn'] = scaler
        
        return best_model, metrics
    
    def train_adaboost(self, X, y):
        """
        Train AdaBoost regressor with hyperparameter tuning
        """
        print("\nTraining AdaBoost...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Hyperparameter tuning
        param_grid = {
            'n_estimators': [50, 100, 200],
            'learning_rate': [0.01, 0.1, 1.0],
            'loss': ['linear', 'square', 'exponential']
        }
        grid_search = GridSearchCV(AdaBoostRegressor(random_state=42), param_grid, cv=3, scoring='r2')
        grid_search.fit(X_train, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"  Best params: {grid_search.best_params_}")
        
        y_pred = best_model.predict(X_test)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred),
            'mape': mean_absolute_percentage_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['adaboost'] = best_model
        
        return best_model, metrics
    
    def train_gradient_boosting(self, X, y):
        """
        Train Gradient Boosting regressor
        """
        print("\nTraining Gradient Boosting...")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        
        metrics = {
            'mse': mean_squared_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mae': mean_absolute_error(y_test, y_pred)
        }
        
        print(f"  MSE: {metrics['mse']:.6f}")
        print(f"  R²: {metrics['r2']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        
        self.models['gradient_boosting'] = model
        
        return model, metrics
    
    def time_series_forecast(self, health_df, target_col='scd_prevalence_us'):
        """
        Enhanced time series forecasting with seasonal decomposition
        """
        print(f"\nTime Series Forecasting for {target_col}...")
        
        # Prepare time series
        ts = health_df[target_col].dropna()
        
        # Seasonal decomposition
        try:
            decomposition = seasonal_decompose(ts, period=4, model='additive')
            print("\n  Seasonal Decomposition:")
            print(f"    Trend component strength: {decomposition.trend.std():.2f}")
            print(f"    Seasonal component strength: {decomposition.seasonal.std():.2f}")
            print(f"    Residual component strength: {decomposition.resid.std():.2f}")
        except:
            print("  Insufficient data for seasonal decomposition")
        
        # Fit ARIMA model with auto parameter selection
        print("\n  Fitting ARIMA model...")
        model = ARIMA(ts, order=(1, 1, 1))
        fitted_model = model.fit()
        
        # Forecast
        forecast_steps = 12
        forecast = fitted_model.forecast(steps=forecast_steps)
        forecast_ci = fitted_model.get_forecast(steps=forecast_steps).conf_int()
        
        print(f"\n  Forecast for next {forecast_steps} periods:")
        print(forecast)
        
        # Model diagnostics
        print(f"\n  AIC: {fitted_model.aic:.2f}")
        print(f"  BIC: {fitted_model.bic:.2f}")
        
        return fitted_model, forecast, forecast_ci
    
    def granger_causality_test(self, health_df, stock_df, target_ticker='CRSP'):
        """
        Test for Granger causality between health metrics and stock returns
        """
        print("\nGranger Causality Tests...")
        
        from statsmodels.tsa.stattools import grangercausalitytests
        
        # Merge data
        merged = pd.merge(health_df[['scd_births_per_1000', 'new_treatments_approved']], 
                         stock_df[[target_ticker]], 
                         left_index=True, right_index=True, how='inner')
        
        merged['stock_return'] = merged[target_ticker].pct_change()
        merged = merged.dropna()
        
        # Test Granger causality
        test_data = merged[['scd_births_per_1000', 'stock_return']].values
        
        try:
            result = grangercausalitytests(test_data, maxlag=3, verbose=True)
            return result
        except:
            print("  Insufficient data for Granger causality test")
            return None
    
    def compare_models(self, X, y):
        """
        Compare all trained models and return performance summary
        """
        print("\n" + "="*60)
        print("MODEL COMPARISON")
        print("="*60)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        results = []
        
        # Test each model
        models_to_test = {
            'Linear Regression': self.models.get('linear_regression'),
            'Ridge Regression': self.models.get('ridge_regression'),
            'Lasso Regression': self.models.get('lasso_regression'),
            'ElasticNet': self.models.get('elastic_net'),
            'Random Forest': self.models.get('random_forest'),
            'Gradient Boosting': self.models.get('gradient_boosting'),
            'SVR': self.models.get('svr'),
            'KNN': self.models.get('knn'),
            'AdaBoost': self.models.get('adaboost')
        }
        
        for name, model in models_to_test.items():
            if model is None:
                continue
                
            try:
                if name in ['Ridge Regression', 'Lasso Regression', 'ElasticNet', 'SVR', 'KNN']:
                    scaler = self.scalers.get(name.lower().replace(' ', '_'))
                    X_test_scaled = scaler.transform(X_test)
                    y_pred = model.predict(X_test_scaled)
                else:
                    y_pred = model.predict(X_test)
                
                metrics = {
                    'Model': name,
                    'MSE': mean_squared_error(y_test, y_pred),
                    'R²': r2_score(y_test, y_pred),
                    'MAE': mean_absolute_error(y_test, y_pred),
                    'MAPE': mean_absolute_percentage_error(y_test, y_pred)
                }
                results.append(metrics)
            except Exception as e:
                print(f"  {name}: Error during evaluation - {e}")
        
        comparison_df = pd.DataFrame(results).sort_values('R²', ascending=False)
        
        print("\nModel Performance Comparison:")
        print(comparison_df.to_string(index=False))
        
        return comparison_df
    
    def save_models(self):
        """
        Save trained models
        """
        print("\nSaving models...")
        for name, model in self.models.items():
            joblib.dump(model, f"{self.data_dir}/{name}_model.pkl")
            print(f"  ✓ {name} saved")
    
    def run_all_models(self):
        """
        Run all regression models with enhanced ML capabilities
        """
        print("="*60)
        print("SICKLE CELL REGRESSION ANALYSIS - ENHANCED")
        print("="*60)
        
        # Load data
        health_df, stock_df = self.load_data()
        
        # Prepare features
        X, y, merged, feature_cols = self.prepare_features(health_df, stock_df)
        
        # Train all models
        print("\n" + "="*60)
        print("TRAINING REGRESSION MODELS")
        print("="*60)
        
        self.train_linear_regression(X, y)
        self.train_ridge_regression(X, y)
        self.train_lasso_regression(X, y)
        self.train_elastic_net(X, y)
        self.train_random_forest(X, y)
        self.train_gradient_boosting(X, y)
        self.train_svr(X, y)
        self.train_knn(X, y)
        self.train_adaboost(X, y)
        
        # Compare all models
        comparison = self.compare_models(X, y)
        
        # Save comparison results
        comparison.to_csv(f"{self.data_dir}/model_comparison.csv", index=False)
        
        # Time series forecasting
        print("\n" + "="*60)
        print("TIME SERIES FORECASTING")
        print("="*60)
        self.time_series_forecast(health_df)
        
        # Granger causality
        print("\n" + "="*60)
        print("GRANGER CAUSALITY TESTS")
        print("="*60)
        self.granger_causality_test(health_df, stock_df)
        
        # Save models
        self.save_models()
        
        print("\n" + "="*60)
        print("✓ All models trained, compared, and saved!")
        print("="*60)
        
        return comparison

if __name__ == "__main__":
    model_trainer = SickleCellRegressionModels()
    model_trainer.run_all_models()
