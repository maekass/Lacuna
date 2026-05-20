"""
Demo: Tableau-Style Visualizations for Healthcare Investment Analysis
Run this script to see all visualization types in action
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from src.visualization.tableau_style import TableauVisualizer, create_dashboard_summary

# Initialize visualizer
viz = TableauVisualizer(color_palette='tableau10')

print("=" * 60)
print("TABLEAU-STYLE VISUALIZATION DEMO")
print("=" * 60)

# ============================================================================
# 1. CLINICAL TRIAL FUNNEL
# ============================================================================
print("\n1. Creating Clinical Trial Funnel Chart...")

phase_data = pd.DataFrame({
    'Phase': ['Preclinical', 'Phase 1', 'Phase 2', 'Phase 3', 'Approved'],
    'Count': [150, 80, 45, 25, 12],
    'Success_Rate': [0.53, 0.56, 0.56, 0.48, 1.0]
})

funnel_fig = viz.clinical_trial_funnel(phase_data, disease_name="Sickle Cell Disease")
funnel_fig.write_html("data/visualizations/tableau_funnel.html")
print("   ✓ Saved to data/visualizations/tableau_funnel.html")

# ============================================================================
# 2. PORTFOLIO TREEMAP
# ============================================================================
print("\n2. Creating Portfolio Treemap...")

holdings = pd.DataFrame({
    'company': ['CRSP', 'VRTX', 'BLUE', 'EDIT', 'NTLA', 'BEAM', 'SGMO', 'PFE'],
    'sector': ['Gene Therapy', 'Gene Therapy', 'Gene Therapy', 'Gene Therapy',
               'Gene Therapy', 'Gene Therapy', 'Gene Therapy', 'Big Pharma'],
    'market_value': [250000, 450000, 120000, 180000, 200000, 150000, 80000, 500000],
    'return_pct': [0.15, 0.22, -0.08, 0.12, 0.18, 0.10, -0.05, 0.08]
})

treemap_fig = viz.portfolio_treemap(holdings)
treemap_fig.write_html("data/visualizations/tableau_treemap.html")
print("   ✓ Saved to data/visualizations/tableau_treemap.html")

# ============================================================================
# 3. DUAL-AXIS TIMELINE
# ============================================================================
print("\n3. Creating Dual-Axis Timeline...")

dates = pd.date_range('2023-01-01', periods=24, freq='M')
timeline_df = pd.DataFrame({
    'date': dates,
    'clinical_trials': 50 + np.cumsum(np.random.randn(24) * 2),
    'stock_price': 100 + np.cumsum(np.random.randn(24) * 5)
})

dual_axis_fig = viz.dual_axis_timeline(
    timeline_df,
    date_col='date',
    y1_col='clinical_trials',
    y2_col='stock_price',
    y1_name='Active Clinical Trials',
    y2_name='Stock Price ($)',
    title='Clinical Trial Activity vs Stock Performance'
)
dual_axis_fig.write_html("data/visualizations/tableau_dual_axis.html")
print("   ✓ Saved to data/visualizations/tableau_dual_axis.html")

# ============================================================================
# 4. BULLET CHART (KPI Dashboard)
# ============================================================================
print("\n4. Creating Bullet Chart KPI Dashboard...")

kpi_data = pd.DataFrame({
    'metric': ['Trial Success Rate', 'Portfolio Return', 'R&D Spending', 'Market Share'],
    'actual': [68, 14.5, 85, 22],
    'target': [75, 15.0, 90, 25],
    'ranges': [[50, 65, 100], [10, 12, 20], [60, 75, 100], [15, 20, 30]]
})

bullet_fig = viz.bullet_chart(kpi_data)
bullet_fig.write_html("data/visualizations/tableau_bullet.html")
print("   ✓ Saved to data/visualizations/tableau_bullet.html")

# ============================================================================
# 5. WATERFALL CHART
# ============================================================================
print("\n5. Creating Waterfall Chart...")

categories = ['Starting Value', 'Q1 Gains', 'Q2 Losses', 'Q3 Gains', 'Q4 Gains', 'Ending Value']
values = [100, 25, -15, 30, 20, 0]  # Last value auto-calculated

waterfall_fig = viz.waterfall_chart(
    categories,
    values,
    title='Portfolio Value Changes (2024)'
)
waterfall_fig.write_html("data/visualizations/tableau_waterfall.html")
print("   ✓ Saved to data/visualizations/tableau_waterfall.html")

# ============================================================================
# 6. SCATTER MATRIX
# ============================================================================
print("\n6. Creating Scatter Matrix...")

np.random.seed(42)
scatter_df = pd.DataFrame({
    'Trial_Success_Rate': np.random.uniform(0.4, 0.8, 50),
    'R&D_Spending_M': np.random.uniform(50, 500, 50),
    'Market_Cap_B': np.random.uniform(1, 100, 50),
    'Stock_Return': np.random.uniform(-0.2, 0.4, 50)
})

scatter_matrix_fig = viz.scatter_matrix(
    scatter_df,
    dimensions=['Trial_Success_Rate', 'R&D_Spending_M', 'Market_Cap_B', 'Stock_Return'],
    title='Investment Metrics Correlation Matrix'
)
scatter_matrix_fig.write_html("data/visualizations/tableau_scatter_matrix.html")
print("   ✓ Saved to data/visualizations/tableau_scatter_matrix.html")

# ============================================================================
# 7. GEOGRAPHIC HEATMAP
# ============================================================================
print("\n7. Creating Geographic Heatmap...")

state_data = pd.DataFrame({
    'state': ['CA', 'MA', 'NY', 'TX', 'PA', 'IL', 'NC', 'WA', 'MD', 'NJ'],
    'clinical_trials': [85, 62, 58, 45, 38, 35, 32, 28, 25, 22]
})

geo_fig = viz.geographic_heatmap(
    state_data,
    location_col='state',
    value_col='clinical_trials',
    title='Clinical Trial Distribution by State'
)
geo_fig.write_html("data/visualizations/tableau_geographic.html")
print("   ✓ Saved to data/visualizations/tableau_geographic.html")

# ============================================================================
# 8. EXECUTIVE SUMMARY DASHBOARD
# ============================================================================
print("\n8. Creating Executive Summary Dashboard...")

summary_metrics = {
    'Total Portfolio Value': 1930000,
    'YTD Return': 16.2,
    'Active Trials': 105,
    'Success Rate': 68.5
}

summary_fig = create_dashboard_summary(summary_metrics)
summary_fig.write_html("data/visualizations/tableau_summary.html")
print("   ✓ Saved to data/visualizations/tableau_summary.html")

print("\n" + "=" * 60)
print("✓ ALL VISUALIZATIONS GENERATED SUCCESSFULLY")
print("=" * 60)
print("\nOpen the HTML files in data/visualizations/ to view them")
print("\nTableau-style features:")
print("  • Professional color palettes (Tableau 10 & 20)")
print("  • Clean, publication-ready layouts")
print("  • Interactive hover tooltips")
print("  • Responsive design")
print("  • Export-ready for presentations")
