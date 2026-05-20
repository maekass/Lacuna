"""
Advanced Python: Decorators, Context Managers, and Metaclasses
Demonstrates advanced Python patterns for production-grade code
"""

import functools
import time
import logging
from typing import Any, Callable, TypeVar, ParamSpec
from contextlib import contextmanager
from datetime import datetime
import json

# Type variables for generic decorators
P = ParamSpec('P')
R = TypeVar('R')

# ============================================================================
# ADVANCED DECORATORS
# ============================================================================

def timer(func: Callable[P, R]) -> Callable[P, R]:
    """
    Decorator to measure function execution time
    
    Usage:
        @timer
        def slow_function():
            time.sleep(1)
    """
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper


def retry(max_attempts: int = 3, delay: float = 1.0, 
          exceptions: tuple = (Exception,)):
    """
    Decorator to retry function on failure with exponential backoff
    
    Usage:
        @retry(max_attempts=5, delay=2.0, exceptions=(ConnectionError,))
        def fetch_api_data():
            ...
    """
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    wait_time = delay * (2 ** (attempt - 1))
                    print(f"Attempt {attempt} failed: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
            raise RuntimeError("Should not reach here")
        return wrapper
    return decorator


def memoize(func: Callable[P, R]) -> Callable[P, R]:
    """
    Decorator for caching function results (memoization)
    
    Usage:
        @memoize
        def fibonacci(n):
            if n < 2:
                return n
            return fibonacci(n-1) + fibonacci(n-2)
    """
    cache = {}
    
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        # Create hashable key from args and kwargs
        key = str(args) + str(sorted(kwargs.items()))
        
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]
    
    # Expose cache for inspection
    wrapper.cache = cache  # type: ignore
    return wrapper


def validate_types(**type_hints):
    """
    Decorator to validate function argument types at runtime
    
    Usage:
        @validate_types(x=int, y=int)
        def add(x, y):
            return x + y
    """
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            # Get function signature
            import inspect
            sig = inspect.signature(func)
            bound = sig.bind(*args, **kwargs)
            bound.apply_defaults()
            
            # Validate types
            for param_name, expected_type in type_hints.items():
                if param_name in bound.arguments:
                    value = bound.arguments[param_name]
                    if not isinstance(value, expected_type):
                        raise TypeError(
                            f"Argument '{param_name}' must be {expected_type.__name__}, "
                            f"got {type(value).__name__}"
                        )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def log_calls(logger: logging.Logger = None):
    """
    Decorator to log function calls with arguments and results
    
    Usage:
        @log_calls(logger=my_logger)
        def process_data(data):
            ...
    """
    if logger is None:
        logger = logging.getLogger(__name__)
    
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            args_repr = [repr(a) for a in args]
            kwargs_repr = [f"{k}={v!r}" for k, v in kwargs.items()]
            signature = ", ".join(args_repr + kwargs_repr)
            
            logger.info(f"Calling {func.__name__}({signature})")
            
            try:
                result = func(*args, **kwargs)
                logger.info(f"{func.__name__} returned {result!r}")
                return result
            except Exception as e:
                logger.exception(f"{func.__name__} raised {e.__class__.__name__}: {e}")
                raise
        
        return wrapper
    return decorator


# ============================================================================
# CONTEXT MANAGERS
# ============================================================================

@contextmanager
def timer_context(name: str = "Operation"):
    """
    Context manager to time code blocks
    
    Usage:
        with timer_context("Data processing"):
            process_large_dataset()
    """
    start = time.perf_counter()
    print(f"{name} started...")
    try:
        yield
    finally:
        end = time.perf_counter()
        print(f"{name} completed in {end - start:.4f} seconds")


@contextmanager
def suppress_stdout():
    """
    Context manager to suppress stdout temporarily
    
    Usage:
        with suppress_stdout():
            print("This won't be printed")
    """
    import sys
    import os
    
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        sys.stdout = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout


class DatabaseTransaction:
    """
    Context manager for database transactions with automatic rollback
    
    Usage:
        with DatabaseTransaction(connection) as txn:
            txn.execute("INSERT INTO ...")
            txn.execute("UPDATE ...")
            # Commits on success, rolls back on exception
    """
    
    def __init__(self, connection):
        self.connection = connection
        self.transaction = None
    
    def __enter__(self):
        self.transaction = self.connection.begin()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.transaction.commit()
        else:
            self.transaction.rollback()
        return False  # Don't suppress exceptions
    
    def execute(self, query: str, *args):
        """Execute query within transaction"""
        return self.connection.execute(query, *args)


class TemporaryAttribute:
    """
    Context manager to temporarily set object attribute
    
    Usage:
        obj = MyClass()
        with TemporaryAttribute(obj, 'debug', True):
            # obj.debug is True here
            obj.process()
        # obj.debug is back to original value
    """
    
    def __init__(self, obj: Any, attr: str, value: Any):
        self.obj = obj
        self.attr = attr
        self.value = value
        self.original = None
        self.had_attr = hasattr(obj, attr)
    
    def __enter__(self):
        if self.had_attr:
            self.original = getattr(self.obj, self.attr)
        setattr(self.obj, self.attr, self.value)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.had_attr:
            setattr(self.obj, self.attr, self.original)
        else:
            delattr(self.obj, self.attr)
        return False


# ============================================================================
# METACLASSES
# ============================================================================

class Singleton(type):
    """
    Metaclass to create singleton classes
    
    Usage:
        class DatabaseConnection(metaclass=Singleton):
            def __init__(self):
                self.connection = create_connection()
        
        # Both instances are the same object
        db1 = DatabaseConnection()
        db2 = DatabaseConnection()
        assert db1 is db2
    """
    _instances = {}
    
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class AutoRegister(type):
    """
    Metaclass to automatically register classes in a registry
    
    Usage:
        class Model(metaclass=AutoRegister):
            registry = {}
        
        class LinearRegression(Model):
            pass
        
        class RandomForest(Model):
            pass
        
        # All subclasses are automatically registered
        print(Model.registry)  # {'LinearRegression': <class>, 'RandomForest': <class>}
    """
    
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        
        # Don't register the base class
        if bases:
            # Find the registry in base classes
            for base in bases:
                if hasattr(base, 'registry'):
                    base.registry[name] = cls
                    break
        
        return cls


class ValidatedAttributes(type):
    """
    Metaclass to add attribute validation to classes
    
    Usage:
        class Person(metaclass=ValidatedAttributes):
            _validators = {
                'age': lambda x: isinstance(x, int) and x >= 0,
                'name': lambda x: isinstance(x, str) and len(x) > 0
            }
            
            def __init__(self, name, age):
                self.name = name
                self.age = age
    """
    
    def __new__(mcs, name, bases, namespace):
        # Create the class
        cls = super().__new__(mcs, name, bases, namespace)
        
        # If validators are defined, wrap __setattr__
        if '_validators' in namespace:
            original_setattr = cls.__setattr__
            
            def validated_setattr(self, key, value):
                if key in cls._validators:
                    validator = cls._validators[key]
                    if not validator(value):
                        raise ValueError(f"Invalid value for {key}: {value}")
                original_setattr(self, key, value)
            
            cls.__setattr__ = validated_setattr
        
        return cls


# ============================================================================
# ADVANCED PATTERNS: DESCRIPTORS
# ============================================================================

class TypedProperty:
    """
    Descriptor for type-checked properties
    
    Usage:
        class Person:
            age = TypedProperty(int)
            name = TypedProperty(str)
            
            def __init__(self, name, age):
                self.name = name
                self.age = age
    """
    
    def __init__(self, expected_type):
        self.expected_type = expected_type
        self.data = {}
    
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        return self.data.get(id(instance))
    
    def __set__(self, instance, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(
                f"{self.name} must be {self.expected_type.__name__}, "
                f"got {type(value).__name__}"
            )
        self.data[id(instance)] = value


class CachedProperty:
    """
    Descriptor for lazy-evaluated cached properties
    
    Usage:
        class DataLoader:
            @CachedProperty
            def expensive_data(self):
                # Only computed once
                return load_large_dataset()
    """
    
    def __init__(self, func):
        self.func = func
        self.name = func.__name__
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        
        # Check if value is cached
        cache_attr = f'_cached_{self.name}'
        if not hasattr(instance, cache_attr):
            # Compute and cache
            value = self.func(instance)
            setattr(instance, cache_attr, value)
        
        return getattr(instance, cache_attr)


# ============================================================================
# FUNCTIONAL PROGRAMMING PATTERNS
# ============================================================================

class Pipeline:
    """
    Functional pipeline for data transformations
    
    Usage:
        pipeline = (Pipeline()
            .map(lambda x: x * 2)
            .filter(lambda x: x > 10)
            .reduce(lambda acc, x: acc + x, 0))
        
        result = pipeline.execute([1, 2, 3, 4, 5, 6])
    """
    
    def __init__(self):
        self.operations = []
    
    def map(self, func: Callable):
        """Apply function to each element"""
        self.operations.append(('map', func))
        return self
    
    def filter(self, predicate: Callable):
        """Keep only elements matching predicate"""
        self.operations.append(('filter', predicate))
        return self
    
    def reduce(self, func: Callable, initial=None):
        """Reduce to single value"""
        self.operations.append(('reduce', func, initial))
        return self
    
    def execute(self, data):
        """Execute pipeline on data"""
        result = data
        
        for operation in self.operations:
            op_type = operation[0]
            
            if op_type == 'map':
                result = [operation[1](x) for x in result]
            elif op_type == 'filter':
                result = [x for x in result if operation[1](x)]
            elif op_type == 'reduce':
                func, initial = operation[1], operation[2]
                if initial is not None:
                    result = functools.reduce(func, result, initial)
                else:
                    result = functools.reduce(func, result)
        
        return result


# ============================================================================
# DEMONSTRATION EXAMPLES
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("ADVANCED PYTHON DEMONSTRATIONS")
    print("=" * 60)
    
    # 1. Decorators
    print("\n1. DECORATORS")
    print("-" * 60)
    
    @timer
    @memoize
    def fibonacci(n):
        if n < 2:
            return n
        return fibonacci(n - 1) + fibonacci(n - 2)
    
    print("Computing fibonacci(30)...")
    result = fibonacci(30)
    print(f"Result: {result}")
    print(f"Cache size: {len(fibonacci.cache)}")
    
    # 2. Context Managers
    print("\n2. CONTEXT MANAGERS")
    print("-" * 60)
    
    with timer_context("Data processing"):
        time.sleep(0.1)
        print("Processing data...")
    
    # 3. Metaclasses
    print("\n3. METACLASSES - SINGLETON")
    print("-" * 60)
    
    class Config(metaclass=Singleton):
        def __init__(self):
            self.settings = {"debug": True}
    
    config1 = Config()
    config2 = Config()
    print(f"config1 is config2: {config1 is config2}")
    
    # 4. Descriptors
    print("\n4. DESCRIPTORS")
    print("-" * 60)
    
    class Person:
        age = TypedProperty(int)
        name = TypedProperty(str)
        
        def __init__(self, name, age):
            self.name = name
            self.age = age
    
    person = Person("Alice", 30)
    print(f"Person: {person.name}, {person.age}")
    
    try:
        person.age = "thirty"  # Should raise TypeError
    except TypeError as e:
        print(f"Type validation works: {e}")
    
    # 5. Functional Pipeline
    print("\n5. FUNCTIONAL PIPELINE")
    print("-" * 60)
    
    pipeline = (Pipeline()
        .map(lambda x: x * 2)
        .filter(lambda x: x > 10)
        .reduce(lambda acc, x: acc + x, 0))
    
    data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    result = pipeline.execute(data)
    print(f"Pipeline result: {result}")
    
    print("\n" + "=" * 60)
    print("✓ All demonstrations complete")
    print("=" * 60)
