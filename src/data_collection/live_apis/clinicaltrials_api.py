"""
Live ClinicalTrials.gov API Integration
Fetch real-time trial updates and changes
"""

import requests
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import time


class ClinicalTrialsAPI:
    """
    Interface to ClinicalTrials.gov API v2
    Documentation: https://clinicaltrials.gov/data-api/api
    """
    
    BASE_URL = "https://clinicaltrials.gov/api/v2"
    
    def __init__(self, rate_limit_delay: float = 0.5):
        """
        Initialize API client.
        
        Args:
            rate_limit_delay: Seconds to wait between requests (respect rate limits)
        """
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Immunology-Investment-Dashboard/1.0'
        })
    
    def search_studies(
        self,
        query: str,
        max_results: int = 100,
        fields: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Search for clinical trials.
        
        Args:
            query: Search query (e.g., "sickle cell disease")
            max_results: Maximum number of results to return
            fields: Specific fields to retrieve
            
        Returns:
            DataFrame with trial data
        """
        if fields is None:
            fields = [
                'NCTId', 'BriefTitle', 'OverallStatus', 'Phase',
                'StartDate', 'CompletionDate', 'EnrollmentCount',
                'LeadSponsorName', 'LeadSponsorClass',
                'Condition', 'InterventionName', 'InterventionType'
            ]
        
        params = {
            'query.term': query,
            'pageSize': min(max_results, 1000),
            'fields': ','.join(fields)
        }
        
        try:
            response = self.session.get(
                f"{self.BASE_URL}/studies",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            studies = data.get('studies', [])
            
            # Parse studies into DataFrame
            records = []
            for study in studies:
                protocol = study.get('protocolSection', {})
                identification = protocol.get('identificationModule', {})
                status = protocol.get('statusModule', {})
                design = protocol.get('designModule', {})
                sponsor = protocol.get('sponsorCollaboratorsModule', {})
                conditions = protocol.get('conditionsModule', {})
                interventions = protocol.get('armsInterventionsModule', {})
                
                record = {
                    'nct_id': identification.get('nctId', ''),
                    'title': identification.get('briefTitle', ''),
                    'status': status.get('overallStatus', ''),
                    'phase': ','.join(design.get('phases', [])),
                    'start_date': status.get('startDateStruct', {}).get('date', ''),
                    'completion_date': status.get('completionDateStruct', {}).get('date', ''),
                    'enrollment': status.get('enrollmentInfo', {}).get('count', 0),
                    'sponsor_name': sponsor.get('leadSponsor', {}).get('name', ''),
                    'sponsor_type': sponsor.get('leadSponsor', {}).get('class', ''),
                    'conditions': ', '.join(conditions.get('conditions', [])),
                    'interventions': ', '.join([
                        i.get('name', '') for i in interventions.get('interventions', [])
                    ])
                }
                records.append(record)
            
            time.sleep(self.rate_limit_delay)
            return pd.DataFrame(records)
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching trials: {e}")
            return pd.DataFrame()
    
    def get_study_details(self, nct_id: str) -> Dict:
        """
        Get detailed information for a specific trial.
        
        Args:
            nct_id: NCT ID (e.g., "NCT02565082")
            
        Returns:
            Dictionary with detailed trial information
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/studies/{nct_id}",
                timeout=30
            )
            response.raise_for_status()
            
            time.sleep(self.rate_limit_delay)
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching trial {nct_id}: {e}")
            return {}
    
    def get_recent_updates(
        self,
        disease: str,
        days_back: int = 30
    ) -> pd.DataFrame:
        """
        Get trials updated in the last N days.
        
        Args:
            disease: Disease name
            days_back: Number of days to look back
            
        Returns:
            DataFrame with recently updated trials
        """
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        
        query = f"{disease} AND AREA[LastUpdatePostDate]RANGE[{cutoff_date},MAX]"
        
        return self.search_studies(query, max_results=100)
    
    def get_recruiting_trials(self, disease: str) -> pd.DataFrame:
        """
        Get currently recruiting trials for a disease.
        
        Args:
            disease: Disease name
            
        Returns:
            DataFrame with recruiting trials
        """
        query = f"{disease} AND AREA[OverallStatus]RECRUITING"
        return self.search_studies(query, max_results=100)
    
    def compare_with_cached(
        self,
        cached_df: pd.DataFrame,
        live_df: pd.DataFrame
    ) -> Dict[str, pd.DataFrame]:
        """
        Compare cached data with live data to find changes.
        
        Args:
            cached_df: Previously cached trial data
            live_df: Freshly fetched trial data
            
        Returns:
            Dictionary with 'new', 'updated', 'unchanged' DataFrames
        """
        if cached_df.empty:
            return {
                'new': live_df,
                'updated': pd.DataFrame(),
                'unchanged': pd.DataFrame()
            }
        
        # Find new trials
        cached_ncts = set(cached_df['nct_id'])
        live_ncts = set(live_df['nct_id'])
        
        new_ncts = live_ncts - cached_ncts
        new_trials = live_df[live_df['nct_id'].isin(new_ncts)]
        
        # Find updated trials (status or phase changed)
        common_ncts = cached_ncts & live_ncts
        
        updated_trials = []
        unchanged_trials = []
        
        for nct in common_ncts:
            cached_row = cached_df[cached_df['nct_id'] == nct].iloc[0]
            live_row = live_df[live_df['nct_id'] == nct].iloc[0]
            
            if (cached_row['status'] != live_row['status'] or 
                cached_row.get('phase', '') != live_row.get('phase', '')):
                updated_trials.append(live_row)
            else:
                unchanged_trials.append(live_row)
        
        return {
            'new': new_trials,
            'updated': pd.DataFrame(updated_trials),
            'unchanged': pd.DataFrame(unchanged_trials)
        }


def fetch_live_trial_data(disease: str, max_results: int = 100) -> pd.DataFrame:
    """
    Convenience function to fetch live trial data.
    
    Args:
        disease: Disease name
        max_results: Maximum number of results
        
    Returns:
        DataFrame with trial data
    """
    api = ClinicalTrialsAPI()
    return api.search_studies(disease, max_results=max_results)


def get_trial_change_summary(
    cached_df: pd.DataFrame,
    live_df: pd.DataFrame
) -> Dict[str, int]:
    """
    Get summary statistics of changes.
    
    Args:
        cached_df: Cached trial data
        live_df: Live trial data
        
    Returns:
        Dictionary with change counts
    """
    api = ClinicalTrialsAPI()
    changes = api.compare_with_cached(cached_df, live_df)
    
    return {
        'total_cached': len(cached_df),
        'total_live': len(live_df),
        'new_trials': len(changes['new']),
        'updated_trials': len(changes['updated']),
        'unchanged_trials': len(changes['unchanged'])
    }
