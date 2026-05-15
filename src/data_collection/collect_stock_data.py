"""
Sickle Cell Company Stock Data Collector
Fetches historical stock prices and financial data for companies in sickle cell treatment space
All data from public sources (Yahoo Finance, SEC filings)
"""

import os
import shutil
from pathlib import Path

import pandas as pd
import yfinance as yf

from src.data_collection.csv_writer import write_csv
from src.data_collection.provenance import ProvenanceStore, PullRecord

ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = ROOT / "data" / "demo"


class SickleCellStockDataCollector:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.provenance = ProvenanceStore(data_dir)

        # Tickers chosen for liquidity on Yahoo Finance; refresh as M&A / listings change
        # (GBT / BLUE were removed after delisting / thin history — see README.)
        self.companies = {
            "CRISPR Therapeutics": "CRSP",
            "Vertex Pharmaceuticals": "VRTX",
            "Beam Therapeutics": "BEAM",
            "Intellia Therapeutics": "NTLA",
            "Editas Medicine": "EDIT",
            "Novartis": "NVS",
            "Pfizer": "PFE",
            "Bristol Myers Squibb": "BMY",
            "Emmaus Life Sciences": "EMMS",
            "Sangamo Therapeutics": "SGMO",
        }

        self.etfs = {
            "iShares Biotechnology ETF": "IBB",
            "SPDR S&P Biotech ETF": "XBI",
            "Health Care Select Sector SPDR": "XLV",
            "VanEck Biotech ETF": "BBH",
        }

    def collect_stock_prices(self, tickers, filename):
        print(f"Collecting stock prices for {len(tickers)} tickers...")

        all_data = {}
        for name, ticker in tickers.items():
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period="5y")
                if not hist.empty:
                    all_data[ticker] = hist
                    print(f"  ✓ {ticker} ({name}): {len(hist)} data points")
                else:
                    print(f"  ✗ {ticker} ({name}): No data available")
            except Exception as e:
                print(f"  ✗ {ticker} ({name}): {e}")

        if all_data:
            combined = pd.concat(all_data, axis=1)
            out = Path(self.data_dir) / filename
            if combined.empty:
                print("✗ No stock data collected")
                return None
            combined.to_csv(out)
            self.provenance.record(
                PullRecord.now(
                    artifact=filename,
                    source_url="https://finance.yahoo.com",
                    params={"tickers": list(tickers.values()), "period": "5y"},
                    row_count=len(combined),
                    extractor="yfinance.Ticker.history",
                    kind="sourced_public_delayed",
                )
            )
            print(f"✓ Stock prices saved to {self.data_dir}/{filename}")
            return combined

        demo_src = DEMO_DIR / filename
        dest = Path(self.data_dir) / filename
        if demo_src.is_file():
            shutil.copy2(demo_src, dest)
            print(f"✓ Stock prices restored from demo bundle ({filename})")
            return pd.read_csv(dest, header=[0, 1], index_col=0, parse_dates=True)

        print("✗ No stock data collected")
        return None

    def collect_company_financials(self):
        print("\nCollecting company financial data...")

        financials = []
        for name, ticker in self.companies.items():
            try:
                stock = yf.Ticker(ticker)
                info = stock.info or {}
                fin_data = {
                    "ticker": ticker,
                    "company": name,
                    "market_cap": info.get("marketCap", None),
                    "pe_ratio": info.get("trailingPE", None),
                    "revenue": info.get("totalRevenue", None),
                    "debt_to_equity": info.get("debtToEquity", None),
                    "roe": info.get("returnOnEquity", None),
                    "beta": info.get("beta", None),
                }
                financials.append(fin_data)
                print(f"  ✓ {ticker}")
            except Exception as e:
                print(f"  ✗ {ticker}: {e}")

        df = pd.DataFrame(financials)
        artifact = "company_financials.csv"
        pull = PullRecord.now(
            artifact=artifact,
            source_url="https://query2.finance.yahoo.com/v10/finance/quoteSummary",
            params={"tickers": list(self.companies.values()), "modules": "summaryDetail,financialData"},
            extractor="yfinance.Ticker.info",
            kind="sourced_public_delayed",
        )
        write_csv(
            df,
            f"{self.data_dir}/{artifact}",
            artifact=artifact,
            pull=pull,
            provenance_store=self.provenance,
            enrich_ontology=False,
        )
        print(f"\n✓ Company financials saved ({len(df)} companies)")
        return df

    def collect_news_sentiment(self):
        print("\nCollecting news sentiment data...")
        print("  (News sentiment analysis to be implemented)")
        return None

    def collect_all_stock_data(self):
        print("\n=== Collecting Sickle Cell Company Stock Data ===\n")
        self.collect_stock_prices(self.companies, "stock_prices_companies.csv")
        self.collect_stock_prices(self.etfs, "stock_prices_etfs.csv")
        self.collect_company_financials()
        self.collect_news_sentiment()
        print("\n✓ All stock data collection complete!")


if __name__ == "__main__":
    collector = SickleCellStockDataCollector()
    collector.collect_all_stock_data()
