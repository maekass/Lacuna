"""
Main Data Collection Script
Orchestrates collection of all health and stock data for the Sickle Cell Investment Analysis project
"""

from collect_health_data import SickleCellHealthDataCollector
from collect_stock_data import SickleCellStockDataCollector
from collect_vc_growth_data import VCGrowthEquityCollector
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'models'))
from market_analysis import SickleCellMarketAnalyzer

def main():
    print("="*60)
    print("SICKLE CELL INVESTMENT ANALYSIS - DATA COLLECTION")
    print("="*60)
    print("\n⚠️  LEGAL DISCLAIMER:")
    print("   This project uses only publicly available data for educational purposes.")
    print("   All data is delayed and not suitable for real-time trading.")
    print("   This is NOT investment advice.\n")
    
    # Create data directories
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("data/processed", exist_ok=True)
    os.makedirs("data/external", exist_ok=True)
    
    # Collect health data
    health_collector = SickleCellHealthDataCollector(data_dir="data/raw")
    health_collector.collect_all_health_data()
    
    print("\n" + "="*60 + "\n")
    
    # Collect stock data
    stock_collector = SickleCellStockDataCollector(data_dir="data/raw")
    stock_collector.collect_all_stock_data()
    
    print("\n" + "="*60 + "\n")
    
    # Collect VC and Growth Equity data
    vc_growth_collector = VCGrowthEquityCollector(data_dir="data/raw")
    vc_growth_collector.collect_all_vc_growth_data()
    
    print("\n" + "="*60 + "\n")
    
    # Collect Market Analysis data
    market_analyzer = SickleCellMarketAnalyzer(data_dir="data/raw")
    market_analyzer.generate_market_report()
    
    print("\n" + "="*60)
    print("✓ DATA COLLECTION COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("1. Explore the data in the notebooks/")
    print("2. Run ML models in src/models/")
    print("3. Run investment stage analysis: python src/models/investment_stage_analysis.py")
    print("4. Run market analysis: python src/models/market_analysis.py")
    print("5. Launch dashboard: streamlit run dashboard/app.py")

if __name__ == "__main__":
    main()
