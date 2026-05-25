"""
FDA Approval Tracker
Monitor FDA drug approvals and regulatory updates
"""

import requests
import feedparser
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import re


class FDATracker:
    """
    Track FDA drug approvals and regulatory updates.
    """
    
    # FDA RSS feeds
    FDA_APPROVALS_RSS = "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-approvals/rss.xml"
    FDA_SAFETY_RSS = "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/fda-drug-safety-communications/rss.xml"
    
    # OpenFDA API
    OPENFDA_BASE = "https://api.fda.gov/drug"
    
    def __init__(self):
        """Initialize FDA tracker."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Immunology-Investment-Dashboard/1.0'
        })
    
    def get_recent_approvals(self, days_back: int = 90) -> pd.DataFrame:
        """
        Get recent FDA drug approvals from RSS feed.
        
        Args:
            days_back: Number of days to look back
            
        Returns:
            DataFrame with approval information
        """
        try:
            feed = feedparser.parse(self.FDA_APPROVALS_RSS)
            
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            approvals = []
            for entry in feed.entries:
                # Parse date
                published = datetime(*entry.published_parsed[:6])
                
                if published >= cutoff_date:
                    approvals.append({
                        'date': published.strftime('%Y-%m-%d'),
                        'title': entry.title,
                        'summary': entry.summary,
                        'link': entry.link,
                        'drug_name': self._extract_drug_name(entry.title),
                        'indication': self._extract_indication(entry.summary)
                    })
            
            return pd.DataFrame(approvals)
            
        except Exception as e:
            print(f"Error fetching FDA approvals: {e}")
            return pd.DataFrame()
    
    def get_safety_communications(self, days_back: int = 90) -> pd.DataFrame:
        """
        Get recent FDA safety communications.
        
        Args:
            days_back: Number of days to look back
            
        Returns:
            DataFrame with safety communications
        """
        try:
            feed = feedparser.parse(self.FDA_SAFETY_RSS)
            
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            communications = []
            for entry in feed.entries:
                published = datetime(*entry.published_parsed[:6])
                
                if published >= cutoff_date:
                    communications.append({
                        'date': published.strftime('%Y-%m-%d'),
                        'title': entry.title,
                        'summary': entry.summary,
                        'link': entry.link,
                        'drug_name': self._extract_drug_name(entry.title)
                    })
            
            return pd.DataFrame(communications)
            
        except Exception as e:
            print(f"Error fetching safety communications: {e}")
            return pd.DataFrame()
    
    def search_openfda_drugs(
        self,
        disease: str,
        limit: int = 100
    ) -> pd.DataFrame:
        """
        Search OpenFDA drug database.
        
        Args:
            disease: Disease or indication to search for
            limit: Maximum number of results
            
        Returns:
            DataFrame with drug information
        """
        try:
            params = {
                'search': f'indications_and_usage:"{disease}"',
                'limit': limit
            }
            
            response = self.session.get(
                f"{self.OPENFDA_BASE}/label.json",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            drugs = []
            for result in results:
                openfda = result.get('openfda', {})
                drugs.append({
                    'brand_name': ', '.join(openfda.get('brand_name', [])),
                    'generic_name': ', '.join(openfda.get('generic_name', [])),
                    'manufacturer': ', '.join(openfda.get('manufacturer_name', [])),
                    'product_type': ', '.join(openfda.get('product_type', [])),
                    'route': ', '.join(openfda.get('route', [])),
                    'substance_name': ', '.join(openfda.get('substance_name', []))
                })
            
            return pd.DataFrame(drugs)
            
        except requests.exceptions.RequestException as e:
            print(f"Error searching OpenFDA: {e}")
            return pd.DataFrame()
    
    def get_drug_adverse_events(
        self,
        drug_name: str,
        limit: int = 100
    ) -> pd.DataFrame:
        """
        Get adverse event reports for a drug.
        
        Args:
            drug_name: Drug name
            limit: Maximum number of results
            
        Returns:
            DataFrame with adverse event data
        """
        try:
            params = {
                'search': f'patient.drug.medicinalproduct:"{drug_name}"',
                'count': 'patient.reaction.reactionmeddrapt.exact',
                'limit': limit
            }
            
            response = self.session.get(
                f"{self.OPENFDA_BASE}/event.json",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            events = []
            for result in results:
                events.append({
                    'reaction': result.get('term', ''),
                    'count': result.get('count', 0)
                })
            
            return pd.DataFrame(events).sort_values('count', ascending=False)
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching adverse events: {e}")
            return pd.DataFrame()
    
    def _extract_drug_name(self, text: str) -> str:
        """Extract drug name from title/text."""
        # Simple heuristic: capitalize words, remove common terms
        text = text.replace('FDA Approves', '').replace('FDA Approval of', '')
        text = text.split('for')[0].strip()
        return text
    
    def _extract_indication(self, text: str) -> str:
        """Extract indication from summary text."""
        # Look for "for treatment of" or "for" patterns
        match = re.search(r'for (?:treatment of |treating )?([^.]+)', text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return ''


def get_fda_approval_timeline(disease: str, days_back: int = 365) -> pd.DataFrame:
    """
    Get FDA approval timeline for a disease.
    
    Args:
        disease: Disease name
        days_back: Days to look back
        
    Returns:
        DataFrame with approval timeline
    """
    tracker = FDATracker()
    approvals = tracker.get_recent_approvals(days_back=days_back)
    
    if not approvals.empty:
        # Filter for disease-specific approvals
        disease_approvals = approvals[
            approvals['indication'].str.contains(disease, case=False, na=False) |
            approvals['summary'].str.contains(disease, case=False, na=False)
        ]
        return disease_approvals
    
    return pd.DataFrame()


def get_fda_dashboard_summary() -> Dict[str, any]:
    """
    Get summary statistics for FDA dashboard.
    
    Returns:
        Dictionary with summary stats
    """
    tracker = FDATracker()
    
    approvals_30d = tracker.get_recent_approvals(days_back=30)
    approvals_90d = tracker.get_recent_approvals(days_back=90)
    safety_30d = tracker.get_safety_communications(days_back=30)
    
    return {
        'approvals_last_30_days': len(approvals_30d),
        'approvals_last_90_days': len(approvals_90d),
        'safety_alerts_last_30_days': len(safety_30d),
        'latest_approval': approvals_30d.iloc[0].to_dict() if not approvals_30d.empty else None,
        'latest_safety_alert': safety_30d.iloc[0].to_dict() if not safety_30d.empty else None
    }
