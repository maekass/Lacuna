"""
Populate data/raw CSVs when missing (e.g. Streamlit Community Cloud deploy).
Run from project root only; called once per server process via dashboard cache.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.collect_health_data import SickleCellHealthDataCollector
from src.data_collection.collect_stock_data import SickleCellStockDataCollector
from src.data_collection.collect_vc_growth_data import VCGrowthEquityCollector
from src.data_collection.data_manifest import write_data_manifest
from src.models.investment_stage_analysis import InvestmentStageAnalyzer
from src.models.market_analysis import SickleCellMarketAnalyzer

MARKER_FILE = "gene_therapy_pipeline_scd.csv"


def data_is_present(data_dir: Path) -> bool:
    return (data_dir / MARKER_FILE).exists()


def run_full_pipeline(data_dir: Path | str = "data/raw") -> None:
    """Collect health/stock/VC data, stage analysis, and market tables."""
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    vc = VCGrowthEquityCollector(data_dir=str(data_path))
    vc.collect_all_vc_growth_data()
    SickleCellHealthDataCollector(data_dir=str(data_path)).collect_all_health_data()
    SickleCellStockDataCollector(data_dir=str(data_path)).collect_all_stock_data()
    write_data_manifest(str(data_path), trigger="bootstrap_data.run_full_pipeline")

    InvestmentStageAnalyzer(data_dir=str(data_path)).generate_report()
    SickleCellMarketAnalyzer(data_dir=str(data_path)).generate_market_report()


def main() -> None:
    run_full_pipeline(ROOT / "data" / "raw")


if __name__ == "__main__":
    main()
