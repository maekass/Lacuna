"""
Run all data collectors (VC/growth first so stage analysis CSVs exist).
Run from project root: python src/data_collection/collect_all_data.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.collect_health_data import SickleCellHealthDataCollector
from src.data_collection.collect_stock_data import SickleCellStockDataCollector
from src.data_collection.collect_vc_growth_data import VCGrowthEquityCollector
from src.data_collection.data_manifest import write_data_manifest


def main():
    vc = VCGrowthEquityCollector()
    vc.collect_all_vc_growth_data()
    SickleCellHealthDataCollector().collect_all_health_data()
    SickleCellStockDataCollector().collect_all_stock_data()
    write_data_manifest(vc.data_dir, trigger="collect_all_data")


if __name__ == "__main__":
    main()
