"""
Retry decorator with exponential backoff

Usage:
    from src.utils.retry_decorator import retry_with_backoff
    
    @retry_with_backoff(max_attempts=3)
    def fetch_data():
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
"""

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
import requests


def retry_with_backoff(max_attempts=3, min_wait=1, max_wait=10):
    """
    Retry decorator with exponential backoff
    
    Args:
        max_attempts: Maximum number of retry attempts
        min_wait: Minimum wait time in seconds
        max_wait: Maximum wait time in seconds
    """
    return retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
        retry=retry_if_exception_type((
            requests.exceptions.RequestException,
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError
        )),
        reraise=True
    )
