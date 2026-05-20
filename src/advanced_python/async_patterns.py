"""
Advanced Python: Async/Await and Concurrent Programming
Demonstrates modern asynchronous patterns for high-performance applications
"""

import asyncio
import aiohttp
import time
from typing import List, Dict, Any, Callable
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing as mp
from dataclasses import dataclass

# ============================================================================
# ASYNC/AWAIT PATTERNS
# ============================================================================

async def fetch_url_async(session: aiohttp.ClientSession, url: str) -> Dict[str, Any]:
    """
    Async function to fetch URL with error handling
    
    Usage:
        async with aiohttp.ClientSession() as session:
            result = await fetch_url_async(session, "https://api.example.com")
    """
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
            data = await response.json()
            return {
                'url': url,
                'status': response.status,
                'data': data,
                'success': True
            }
    except Exception as e:
        return {
            'url': url,
            'status': None,
            'data': None,
            'success': False,
            'error': str(e)
        }


async def fetch_multiple_urls(urls: List[str]) -> List[Dict[str, Any]]:
    """
    Fetch multiple URLs concurrently using asyncio
    
    Demonstrates: Concurrent API calls with async/await
    """
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url_async(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results


async def rate_limited_fetch(urls: List[str], max_concurrent: int = 5) -> List[Dict]:
    """
    Fetch URLs with rate limiting using semaphore
    
    Demonstrates: Concurrency control with asyncio.Semaphore
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def fetch_with_limit(session, url):
        async with semaphore:
            return await fetch_url_async(session, url)
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_limit(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results


# ============================================================================
# ASYNC GENERATORS AND ITERATORS
# ============================================================================

async def async_range(start: int, stop: int, delay: float = 0.1):
    """
    Async generator that yields numbers with delay
    
    Usage:
        async for num in async_range(0, 10):
            print(num)
    """
    for i in range(start, stop):
        await asyncio.sleep(delay)
        yield i


async def async_file_reader(filepath: str, chunk_size: int = 1024):
    """
    Async generator to read file in chunks
    
    Demonstrates: Async I/O with generators
    """
    import aiofiles
    
    async with aiofiles.open(filepath, 'rb') as f:
        while True:
            chunk = await f.read(chunk_size)
            if not chunk:
                break
            yield chunk


class AsyncIterator:
    """
    Custom async iterator for data streaming
    
    Usage:
        async for item in AsyncIterator(data_source):
            process(item)
    """
    
    def __init__(self, data: List[Any], delay: float = 0.1):
        self.data = data
        self.delay = delay
        self.index = 0
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        if self.index >= len(self.data):
            raise StopAsyncIteration
        
        await asyncio.sleep(self.delay)
        value = self.data[self.index]
        self.index += 1
        return value


# ============================================================================
# ASYNC CONTEXT MANAGERS
# ============================================================================

class AsyncDatabaseConnection:
    """
    Async context manager for database connections
    
    Usage:
        async with AsyncDatabaseConnection(config) as conn:
            result = await conn.query("SELECT * FROM users")
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection = None
    
    async def __aenter__(self):
        # Simulate async connection
        await asyncio.sleep(0.1)
        self.connection = f"Connected to {self.config.get('host', 'localhost')}"
        print(f"Database connection opened: {self.connection}")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Simulate async cleanup
        await asyncio.sleep(0.1)
        print(f"Database connection closed: {self.connection}")
        self.connection = None
        return False
    
    async def query(self, sql: str):
        """Execute async query"""
        await asyncio.sleep(0.05)
        return f"Results for: {sql}"


# ============================================================================
# CONCURRENT FUTURES AND THREAD/PROCESS POOLS
# ============================================================================

def cpu_intensive_task(n: int) -> int:
    """CPU-bound task for multiprocessing demonstration"""
    result = 0
    for i in range(n):
        result += i ** 2
    return result


def io_intensive_task(url: str) -> Dict[str, Any]:
    """I/O-bound task for threading demonstration"""
    import requests
    try:
        response = requests.get(url, timeout=5)
        return {
            'url': url,
            'status': response.status_code,
            'success': True
        }
    except Exception as e:
        return {
            'url': url,
            'status': None,
            'success': False,
            'error': str(e)
        }


async def run_in_thread_pool(func: Callable, *args, max_workers: int = 5):
    """
    Run blocking function in thread pool from async context
    
    Demonstrates: Mixing sync and async code
    """
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        result = await loop.run_in_executor(executor, func, *args)
        return result


async def run_in_process_pool(func: Callable, data: List[Any], max_workers: int = None):
    """
    Run CPU-intensive function in process pool from async context
    
    Demonstrates: Parallel processing with async coordination
    """
    if max_workers is None:
        max_workers = mp.cpu_count()
    
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        results = await asyncio.gather(*[
            loop.run_in_executor(executor, func, item)
            for item in data
        ])
        return results


# ============================================================================
# ASYNC QUEUE PATTERNS
# ============================================================================

@dataclass
class Task:
    """Task data structure for queue processing"""
    id: int
    data: Any
    priority: int = 0


class AsyncTaskQueue:
    """
    Async task queue with producer-consumer pattern
    
    Usage:
        queue = AsyncTaskQueue(max_workers=3)
        await queue.start()
        await queue.add_task(Task(1, "data"))
        await queue.shutdown()
    """
    
    def __init__(self, max_workers: int = 3):
        self.queue = asyncio.Queue()
        self.max_workers = max_workers
        self.workers = []
        self.running = False
    
    async def worker(self, worker_id: int):
        """Worker coroutine to process tasks"""
        while self.running:
            try:
                task = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                print(f"Worker {worker_id} processing task {task.id}")
                
                # Simulate task processing
                await asyncio.sleep(0.1)
                
                self.queue.task_done()
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Worker {worker_id} error: {e}")
    
    async def start(self):
        """Start worker pool"""
        self.running = True
        self.workers = [
            asyncio.create_task(self.worker(i))
            for i in range(self.max_workers)
        ]
    
    async def add_task(self, task: Task):
        """Add task to queue"""
        await self.queue.put(task)
    
    async def shutdown(self):
        """Shutdown worker pool gracefully"""
        await self.queue.join()  # Wait for all tasks to complete
        self.running = False
        await asyncio.gather(*self.workers, return_exceptions=True)


# ============================================================================
# ASYNC BATCHING AND DEBOUNCING
# ============================================================================

class AsyncBatcher:
    """
    Batch async operations for efficiency
    
    Usage:
        batcher = AsyncBatcher(batch_size=10, flush_interval=1.0)
        await batcher.add(item)
        results = await batcher.flush()
    """
    
    def __init__(self, batch_size: int = 100, flush_interval: float = 1.0):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.batch = []
        self.last_flush = time.time()
    
    async def add(self, item: Any):
        """Add item to batch"""
        self.batch.append(item)
        
        # Auto-flush if batch is full or interval elapsed
        if len(self.batch) >= self.batch_size or \
           (time.time() - self.last_flush) >= self.flush_interval:
            return await self.flush()
        
        return None
    
    async def flush(self) -> List[Any]:
        """Flush batch and process"""
        if not self.batch:
            return []
        
        items = self.batch.copy()
        self.batch.clear()
        self.last_flush = time.time()
        
        # Simulate batch processing
        await asyncio.sleep(0.1)
        return items


class AsyncDebouncer:
    """
    Debounce async function calls
    
    Usage:
        debouncer = AsyncDebouncer(delay=0.5)
        await debouncer.call(expensive_function, arg1, arg2)
    """
    
    def __init__(self, delay: float = 0.5):
        self.delay = delay
        self.task = None
    
    async def call(self, func: Callable, *args, **kwargs):
        """Debounced function call"""
        # Cancel previous task if exists
        if self.task and not self.task.done():
            self.task.cancel()
        
        # Create new task with delay
        async def delayed_call():
            await asyncio.sleep(self.delay)
            return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) \
                   else func(*args, **kwargs)
        
        self.task = asyncio.create_task(delayed_call())
        return await self.task


# ============================================================================
# ASYNC RETRY AND CIRCUIT BREAKER
# ============================================================================

class AsyncRetry:
    """
    Async retry with exponential backoff
    
    Usage:
        retry = AsyncRetry(max_attempts=3, base_delay=1.0)
        result = await retry.execute(async_function, arg1, arg2)
    """
    
    def __init__(self, max_attempts: int = 3, base_delay: float = 1.0):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
    
    async def execute(self, func: Callable, *args, **kwargs):
        """Execute function with retry logic"""
        for attempt in range(1, self.max_attempts + 1):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_attempts:
                    raise
                
                delay = self.base_delay * (2 ** (attempt - 1))
                print(f"Attempt {attempt} failed: {e}. Retrying in {delay}s...")
                await asyncio.sleep(delay)


class CircuitBreaker:
    """
    Async circuit breaker pattern
    
    Usage:
        breaker = CircuitBreaker(failure_threshold=5, timeout=60)
        result = await breaker.call(unreliable_service)
    """
    
    def __init__(self, failure_threshold: int = 5, timeout: float = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half-open
    
    async def call(self, func: Callable, *args, **kwargs):
        """Call function through circuit breaker"""
        # Check if circuit should be half-open
        if self.state == 'open':
            if time.time() - self.last_failure_time >= self.timeout:
                self.state = 'half-open'
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Success - reset failures
            if self.state == 'half-open':
                self.state = 'closed'
            self.failures = 0
            return result
            
        except Exception:
            self.failures += 1
            self.last_failure_time = time.time()
            
            if self.failures >= self.failure_threshold:
                self.state = 'open'
                print(f"Circuit breaker opened after {self.failures} failures")
            
            raise


# ============================================================================
# DEMONSTRATION
# ============================================================================

async def main():
    """Demonstrate async patterns"""
    print("=" * 60)
    print("ASYNC/AWAIT DEMONSTRATIONS")
    print("=" * 60)
    
    # 1. Async iteration
    print("\n1. ASYNC ITERATION")
    print("-" * 60)
    print("Async range:")
    async for num in async_range(0, 5, delay=0.05):
        print(f"  {num}", end=" ")
    print()
    
    # 2. Async task queue
    print("\n2. ASYNC TASK QUEUE")
    print("-" * 60)
    queue = AsyncTaskQueue(max_workers=2)
    await queue.start()
    
    for i in range(5):
        await queue.add_task(Task(id=i, data=f"data_{i}"))
    
    await queue.shutdown()
    print("All tasks processed")
    
    # 3. Async batching
    print("\n3. ASYNC BATCHING")
    print("-" * 60)
    batcher = AsyncBatcher(batch_size=3, flush_interval=1.0)
    
    for i in range(5):
        result = await batcher.add(f"item_{i}")
        if result:
            print(f"Batch flushed: {result}")
    
    final = await batcher.flush()
    if final:
        print(f"Final batch: {final}")
    
    # 4. Circuit breaker
    print("\n4. CIRCUIT BREAKER")
    print("-" * 60)
    breaker = CircuitBreaker(failure_threshold=3, timeout=5)
    
    async def unreliable_service():
        import random
        if random.random() < 0.7:  # 70% failure rate
            raise Exception("Service failed")
        return "Success"
    
    for i in range(5):
        try:
            result = await breaker.call(unreliable_service)
            print(f"Call {i}: {result}")
        except Exception as e:
            print(f"Call {i}: {e}")
    
    print("\n" + "=" * 60)
    print("✓ All async demonstrations complete")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
