"""
Generate sample quant data for dashboard demonstration.
Creates CSV files for pairs trading and regime detection pages.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

# Create output directory
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "processed" / "quant"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("Generating sample quant data for dashboard...")

# 1. Generate cointegrated pairs data
print("\n1. Creating cointegrated pairs data...")
pairs_data = pd.DataFrame({
    'ticker_x': ['CRSP', 'EDIT', 'NTLA', 'VRTX'],
    'ticker_y': ['EDIT', 'NTLA', 'BEAM', 'REGN'],
    'pvalue': [0.0234, 0.0412, 0.0189, 0.0456],
    'hedge_ratio': [1.23, 0.87, 1.45, 0.92],
    'half_life': [12.3, 15.7, 10.2, 18.4]
})
pairs_data.to_csv(OUTPUT_DIR / "cointegrated_pairs.csv", index=False)
print(f"   ✓ Saved {len(pairs_data)} pairs to cointegrated_pairs.csv")

# 2. Generate pair backtest metrics
print("\n2. Creating pair backtest metrics...")
pair_metrics = pd.DataFrame({
    'ticker_x': ['CRSP', 'EDIT', 'NTLA', 'VRTX'],
    'ticker_y': ['EDIT', 'NTLA', 'BEAM', 'REGN'],
    'total_return': [15.3, 12.7, 18.9, 10.2],
    'ann_return': [12.1, 10.3, 14.8, 8.5],
    'ann_vol': [18.5, 16.2, 21.3, 15.8],
    'sharpe': [0.65, 0.64, 0.69, 0.54],
    'max_drawdown': [-8.2, -10.5, -12.1, -7.8],
    'num_trades': [24, 18, 32, 15]
})
pair_metrics.to_csv(OUTPUT_DIR / "pair_backtest_metrics.csv", index=False)
print(f"   ✓ Saved metrics for {len(pair_metrics)} pairs to pair_backtest_metrics.csv")

# 3. Generate market regimes data
print("\n3. Creating market regimes data...")
dates = pd.date_range(start='2020-01-01', end='2024-01-01', freq='D')
np.random.seed(42)

# Generate regime sequence with some persistence
regimes = []
current_regime = 'bull'
for _ in dates:
    # 90% chance to stay in same regime
    if np.random.random() > 0.10:
        regimes.append(current_regime)
    else:
        # Switch regime
        if current_regime == 'bull':
            current_regime = np.random.choice(['bear', 'sideways'])
        elif current_regime == 'bear':
            current_regime = np.random.choice(['bull', 'sideways', 'crisis'])
        elif current_regime == 'sideways':
            current_regime = np.random.choice(['bull', 'bear'])
        else:  # crisis
            current_regime = np.random.choice(['bear', 'sideways'])
        regimes.append(current_regime)

regime_data = pd.DataFrame({
    'date': dates,
    'regime': regimes
})
regime_data.to_csv(OUTPUT_DIR / "market_regimes.csv", index=False)
print(f"   ✓ Saved {len(regime_data)} regime observations to market_regimes.csv")

# 4. Generate regime statistics
print("\n4. Creating regime statistics...")
regime_stats = pd.DataFrame({
    'regime': ['bull', 'bear', 'sideways', 'crisis'],
    'count': [892, 234, 312, 23],
    'pct_time': [60.8, 16.0, 21.3, 1.9],
    'ann_return': [18.5, -12.3, 3.2, -28.7],
    'ann_vol': [16.2, 28.5, 12.1, 42.3],
    'sharpe': [1.14, -0.43, 0.26, -0.68]
})
regime_stats.to_csv(OUTPUT_DIR / "regime_statistics.csv", index=False)
print(f"   ✓ Saved statistics for {len(regime_stats)} regimes to regime_statistics.csv")

# 5. Generate transition matrix
print("\n5. Creating regime transition matrix...")
transition_matrix = pd.DataFrame({
    'regime': ['bull', 'bear', 'sideways', 'crisis'],
    'bull': [0.92, 0.05, 0.15, 0.10],
    'bear': [0.03, 0.88, 0.10, 0.20],
    'sideways': [0.04, 0.05, 0.70, 0.15],
    'crisis': [0.01, 0.02, 0.05, 0.55]
})
transition_matrix.to_csv(OUTPUT_DIR / "regime_transitions.csv", index=False)
print(f"   ✓ Saved transition matrix to regime_transitions.csv")

# 6. Generate regime strategy performance
print("\n6. Creating regime strategy performance...")
regime_performance = pd.DataFrame({
    'strategy_return': [16.2],
    'strategy_vol': [18.3],
    'strategy_sharpe': [0.88],
    'max_drawdown': [-15.2],
    'benchmark_return': [12.0],
    'benchmark_sharpe': [0.65],
    'alpha': [4.2]
})
regime_performance.to_csv(OUTPUT_DIR / "regime_strategy_performance.csv", index=False)
print(f"   ✓ Saved strategy performance to regime_strategy_performance.csv")

print("\n" + "="*60)
print("✅ All quant data generated successfully!")
print(f"📁 Output directory: {OUTPUT_DIR}")
print("\nGenerated files:")
print("  - cointegrated_pairs.csv")
print("  - pair_backtest_metrics.csv")
print("  - market_regimes.csv")
print("  - regime_statistics.csv")
print("  - regime_transitions.csv")
print("  - regime_strategy_performance.csv")
print("\n🚀 You can now view these in the Streamlit dashboard:")
print("   streamlit run dashboard/app.py")
print("="*60)
