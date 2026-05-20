"""
Advanced Python Demonstrations Module

Professional-grade Python code showcasing advanced language features,
design patterns, and computer science fundamentals.

Modules:
    - decorators_and_context: Decorators, context managers, metaclasses
    - async_patterns: Async/await, concurrency, parallelism
    - data_structures_algorithms: Custom data structures and algorithms
"""

__version__ = "1.0.0"
__author__ = "Mae Kaess"

# Import key classes for easy access
from .decorators_and_context import (
    timer,
    retry,
    memoize,
    timer_context,
    Singleton,
    Pipeline,
)

from .async_patterns import (
    fetch_multiple_urls,
    AsyncTaskQueue,
    AsyncBatcher,
    AsyncRetry,
    CircuitBreaker,
)

from .data_structures_algorithms import (
    LinkedList,
    BinarySearchTree,
    Graph,
    Trie,
    LRUCache,
    quick_sort,
    merge_sort,
)

__all__ = [
    # Decorators
    'timer',
    'retry',
    'memoize',
    'timer_context',
    'Singleton',
    'Pipeline',
    # Async
    'fetch_multiple_urls',
    'AsyncTaskQueue',
    'AsyncBatcher',
    'AsyncRetry',
    'CircuitBreaker',
    # Data Structures
    'LinkedList',
    'BinarySearchTree',
    'Graph',
    'Trie',
    'LRUCache',
    'quick_sort',
    'merge_sort',
]
