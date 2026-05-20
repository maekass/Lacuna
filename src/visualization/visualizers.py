"""
Enhanced Visualization Module for Sickle Cell Investment Analysis
Interactive plots for clinical trials, feature importance, model performance, and time series
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import os

class SickleCellVisualizers:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs("data/visualizations", exist_ok=True)
        
        # Set style
        sns.set_style("whitegrid")
        plt.rcParams['figure.figsize'] = (12, 6)
        
    def plot_clinical_trials_timeline(self, trials_df=None, save_path=None):
        """
        Interactive timeline of clinical trials with phase and status
        """
        if trials_df is None:
            try:
                trials_df = pd.read_csv(f"{self.data_dir}/clinical_trials_scd.csv")
            except (FileNotFoundError, pd.errors.EmptyDataError):
                print("Clinical trials data not found")
                return None
        
        # Convert dates
        trials_df['start_date'] = pd.to_datetime(trials_df['start_date'])
        if 'primary_completion_date' in trials_df.columns:
            trials_df['primary_completion_date'] = pd.to_datetime(trials_df['primary_completion_date'])
        
        # Phase color mapping
        phase_colors = {
            'Phase 1': '#FF6B6B',
            'Phase 1/Phase 2': '#FFA07A',
            'Phase 2': '#FFD93D',
            'Phase 2/Phase 3': '#6BCB77',
            'Phase 3': '#4D96FF',
            'N/A': '#CCCCCC'
        }
        
        # Status color mapping
        status_colors = {
            'Recruiting': '#4CAF50',
            'Active, not recruiting': '#FF9800',
            'Completed': '#2196F3',
            'Terminated': '#F44336',
            'Withdrawn': '#9E9E9E',
            'Not yet recruiting': '#9C27B0'
        }
        
        # Create figure
        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=('Clinical Trials by Phase', 'Clinical Trials by Status'),
            vertical_spacing=0.15
        )
        
        # Phase timeline
        for phase in trials_df['phase'].unique():
            phase_data = trials_df[trials_df['phase'] == phase]
            fig.add_trace(
                go.Scatter(
                    x=phase_data['start_date'],
                    y=phase_data['phase'],
                    mode='markers',
                    name=phase,
                    marker=dict(size=10, color=phase_colors.get(phase, '#CCCCCC')),
                    hovertemplate='<b>%{text}</b><br>Start: %{x}<br>Phase: %{y}<extra></extra>',
                    text=phase_data['title']
                ),
                row=1, col=1
            )
        
        # Status timeline
        for status in trials_df['status'].unique():
            status_data = trials_df[trials_df['status'] == status]
            fig.add_trace(
                go.Scatter(
                    x=status_data['start_date'],
                    y=status_data['status'],
                    mode='markers',
                    name=status,
                    marker=dict(size=10, color=status_colors.get(status, '#CCCCCC')),
                    hovertemplate='<b>%{text}</b><br>Start: %{x}<br>Status: %{y}<extra></extra>',
                    text=status_data['title']
                ),
                row=2, col=1
            )
        
        fig.update_layout(
            title="Clinical Trials Timeline",
            height=800,
            hovermode='closest'
        )
        
        fig.update_xaxes(title_text="Start Date")
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Timeline saved to {save_path}")
        
        return fig
    
    def plot_feature_importance(self, importance_df=None, model_name="Model", save_path=None):
        """
        Interactive feature importance bar chart
        """
        if importance_df is None:
            # Create sample data
            importance_df = pd.DataFrame({
                "Feature": ["Clinical Trial Activity", "Treatment Approvals", "SCD Prevalence",
                           "Birth Rate", "Lagged Returns", "Trial Volatility", "Momentum 5d",
                           "Momentum 10d", "Stock Volatility", "Prevalence Growth"],
                "Importance": [0.18, 0.15, 0.12, 0.10, 0.14, 0.09, 0.07, 0.04, 0.03, 0.08]
            }).sort_values("Importance", ascending=True)
        
        fig = px.bar(
            importance_df,
            x="Importance",
            y="Feature",
            orientation="h",
            title=f"Feature Importance - {model_name}",
            color="Importance",
            color_continuous_scale="Viridis"
        )
        
        fig.update_layout(
            height=600,
            xaxis_title="Importance Score",
            yaxis_title="Feature"
        )
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Feature importance saved to {save_path}")
        
        return fig
    
    def plot_model_comparison(self, comparison_df=None, save_path=None):
        """
        Interactive model performance comparison
        """
        if comparison_df is None:
            # Create sample data
            comparison_df = pd.DataFrame({
                "Model": ["Linear Regression", "Ridge", "Lasso", "ElasticNet", 
                          "Random Forest", "Gradient Boosting", "SVR", "KNN", "AdaBoost"],
                "R²": [0.35, 0.42, 0.38, 0.40, 0.62, 0.65, 0.45, 0.48, 0.55],
                "MSE": [0.045, 0.038, 0.041, 0.039, 0.025, 0.022, 0.035, 0.032, 0.028],
                "MAE": [0.032, 0.028, 0.030, 0.029, 0.020, 0.018, 0.026, 0.024, 0.021]
            })
        
        # Create subplots
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('R² Scores (Higher is Better)', 'MSE (Lower is Better)',
                          'MAE (Lower is Better)', 'Model Ranking'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"type": "table"}]]
        )
        
        # R² bar chart
        fig.add_trace(
            go.Bar(x=comparison_df['Model'], y=comparison_df['R²'], 
                   marker_color='lightblue', name='R²'),
            row=1, col=1
        )
        
        # MSE bar chart
        fig.add_trace(
            go.Bar(x=comparison_df['Model'], y=comparison_df['MSE'],
                   marker_color='lightcoral', name='MSE'),
            row=1, col=2
        )
        
        # MAE bar chart
        fig.add_trace(
            go.Bar(x=comparison_df['Model'], y=comparison_df['MAE'],
                   marker_color='lightgreen', name='MAE'),
            row=2, col=1
        )
        
        # Model ranking table
        comparison_df['Rank'] = comparison_df['R²'].rank(ascending=False)
        comparison_df = comparison_df.sort_values('Rank')
        
        fig.add_trace(
            go.Table(
                header=dict(values=['Rank', 'Model', 'R²', 'MSE', 'MAE'],
                           fill_color='lightblue'),
                cells=dict(values=[comparison_df['Rank'], comparison_df['Model'],
                                comparison_df['R²'].round(3), comparison_df['MSE'].round(4),
                                comparison_df['MAE'].round(4)],
                          fill_color='white')
            ),
            row=2, col=2
        )
        
        fig.update_layout(
            title="Model Performance Comparison",
            height=800,
            showlegend=False
        )
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Model comparison saved to {save_path}")
        
        return fig
    
    def plot_time_series_decomposition(self, ts_data=None, title="Time Series Decomposition", save_path=None):
        """
        Interactive time series decomposition plot
        """
        if ts_data is None:
            # Create sample data
            dates = pd.date_range(start="2020-01-01", end="2024-12-31", freq="QE")
            trend = np.linspace(100, 150, len(dates))
            seasonal = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 4)
            residual = np.random.normal(0, 5, len(dates))
            observed = trend + seasonal + residual
            
            ts_data = pd.DataFrame({
                'Date': dates,
                'Observed': observed,
                'Trend': trend,
                'Seasonal': seasonal,
                'Residual': residual
            })
        else:
            from statsmodels.tsa.seasonal import seasonal_decompose
            decomposition = seasonal_decompose(ts_data, period=4, model='additive')
            ts_data = pd.DataFrame({
                'Observed': decomposition.observed,
                'Trend': decomposition.trend,
                'Seasonal': decomposition.seasonal,
                'Residual': decomposition.resid
            }).reset_index()
            ts_data.columns = ['Date', 'Observed', 'Trend', 'Seasonal', 'Residual']
        
        fig = make_subplots(
            rows=4, cols=1,
            subplot_titles=('Observed', 'Trend', 'Seasonal', 'Residual'),
            vertical_spacing=0.08
        )
        
        fig.add_trace(go.Scatter(x=ts_data['Date'], y=ts_data['Observed'],
                                mode='lines', name='Observed', line=dict(color='blue')),
                      row=1, col=1)
        fig.add_trace(go.Scatter(x=ts_data['Date'], y=ts_data['Trend'],
                                mode='lines', name='Trend', line=dict(color='red')),
                      row=2, col=1)
        fig.add_trace(go.Scatter(x=ts_data['Date'], y=ts_data['Seasonal'],
                                mode='lines', name='Seasonal', line=dict(color='green')),
                      row=3, col=1)
        fig.add_trace(go.Scatter(x=ts_data['Date'], y=ts_data['Residual'],
                                mode='lines', name='Residual', line=dict(color='orange')),
                      row=4, col=1)
        
        fig.update_layout(
            title=title,
            height=1000,
            showlegend=False
        )
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Time series decomposition saved to {save_path}")
        
        return fig
    
    def plot_correlation_heatmap(self, df=None, title="Feature Correlation Heatmap", save_path=None):
        """
        Interactive correlation heatmap
        """
        if df is None:
            # Create sample data
            np.random.seed(42)
            features = ['SCD Prevalence', 'Clinical Trials', 'Treatment Approvals',
                       'Stock Returns', 'Market Volatility', 'Trial Momentum']
            df = pd.DataFrame(np.random.randn(100, 6), columns=features)
            # Add some correlations
            df['Clinical Trials'] = df['SCD Prevalence'] * 0.5 + np.random.randn(100) * 0.5
        
        corr_matrix = df.corr()
        
        fig = go.Figure(data=go.Heatmap(
            z=corr_matrix.values,
            x=corr_matrix.columns,
            y=corr_matrix.columns,
            colorscale='RdBu',
            zmid=0,
            text=np.round(corr_matrix.values, 2),
            texttemplate='%{text}',
            textfont={"size": 10},
            colorbar=dict(title="Correlation")
        ))
        
        fig.update_layout(
            title=title,
            height=600
        )
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Correlation heatmap saved to {save_path}")
        
        return fig
    
    def plot_health_trends(self, health_df=None, save_path=None):
        """
        Interactive health trends dashboard
        """
        if health_df is None:
            try:
                health_df = pd.read_csv(f"{self.data_dir}/cdc_sickle_cell_data.csv")
                health_df['date'] = pd.to_datetime(health_df['date'])
            except (FileNotFoundError, pd.errors.EmptyDataError):
                print("Health data not found")
                return None
        
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('SCD Prevalence', 'Clinical Trials Active',
                          'Treatment Approvals', 'SCD Births per 1000'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # SCD Prevalence
        fig.add_trace(go.Scatter(x=health_df['date'], y=health_df['scd_prevalence_us'],
                                mode='lines+markers', name='Prevalence', line=dict(color='blue')),
                      row=1, col=1)
        
        # Clinical Trials
        fig.add_trace(go.Scatter(x=health_df['date'], y=health_df['clinical_trials_active'],
                                mode='lines+markers', name='Trials', line=dict(color='green')),
                      row=1, col=2)
        
        # Treatment Approvals
        fig.add_trace(go.Bar(x=health_df['date'], y=health_df['new_treatments_approved'],
                           name='Approvals', marker_color='orange'),
                      row=2, col=1)
        
        # SCD Births
        fig.add_trace(go.Scatter(x=health_df['date'], y=health_df['scd_births_per_1000'],
                                mode='lines+markers', name='Births', line=dict(color='red')),
                      row=2, col=2)
        
        fig.update_layout(
            title="Sickle Cell Health Trends",
            height=800,
            showlegend=False
        )
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Health trends saved to {save_path}")
        
        return fig
    
    def plot_stock_performance_heatmap(self, stock_df=None, save_path=None):
        """
        Interactive stock performance heatmap by month
        """
        if stock_df is None:
            try:
                stock_df = pd.read_csv(f"{self.data_dir}/stock_prices_companies.csv")
                # Try to set index as datetime
                stock_df.index = pd.to_datetime(stock_df.index)
                # Drop non-numeric columns for heatmap
                stock_df = stock_df.select_dtypes(include=[np.number])
            except Exception as e:
                print(f"Stock data not available or parsing error: {e}")
                # Create sample data instead
                dates = pd.date_range(start="2020-01-01", end="2024-12-31", freq='ME')
                stock_df = pd.DataFrame(
                    np.random.randn(len(dates), 5) * 0.02,
                    index=dates,
                    columns=['CRSP', 'VRTX', 'EDIT', 'PFE', 'BMY']
                )
                stock_df = stock_df.cumsum() + 100  # Create price-like data
        
        # Calculate monthly returns
        monthly_returns = stock_df.resample('ME').last().pct_change()
        
        # Create year-month columns
        monthly_returns['Year'] = monthly_returns.index.year
        monthly_returns['Month'] = monthly_returns.index.month
        
        # Pivot for heatmap
        heatmap_data = []
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        for ticker in stock_df.columns:
            for year in monthly_returns['Year'].unique():
                year_data = monthly_returns[monthly_returns['Year'] == year]
                row_data = [year]
                for month in range(1, 13):
                    month_data = year_data[year_data['Month'] == month]
                    if len(month_data) > 0 and ticker in month_data.columns:
                        row_data.append(month_data[ticker].values[0])
                    else:
                        row_data.append(None)
                heatmap_data.append(row_data)
        
        heatmap_df = pd.DataFrame(heatmap_data, columns=['Year'] + months)
        
        fig = go.Figure(data=go.Heatmap(
            z=heatmap_df.iloc[:, 1:].values,
            x=months,
            y=heatmap_df['Year'],
            colorscale='RdYlGn',
            zmid=0,
            colorbar=dict(title="Monthly Return")
        ))
        
        fig.update_layout(
            title="Stock Performance by Month",
            height=600
        )
        
        if save_path:
            fig.write_html(save_path)
            print(f"✓ Stock performance heatmap saved to {save_path}")
        
        return fig
    
    def generate_all_visualizations(self):
        """
        Generate all visualizations and save to data/visualizations/
        """
        print("Generating all visualizations...")
        
        viz_dir = "data/visualizations"
        
        # Clinical trials timeline
        self.plot_clinical_trials_timeline(save_path=f"{viz_dir}/clinical_trials_timeline.html")
        
        # Feature importance
        self.plot_feature_importance(save_path=f"{viz_dir}/feature_importance.html")
        
        # Model comparison
        self.plot_model_comparison(save_path=f"{viz_dir}/model_comparison.html")
        
        # Time series decomposition
        self.plot_time_series_decomposition(save_path=f"{viz_dir}/time_series_decomposition.html")
        
        # Correlation heatmap
        self.plot_correlation_heatmap(save_path=f"{viz_dir}/correlation_heatmap.html")
        
        # Health trends
        self.plot_health_trends(save_path=f"{viz_dir}/health_trends.html")
        
        # Stock performance heatmap
        self.plot_stock_performance_heatmap(save_path=f"{viz_dir}/stock_performance_heatmap.html")
        
        print(f"\n✓ All visualizations saved to {viz_dir}/")

if __name__ == "__main__":
    visualizer = SickleCellVisualizers()
    visualizer.generate_all_visualizations()
