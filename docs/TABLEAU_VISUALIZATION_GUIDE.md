# Tableau-Style Visualization Guide

Professional, publication-ready visualizations using Tableau design principles.

---

## Overview

The platform includes a comprehensive Tableau-style visualization library (`src/visualization/tableau_style.py`) that creates professional, interactive charts matching Tableau's aesthetic and best practices.

### Key Features

- ✅ **Tableau Color Palettes**: Official Tableau 10 and Tableau 20 color schemes
- ✅ **Professional Layouts**: Clean, publication-ready designs
- ✅ **Interactive**: Hover tooltips, zoom, pan, export
- ✅ **Responsive**: Adapts to different screen sizes
- ✅ **8 Chart Types**: Funnel, Treemap, Dual-Axis, Bullet, Waterfall, SPLOM, Choropleth, KPI Dashboard

---

## Quick Start

```python
from src.visualization.tableau_style import TableauVisualizer

# Initialize with Tableau color palette
viz = TableauVisualizer(color_palette='tableau10')

# Create a chart
fig = viz.clinical_trial_funnel(phase_data, disease_name="SCD")

# Display in Streamlit
st.plotly_chart(fig, use_container_width=True)

# Or save to HTML
fig.write_html("output.html")
```

---

## Chart Types

### 1. Clinical Trial Funnel

**Use Case**: Show progression through clinical trial phases

```python
phase_data = pd.DataFrame({
    'Phase': ['Preclinical', 'Phase 1', 'Phase 2', 'Phase 3', 'Approved'],
    'Count': [150, 80, 45, 25, 12],
    'Success_Rate': [0.53, 0.56, 0.56, 0.48, 1.0]
})

fig = viz.clinical_trial_funnel(phase_data, disease_name="Sickle Cell Disease")
```

**Features**:
- Automatic percentage calculations
- Color-coded by phase
- Shows attrition at each stage

---

### 2. Portfolio Treemap

**Use Case**: Visualize portfolio composition and performance

```python
holdings = pd.DataFrame({
    'company': ['CRSP', 'VRTX', 'BLUE'],
    'sector': ['Gene Therapy', 'Gene Therapy', 'Gene Therapy'],
    'market_value': [250000, 450000, 120000],
    'return_pct': [0.15, 0.22, -0.08]
})

fig = viz.portfolio_treemap(
    holdings,
    value_col='market_value',
    label_col='company',
    sector_col='sector',
    color_metric='return_pct'
)
```

**Features**:
- Box size = portfolio weight
- Color = performance (red/green)
- Hierarchical grouping by sector

---

### 3. Dual-Axis Timeline

**Use Case**: Compare two metrics over time (e.g., trials vs stock price)

```python
fig = viz.dual_axis_timeline(
    df=timeline_df,
    date_col='date',
    y1_col='clinical_trials',
    y2_col='stock_price',
    y1_name='Active Clinical Trials',
    y2_name='Stock Price ($)',
    title='Clinical Trial Activity vs Stock Performance'
)
```

**Features**:
- Two independent Y-axes
- Unified hover tooltip
- Different line styles for clarity

---

### 4. Bullet Chart (KPI Dashboard)

**Use Case**: Track KPIs against targets and performance ranges

```python
kpi_data = pd.DataFrame({
    'metric': ['Trial Success Rate', 'Portfolio Return'],
    'actual': [68, 14.5],
    'target': [75, 15.0],
    'ranges': [[50, 65, 100], [10, 12, 20]]  # [poor, good, excellent]
})

fig = viz.bullet_chart(kpi_data)
```

**Features**:
- Actual vs target comparison
- Performance ranges (poor/good/excellent)
- Compact, executive-friendly format

---

### 5. Waterfall Chart

**Use Case**: Show cumulative effect of sequential changes

```python
categories = ['Starting Value', 'Q1 Gains', 'Q2 Losses', 'Q3 Gains', 'Ending Value']
values = [100, 25, -15, 30, 0]  # Last value auto-calculated

fig = viz.waterfall_chart(categories, values, title='Portfolio Changes')
```

**Features**:
- Green for gains, red for losses
- Connecting lines show flow
- Automatic total calculation

---

### 6. Scatter Matrix (SPLOM)

**Use Case**: Explore correlations between multiple variables

```python
fig = viz.scatter_matrix(
    df=metrics_df,
    dimensions=['Trial_Success_Rate', 'R&D_Spending', 'Market_Cap', 'Stock_Return'],
    color_col='sector',  # Optional color coding
    title='Investment Metrics Correlation Matrix'
)
```

**Features**:
- All pairwise scatter plots
- Optional color coding by category
- Diagonal histograms (optional)

---

### 7. Geographic Heatmap

**Use Case**: Show geographic distribution (e.g., trials by state)

```python
state_data = pd.DataFrame({
    'state': ['CA', 'MA', 'NY', 'TX'],
    'clinical_trials': [85, 62, 58, 45]
})

fig = viz.geographic_heatmap(
    state_data,
    location_col='state',
    value_col='clinical_trials',
    title='Clinical Trial Distribution by State'
)
```

**Features**:
- US state choropleth
- Color gradient by value
- Interactive state selection

---

### 8. Executive Summary Dashboard

**Use Case**: High-level KPI overview for executives

```python
from src.visualization.tableau_style import create_dashboard_summary

metrics = {
    'Total Portfolio Value': 1930000,
    'YTD Return': 16.2,
    'Active Trials': 105,
    'Success Rate': 68.5
}

fig = create_dashboard_summary(metrics)
```

**Features**:
- 4-panel layout
- Large, readable numbers
- Color-coded by metric type

---

## Color Palettes

### Tableau 10 (Default)

```python
viz = TableauVisualizer(color_palette='tableau10')
```

Colors: Blue, Orange, Red, Teal, Green, Yellow, Purple, Pink, Brown, Gray

### Tableau 20

```python
viz = TableauVisualizer(color_palette='tableau20')
```

Extended palette with light/dark variants

### Custom Palette

```python
custom_colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
viz = TableauVisualizer(color_palette=custom_colors)
```

---

## Best Practices

### 1. Choose the Right Chart

| Data Type | Recommended Chart |
|-----------|-------------------|
| **Part-to-whole** | Treemap, Pie Chart |
| **Comparison** | Bar Chart, Bullet Chart |
| **Trend over time** | Line Chart, Dual-Axis |
| **Correlation** | Scatter Matrix, Scatter Plot |
| **Geographic** | Choropleth Map |
| **Flow/Process** | Funnel, Waterfall |

### 2. Color Usage

- **Categorical**: Use distinct colors from Tableau palette
- **Sequential**: Use single-hue gradient (light → dark)
- **Diverging**: Use red-white-green for performance metrics
- **Highlight**: Use gray for context, bright color for focus

### 3. Titles & Labels

```python
# Good: Descriptive, actionable
title = "Clinical Trial Success Rate Increased 15% YoY"

# Bad: Generic
title = "Success Rate Chart"
```

### 4. Interactivity

All charts include:
- **Hover tooltips**: Show exact values
- **Zoom/Pan**: Explore details
- **Export**: Download as PNG/SVG
- **Legend toggle**: Show/hide series

---

## Integration with Dashboard

### Streamlit Integration

```python
import streamlit as st
from src.visualization.tableau_style import TableauVisualizer

viz = TableauVisualizer()

# In your Streamlit app
st.title("Portfolio Analysis")

# Create chart
fig = viz.portfolio_treemap(holdings_df)

# Display
st.plotly_chart(fig, use_container_width=True)
```

### Save for Reports

```python
# Save as HTML (interactive)
fig.write_html("report.html")

# Save as static image
fig.write_image("report.png", width=1200, height=800)
```

---

## Examples

Run the demo script to see all chart types:

```bash
python examples/tableau_visualizations_demo.py
```

This generates 8 HTML files in `data/visualizations/` showcasing each chart type.

---

## Advanced Customization

### Modify Layout

```python
fig = viz.clinical_trial_funnel(phase_data)

# Customize further
fig.update_layout(
    title_font_size=20,
    title_font_color='#2C3E50',
    height=600,
    margin=dict(l=100, r=100, t=100, b=100)
)
```

### Add Annotations

```python
fig.add_annotation(
    text="FDA Approval",
    x="Approved",
    y=12,
    showarrow=True,
    arrowhead=2,
    arrowcolor="#E74C3C",
    font=dict(size=12, color="#E74C3C")
)
```

### Custom Hover Templates

```python
fig.update_traces(
    hovertemplate="<b>%{x}</b><br>" +
                  "Count: %{y}<br>" +
                  "Success Rate: %{customdata:.1%}<extra></extra>"
)
```

---

## Performance Tips

1. **Large Datasets**: Use `fig.update_traces(marker=dict(size=3))` for scatter plots
2. **Export**: Use `fig.write_html(include_plotlyjs='cdn')` to reduce file size
3. **Caching**: Cache figures in Streamlit with `@st.cache_data`

---

## Troubleshooting

### Chart Not Displaying

```python
# Ensure Plotly is installed
pip install plotly>=5.17.0

# Check data format
print(df.head())
print(df.dtypes)
```

### Colors Not Showing

```python
# Verify color palette
viz = TableauVisualizer(color_palette='tableau10')
print(viz.colors)
```

### Export Issues

```python
# Install kaleido for static image export
pip install kaleido
```

---

## Resources

- [Plotly Documentation](https://plotly.com/python/)
- [Tableau Color Palettes](https://www.tableau.com/about/blog/2016/7/colors-upgrade-tableau-10-56782)
- [Data Visualization Best Practices](https://www.tableau.com/learn/articles/best-beautiful-data-visualization-examples)

---

**Questions?** Open an issue on GitHub or check the examples folder.
