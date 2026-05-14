"""
Multi-Disease Stock Data Collector
Fetches public stock market data for companies involved in immunology treatments
Uses delayed public data (15+ minutes) - legally compliant
Supports: SCD, SLE, HS, Diabetic Nephropathy, Autoimmune Liver, MS, Food Allergy
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_collection.disease_config import DiseaseConfig, SECTOR_ETFS

class MultiDiseaseStockDataCollector:
    def __init__(self, disease_name="Sickle Cell Disease", data_dir="data/raw"):
        self.data_dir = data_dir
        self.disease_name = disease_name
        os.makedirs(data_dir, exist_ok=True)
        
        # Get disease-specific configuration
        self.disease_config = DiseaseConfig.get_disease_config(disease_name)
        self.companies = self.disease_config["companies"]
        
        # Healthcare ETFs for sector comparison (universal)
        self.etfs = SECTOR_ETFS
    
    def set_disease(self, disease_name: str):
        """Switch to a different disease context"""
        self.disease_name = disease_name
        self.disease_config = DiseaseConfig.get_disease_config(disease_name)
        self.companies = self.disease_config["companies"]
        print(f"Switched to {disease_name} ({self.disease_config['code']})")
    
    def collect_stock_prices(self, tickers=None, period="5y", filename_suffix=None):
        """
        Collect historical stock prices for disease-relevant companies
        Uses yfinance (delayed public data)
        """
        if tickers is None:
            tickers = self.companies
        
        if filename_suffix is None:
            filename_suffix = self.disease_config["code"].lower()
        
        print(f"\nCollecting stock prices for {self.disease_name} ({len(tickers)} tickers)...")
        
        all_data = {}
        for name, ticker in tickers.items():
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period=period)
                
                if not hist.empty:
                    all_data[ticker] = hist
                    print(f"  ✓ {ticker} ({name}): {len(hist)} data points")
                else:
                    print(f"  ✗ {ticker} ({name}): No data available")
            except Exception as e:
                print(f"  ✗ {ticker} ({name}): Error - {e}")
        
        # Combine all data
        if all_data:
            combined = pd.concat(all_data, axis=1, names=['Ticker', 'Price'])
            combined.columns = combined.columns.swaplevel(0, 1)
            
            filename = f"{self.data_dir}/stock_prices_{filename_suffix}.csv"
            combined.to_csv(filename)
            print(f"\n✓ Stock prices saved to {filename}")
            return combined
        else:
            print("\n✗ No stock data collected")
            return None
    
    def collect_company_financials(self, disease_code=None):
        """
        Collect financial statements for disease-relevant companies
        """
        if disease_code is None:
            disease_code = self.disease_config["code"].lower()
        
        print(f"\nCollecting company financials for {self.disease_name}...")
        
        financials_data = []
        for name, ticker in self.companies.items():
            try:
                stock = yf.Ticker(ticker)
                info = stock.info
                
                company_data = {
                    "ticker": ticker,
                    "name": name,
                    "market_cap": info.get('marketCap', None),
                    "pe_ratio": info.get('trailingPE', None),
                    "revenue": info.get('totalRevenue', None),
                    "debt_to_equity": info.get('debtToEquity', None),
                    "profit_margin": info.get('profitMargins', None),
                    "beta": info.get('beta', None),
                    "sector": info.get('sector', None),
                    "industry": info.get('industry', None)
                }
                financials_data.append(company_data)
                print(f"  ✓ {ticker}")
            except Exception as e:
                print(f"  ✗ {ticker}: {e}")
        
        df = pd.DataFrame(financials_data)
        filename = f"{self.data_dir}/company_financials_{disease_code}.csv"
        df.to_csv(filename, index=False)
        print(f"\n✓ Company financials saved to {filename} ({len(df)} companies)")
        return df
    
    def collect_news_sentiment(self):
        """
        Collect news headlines for sentiment analysis
        Note: This is a placeholder - implement with news API
        """
        print("News sentiment collection would go here")
        print("  (Implement with NewsAPI, Alpha Vantage News, or similar)")
        return None
    
    def collect_all_stock_data(self, disease_name=None):
        """
        Collect all stock-related data for a disease
        
        Args:
            disease_name: Disease to collect data for (uses current if None)
        """
        if disease_name:
            self.set_disease(disease_name)
        
        disease_code = self.disease_config["code"].lower()
        print(f"\n=== Collecting Stock Data for {self.disease_name} ===\n")
        
        # Collect company stock prices
        self.collect_stock_prices(period="5y", filename_suffix=disease_code)
        
        # Collect ETF prices for sector comparison (once, universal)
        print("\n--- Collecting sector ETF data ---")
        self.collect_stock_prices(self.etfs, period="5y", filename_suffix="etfs")
        
        # Collect financials
        self.collect_company_financials(disease_code)
        
        print(f"\n✓ All stock data collection complete for {self.disease_name}!")
        return True
    
    @staticmethod
    def collect_all_diseases():
        """Collect stock data for all supported diseases"""
        diseases = DiseaseConfig.get_disease_names()
        print(f"\n{'='*60}")
        print(f"COLLECTING STOCK DATA FOR {len(diseases)} DISEASE AREAS")
        print(f"{'='*60}")
        
        results = {}
        for disease in diseases:
            try:
                collector = MultiDiseaseStockDataCollector(disease_name=disease)
                collector.collect_all_stock_data()
                results[disease] = "Success"
            except Exception as e:
                print(f"\n✗ Error collecting data for {disease}: {e}")
                results[disease] = f"Error: {e}"
        
        print(f"\n{'='*60}")
        print("COLLECTION SUMMARY")
        print(f"{'='*60}")
        for disease, status in results.items():
            print(f"  {disease}: {status}")
        
        return results


# Backward compatibility - alias for old class name
SickleCellStockDataCollector = MultiDiseaseStockDataCollector

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Collect stock data for immunology diseases")
    parser.add_argument("--disease", "-d", type=str, default="Sickle Cell Disease",
                        help="Disease area to collect data for")
    parser.add_argument("--all", "-a", action="store_true",
                        help="Collect data for all supported diseases")
    
    args = parser.parse_args()
    
    if args.all:
        MultiDiseaseStockDataCollector.collect_all_diseases()
    else:
        collector = MultiDiseaseStockDataCollector(disease_name=args.disease)
        collector.collect_all_stock_data()
