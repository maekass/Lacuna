#!/usr/bin/env python3
"""
Update data manifest to remove illustrative files
"""
import json
from pathlib import Path
from datetime import datetime, timezone

def main():
    manifest_path = Path(__file__).parent.parent / 'data' / 'raw' / 'data_manifest.json'
    
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    # Files to remove
    illustrative_files = [
        'gene_therapy_pipeline_scd.csv',
        'pipeline_sle.csv',
        'pipeline_sarc.csv',
        'vc_deals_scd.csv',
        'growth_equity_deals_scd.csv',
        'public_equity_companies_scd.csv',
        'stage_returns_analysis.csv',
        'precision_medicine_pipeline.csv',
        'market_size_scd.csv',
        'large_pharma_investments_scd.csv',
        'competitive_landscape_scd.csv',
        'deal_flow_scd.csv',
        'regulatory_landscape_scd.csv',
        'investment_attractiveness_scd.csv'
    ]
    
    artifacts = manifest.get('artifacts', {})
    removed = []
    
    for filename in illustrative_files:
        if filename in artifacts:
            del artifacts[filename]
            removed.append(filename)
    
    # Update manifest metadata
    manifest['last_manifest_write_utc'] = datetime.now(timezone.utc).isoformat()
    manifest['trigger'] = 'manual_cleanup_illustrative_files'
    
    # Save updated manifest
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f'✅ Removed {len(removed)} illustrative files from manifest')
    print(f'✅ Remaining artifacts: {len(artifacts)}')
    
    if removed:
        print('\nRemoved files:')
        for f in removed:
            print(f'  - {f}')

if __name__ == '__main__':
    main()
