"""
PubMed API Integration
Link clinical trials to published research
"""

import requests
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import time
import xml.etree.ElementTree as ET


class PubMedAPI:
    """
    Interface to NCBI PubMed E-utilities API.
    Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25501/
    """
    
    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    
    def __init__(self, email: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize PubMed API client.
        
        Args:
            email: Your email (required by NCBI)
            api_key: NCBI API key (optional, increases rate limit)
        """
        self.email = email or "research@example.com"
        self.api_key = api_key
        self.rate_limit = 0.34 if not api_key else 0.1  # 3/sec without key, 10/sec with key
        
        self.session = requests.Session()
    
    def search(
        self,
        query: str,
        max_results: int = 100,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> List[str]:
        """
        Search PubMed and return PMIDs.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            date_from: Start date (YYYY/MM/DD)
            date_to: End date (YYYY/MM/DD)
            
        Returns:
            List of PMIDs
        """
        params = {
            'db': 'pubmed',
            'term': query,
            'retmax': max_results,
            'retmode': 'json',
            'email': self.email
        }
        
        if self.api_key:
            params['api_key'] = self.api_key
        
        if date_from or date_to:
            date_range = f"{date_from or '1900/01/01'}:{date_to or '3000/12/31'}[pdat]"
            params['term'] = f"{query} AND {date_range}"
        
        try:
            response = self.session.get(
                f"{self.BASE_URL}/esearch.fcgi",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            pmids = data.get('esearchresult', {}).get('idlist', [])
            
            time.sleep(self.rate_limit)
            return pmids
            
        except requests.exceptions.RequestException as e:
            print(f"Error searching PubMed: {e}")
            return []
    
    def fetch_details(self, pmids: List[str]) -> pd.DataFrame:
        """
        Fetch detailed information for PMIDs.
        
        Args:
            pmids: List of PubMed IDs
            
        Returns:
            DataFrame with article details
        """
        if not pmids:
            return pd.DataFrame()
        
        # Batch PMIDs (max 200 per request)
        batch_size = 200
        all_articles = []
        
        for i in range(0, len(pmids), batch_size):
            batch = pmids[i:i+batch_size]
            
            params = {
                'db': 'pubmed',
                'id': ','.join(batch),
                'retmode': 'xml',
                'email': self.email
            }
            
            if self.api_key:
                params['api_key'] = self.api_key
            
            try:
                response = self.session.get(
                    f"{self.BASE_URL}/efetch.fcgi",
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                
                # Parse XML
                root = ET.fromstring(response.content)
                
                for article in root.findall('.//PubmedArticle'):
                    article_data = self._parse_article(article)
                    all_articles.append(article_data)
                
                time.sleep(self.rate_limit)
                
            except Exception as e:
                print(f"Error fetching details for batch: {e}")
                continue
        
        return pd.DataFrame(all_articles)
    
    def search_and_fetch(
        self,
        query: str,
        max_results: int = 100,
        date_from: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Search and fetch article details in one call.
        
        Args:
            query: Search query
            max_results: Maximum results
            date_from: Start date
            
        Returns:
            DataFrame with article details
        """
        pmids = self.search(query, max_results=max_results, date_from=date_from)
        return self.fetch_details(pmids)
    
    def link_trial_to_publications(self, nct_id: str) -> pd.DataFrame:
        """
        Find publications linked to a clinical trial.
        
        Args:
            nct_id: NCT ID (e.g., "NCT02565082")
            
        Returns:
            DataFrame with linked publications
        """
        query = f"{nct_id}[si]"  # [si] = secondary source ID
        return self.search_and_fetch(query, max_results=50)
    
    def get_recent_publications(
        self,
        disease: str,
        days_back: int = 30
    ) -> pd.DataFrame:
        """
        Get recent publications for a disease.
        
        Args:
            disease: Disease name
            days_back: Number of days to look back
            
        Returns:
            DataFrame with recent publications
        """
        date_from = (datetime.now() - timedelta(days=days_back)).strftime('%Y/%m/%d')
        query = f"{disease} AND clinical trial[pt]"
        
        return self.search_and_fetch(query, max_results=100, date_from=date_from)
    
    def _parse_article(self, article_elem) -> Dict:
        """Parse XML article element into dictionary."""
        try:
            medline = article_elem.find('.//MedlineCitation')
            article_node = medline.find('.//Article')
            
            # PMID
            pmid = medline.find('.//PMID').text if medline.find('.//PMID') is not None else ''
            
            # Title
            title_node = article_node.find('.//ArticleTitle')
            title = title_node.text if title_node is not None else ''
            
            # Abstract
            abstract_node = article_node.find('.//Abstract/AbstractText')
            abstract = abstract_node.text if abstract_node is not None else ''
            
            # Authors
            authors = []
            for author in article_node.findall('.//Author'):
                last_name = author.find('.//LastName')
                fore_name = author.find('.//ForeName')
                if last_name is not None and fore_name is not None:
                    authors.append(f"{fore_name.text} {last_name.text}")
            
            # Journal
            journal_node = article_node.find('.//Journal/Title')
            journal = journal_node.text if journal_node is not None else ''
            
            # Publication date
            pub_date = article_node.find('.//Journal/JournalIssue/PubDate')
            year = pub_date.find('.//Year').text if pub_date is not None and pub_date.find('.//Year') is not None else ''
            month = pub_date.find('.//Month').text if pub_date is not None and pub_date.find('.//Month') is not None else ''
            
            return {
                'pmid': pmid,
                'title': title,
                'abstract': abstract[:500] if abstract else '',  # Truncate
                'authors': ', '.join(authors[:3]),  # First 3 authors
                'journal': journal,
                'year': year,
                'month': month,
                'pubmed_url': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
            }
            
        except Exception as e:
            print(f"Error parsing article: {e}")
            return {}


def search_trial_publications(nct_id: str) -> pd.DataFrame:
    """
    Convenience function to search for trial publications.
    
    Args:
        nct_id: Clinical trial NCT ID
        
    Returns:
        DataFrame with publications
    """
    api = PubMedAPI()
    return api.link_trial_to_publications(nct_id)


def get_disease_publication_trends(
    disease: str,
    months_back: int = 12
) -> pd.DataFrame:
    """
    Get publication trends over time for a disease.
    
    Args:
        disease: Disease name
        months_back: Number of months to analyze
        
    Returns:
        DataFrame with monthly publication counts
    """
    api = PubMedAPI()
    
    trends = []
    for i in range(months_back):
        start_date = (datetime.now() - timedelta(days=30*(i+1))).strftime('%Y/%m/%d')
        end_date = (datetime.now() - timedelta(days=30*i)).strftime('%Y/%m/%d')
        
        pmids = api.search(
            f"{disease} AND clinical trial[pt]",
            max_results=1000,
            date_from=start_date,
            date_to=end_date
        )
        
        trends.append({
            'month': (datetime.now() - timedelta(days=30*i)).strftime('%Y-%m'),
            'publication_count': len(pmids)
        })
    
    return pd.DataFrame(trends).sort_values('month')
