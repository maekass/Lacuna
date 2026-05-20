"""
Advanced Python: Custom Data Structures and Algorithms
Demonstrates implementation of advanced data structures from scratch
"""

from typing import Any, Optional, List, Tuple, Generic, TypeVar
from collections import deque
import heapq
from dataclasses import dataclass

T = TypeVar('T')

# ============================================================================
# LINKED LIST IMPLEMENTATION
# ============================================================================

@dataclass
class Node(Generic[T]):
    """Node for linked list"""
    data: T
    next: Optional['Node[T]'] = None


class LinkedList(Generic[T]):
    """
    Singly linked list with common operations
    
    Demonstrates: Custom data structure implementation
    """
    
    def __init__(self):
        self.head: Optional[Node[T]] = None
        self.size = 0
    
    def append(self, data: T) -> None:
        """Add element to end - O(n)"""
        new_node = Node(data)
        
        if not self.head:
            self.head = new_node
        else:
            current = self.head
            while current.next:
                current = current.next
            current.next = new_node
        
        self.size += 1
    
    def prepend(self, data: T) -> None:
        """Add element to beginning - O(1)"""
        new_node = Node(data, self.head)
        self.head = new_node
        self.size += 1
    
    def delete(self, data: T) -> bool:
        """Delete first occurrence - O(n)"""
        if not self.head:
            return False
        
        if self.head.data == data:
            self.head = self.head.next
            self.size -= 1
            return True
        
        current = self.head
        while current.next:
            if current.next.data == data:
                current.next = current.next.next
                self.size -= 1
                return True
            current = current.next
        
        return False
    
    def reverse(self) -> None:
        """Reverse list in-place - O(n)"""
        prev = None
        current = self.head
        
        while current:
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node
        
        self.head = prev
    
    def __iter__(self):
        """Make iterable"""
        current = self.head
        while current:
            yield current.data
            current = current.next
    
    def __len__(self):
        return self.size


# ============================================================================
# BINARY SEARCH TREE
# ============================================================================

@dataclass
class TreeNode(Generic[T]):
    """Node for binary search tree"""
    value: T
    left: Optional['TreeNode[T]'] = None
    right: Optional['TreeNode[T]'] = None


class BinarySearchTree(Generic[T]):
    """
    Binary Search Tree with common operations
    
    Demonstrates: Recursive algorithms, tree traversals
    """
    
    def __init__(self):
        self.root: Optional[TreeNode[T]] = None
    
    def insert(self, value: T) -> None:
        """Insert value - O(log n) average, O(n) worst"""
        if not self.root:
            self.root = TreeNode(value)
        else:
            self._insert_recursive(self.root, value)
    
    def _insert_recursive(self, node: TreeNode[T], value: T) -> None:
        """Helper for recursive insert"""
        if value < node.value:
            if node.left is None:
                node.left = TreeNode(value)
            else:
                self._insert_recursive(node.left, value)
        else:
            if node.right is None:
                node.right = TreeNode(value)
            else:
                self._insert_recursive(node.right, value)
    
    def search(self, value: T) -> bool:
        """Search for value - O(log n) average"""
        return self._search_recursive(self.root, value)
    
    def _search_recursive(self, node: Optional[TreeNode[T]], value: T) -> bool:
        """Helper for recursive search"""
        if node is None:
            return False
        if value == node.value:
            return True
        elif value < node.value:
            return self._search_recursive(node.left, value)
        else:
            return self._search_recursive(node.right, value)
    
    def inorder_traversal(self) -> List[T]:
        """In-order traversal (sorted order) - O(n)"""
        result = []
        self._inorder_recursive(self.root, result)
        return result
    
    def _inorder_recursive(self, node: Optional[TreeNode[T]], result: List[T]) -> None:
        """Helper for in-order traversal"""
        if node:
            self._inorder_recursive(node.left, result)
            result.append(node.value)
            self._inorder_recursive(node.right, result)
    
    def height(self) -> int:
        """Calculate tree height - O(n)"""
        return self._height_recursive(self.root)
    
    def _height_recursive(self, node: Optional[TreeNode[T]]) -> int:
        """Helper for height calculation"""
        if node is None:
            return 0
        return 1 + max(
            self._height_recursive(node.left),
            self._height_recursive(node.right)
        )


# ============================================================================
# GRAPH IMPLEMENTATION
# ============================================================================

class Graph:
    """
    Graph with adjacency list representation
    
    Demonstrates: Graph algorithms (BFS, DFS, shortest path)
    """
    
    def __init__(self, directed: bool = False):
        self.graph: dict[Any, List[Tuple[Any, float]]] = {}
        self.directed = directed
    
    def add_vertex(self, vertex: Any) -> None:
        """Add vertex to graph"""
        if vertex not in self.graph:
            self.graph[vertex] = []
    
    def add_edge(self, from_vertex: Any, to_vertex: Any, weight: float = 1.0) -> None:
        """Add edge to graph"""
        self.add_vertex(from_vertex)
        self.add_vertex(to_vertex)
        
        self.graph[from_vertex].append((to_vertex, weight))
        if not self.directed:
            self.graph[to_vertex].append((from_vertex, weight))
    
    def bfs(self, start: Any) -> List[Any]:
        """Breadth-first search - O(V + E)"""
        visited = set()
        queue = deque([start])
        result = []
        
        while queue:
            vertex = queue.popleft()
            if vertex not in visited:
                visited.add(vertex)
                result.append(vertex)
                
                for neighbor, _ in self.graph.get(vertex, []):
                    if neighbor not in visited:
                        queue.append(neighbor)
        
        return result
    
    def dfs(self, start: Any) -> List[Any]:
        """Depth-first search - O(V + E)"""
        visited = set()
        result = []
        
        def dfs_recursive(vertex):
            visited.add(vertex)
            result.append(vertex)
            
            for neighbor, _ in self.graph.get(vertex, []):
                if neighbor not in visited:
                    dfs_recursive(neighbor)
        
        dfs_recursive(start)
        return result
    
    def dijkstra(self, start: Any) -> dict[Any, float]:
        """
        Dijkstra's shortest path algorithm - O((V + E) log V)
        
        Returns: Dictionary of shortest distances from start
        """
        distances = {vertex: float('inf') for vertex in self.graph}
        distances[start] = 0
        
        # Priority queue: (distance, vertex)
        pq = [(0, start)]
        visited = set()
        
        while pq:
            current_dist, current_vertex = heapq.heappop(pq)
            
            if current_vertex in visited:
                continue
            
            visited.add(current_vertex)
            
            for neighbor, weight in self.graph.get(current_vertex, []):
                distance = current_dist + weight
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    heapq.heappush(pq, (distance, neighbor))
        
        return distances


# ============================================================================
# TRIE (PREFIX TREE)
# ============================================================================

class TrieNode:
    """Node for Trie data structure"""
    
    def __init__(self):
        self.children: dict[str, 'TrieNode'] = {}
        self.is_end_of_word = False


class Trie:
    """
    Trie (Prefix Tree) for efficient string operations
    
    Demonstrates: String algorithms, autocomplete
    """
    
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, word: str) -> None:
        """Insert word - O(m) where m is word length"""
        node = self.root
        
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        
        node.is_end_of_word = True
    
    def search(self, word: str) -> bool:
        """Search for exact word - O(m)"""
        node = self._find_node(word)
        return node is not None and node.is_end_of_word
    
    def starts_with(self, prefix: str) -> bool:
        """Check if any word starts with prefix - O(m)"""
        return self._find_node(prefix) is not None
    
    def _find_node(self, prefix: str) -> Optional[TrieNode]:
        """Helper to find node for prefix"""
        node = self.root
        
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        
        return node
    
    def autocomplete(self, prefix: str, max_results: int = 10) -> List[str]:
        """Get autocomplete suggestions - O(p + n) where p is prefix length"""
        node = self._find_node(prefix)
        if not node:
            return []
        
        results = []
        self._collect_words(node, prefix, results, max_results)
        return results
    
    def _collect_words(self, node: TrieNode, prefix: str, 
                      results: List[str], max_results: int) -> None:
        """Helper to collect all words from node"""
        if len(results) >= max_results:
            return
        
        if node.is_end_of_word:
            results.append(prefix)
        
        for char, child_node in node.children.items():
            self._collect_words(child_node, prefix + char, results, max_results)


# ============================================================================
# LRU CACHE
# ============================================================================

class LRUCache(Generic[T]):
    """
    Least Recently Used Cache with O(1) operations
    
    Demonstrates: Hash map + doubly linked list combination
    """
    
    @dataclass
    class CacheNode:
        key: Any
        value: Any
        prev: Optional['LRUCache.CacheNode'] = None
        next: Optional['LRUCache.CacheNode'] = None
    
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: dict[Any, LRUCache.CacheNode] = {}
        
        # Dummy head and tail for easier manipulation
        self.head = self.CacheNode(None, None)
        self.tail = self.CacheNode(None, None)
        self.head.next = self.tail
        self.tail.prev = self.head
    
    def get(self, key: Any) -> Optional[T]:
        """Get value - O(1)"""
        if key not in self.cache:
            return None
        
        node = self.cache[key]
        self._move_to_front(node)
        return node.value
    
    def put(self, key: Any, value: T) -> None:
        """Put value - O(1)"""
        if key in self.cache:
            node = self.cache[key]
            node.value = value
            self._move_to_front(node)
        else:
            if len(self.cache) >= self.capacity:
                # Remove least recently used (tail.prev)
                lru = self.tail.prev
                self._remove_node(lru)
                del self.cache[lru.key]
            
            # Add new node
            new_node = self.CacheNode(key, value)
            self.cache[key] = new_node
            self._add_to_front(new_node)
    
    def _remove_node(self, node: CacheNode) -> None:
        """Remove node from list"""
        node.prev.next = node.next
        node.next.prev = node.prev
    
    def _add_to_front(self, node: CacheNode) -> None:
        """Add node to front (most recently used)"""
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node
    
    def _move_to_front(self, node: CacheNode) -> None:
        """Move existing node to front"""
        self._remove_node(node)
        self._add_to_front(node)


# ============================================================================
# SORTING ALGORITHMS
# ============================================================================

def quick_sort(arr: List[T]) -> List[T]:
    """
    Quick sort - O(n log n) average, O(n²) worst
    
    Demonstrates: Divide and conquer, in-place sorting
    """
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)


def merge_sort(arr: List[T]) -> List[T]:
    """
    Merge sort - O(n log n) guaranteed
    
    Demonstrates: Divide and conquer, stable sorting
    """
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)


def merge(left: List[T], right: List[T]) -> List[T]:
    """Helper for merge sort"""
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    result.extend(left[i:])
    result.extend(right[j:])
    return result


# ============================================================================
# DYNAMIC PROGRAMMING EXAMPLES
# ============================================================================

def longest_common_subsequence(s1: str, s2: str) -> int:
    """
    Find length of longest common subsequence - O(mn)
    
    Demonstrates: Dynamic programming, 2D DP table
    """
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]


def knapsack(weights: List[int], values: List[int], capacity: int) -> int:
    """
    0/1 Knapsack problem - O(nW)
    
    Demonstrates: Dynamic programming, optimization
    """
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(
                    values[i-1] + dp[i-1][w - weights[i-1]],
                    dp[i-1][w]
                )
            else:
                dp[i][w] = dp[i-1][w]
    
    return dp[n][capacity]


# ============================================================================
# DEMONSTRATION
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("DATA STRUCTURES & ALGORITHMS DEMONSTRATIONS")
    print("=" * 60)
    
    # 1. Linked List
    print("\n1. LINKED LIST")
    print("-" * 60)
    ll = LinkedList[int]()
    for i in [1, 2, 3, 4, 5]:
        ll.append(i)
    print(f"List: {list(ll)}")
    ll.reverse()
    print(f"Reversed: {list(ll)}")
    
    # 2. Binary Search Tree
    print("\n2. BINARY SEARCH TREE")
    print("-" * 60)
    bst = BinarySearchTree[int]()
    for val in [5, 3, 7, 1, 4, 6, 9]:
        bst.insert(val)
    print(f"In-order traversal: {bst.inorder_traversal()}")
    print(f"Height: {bst.height()}")
    print(f"Search 4: {bst.search(4)}")
    print(f"Search 8: {bst.search(8)}")
    
    # 3. Graph - Dijkstra's Algorithm
    print("\n3. GRAPH - DIJKSTRA'S SHORTEST PATH")
    print("-" * 60)
    g = Graph(directed=True)
    g.add_edge('A', 'B', 4)
    g.add_edge('A', 'C', 2)
    g.add_edge('B', 'C', 1)
    g.add_edge('B', 'D', 5)
    g.add_edge('C', 'D', 8)
    g.add_edge('C', 'E', 10)
    g.add_edge('D', 'E', 2)
    
    distances = g.dijkstra('A')
    print("Shortest distances from A:")
    for vertex, dist in sorted(distances.items()):
        print(f"  {vertex}: {dist}")
    
    # 4. Trie - Autocomplete
    print("\n4. TRIE - AUTOCOMPLETE")
    print("-" * 60)
    trie = Trie()
    words = ["apple", "application", "apply", "app", "banana", "band"]
    for word in words:
        trie.insert(word)
    
    prefix = "app"
    suggestions = trie.autocomplete(prefix)
    print(f"Autocomplete for '{prefix}': {suggestions}")
    
    # 5. LRU Cache
    print("\n5. LRU CACHE")
    print("-" * 60)
    cache = LRUCache[str](capacity=3)
    cache.put(1, "one")
    cache.put(2, "two")
    cache.put(3, "three")
    print(f"Get 1: {cache.get(1)}")
    cache.put(4, "four")  # Evicts key 2
    print(f"Get 2: {cache.get(2)}")  # Returns None
    print(f"Get 3: {cache.get(3)}")
    
    # 6. Sorting
    print("\n6. SORTING ALGORITHMS")
    print("-" * 60)
    arr = [64, 34, 25, 12, 22, 11, 90]
    print(f"Original: {arr}")
    print(f"Quick sort: {quick_sort(arr.copy())}")
    print(f"Merge sort: {merge_sort(arr.copy())}")
    
    # 7. Dynamic Programming
    print("\n7. DYNAMIC PROGRAMMING")
    print("-" * 60)
    s1, s2 = "ABCDGH", "AEDFHR"
    print(f"LCS of '{s1}' and '{s2}': {longest_common_subsequence(s1, s2)}")
    
    weights = [10, 20, 30]
    values = [60, 100, 120]
    capacity = 50
    print(f"Knapsack (capacity={capacity}): {knapsack(weights, values, capacity)}")
    
    print("\n" + "=" * 60)
    print("✓ All demonstrations complete")
    print("=" * 60)
