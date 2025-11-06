"""Ring buffer implementation for efficient data storage."""

from typing import List, Optional, TypeVar, Generic
import threading

T = TypeVar('T')


class RingBuffer(Generic[T]):
    """Thread-safe ring buffer with fixed capacity."""
    
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.buffer: List[Optional[T]] = [None] * capacity
        self.head = 0
        self.size = 0
        self.lock = threading.RLock()
    
    def append(self, item: T) -> None:
        """Add item to buffer, overwriting oldest if full."""
        with self.lock:
            self.buffer[self.head] = item
            self.head = (self.head + 1) % self.capacity
            
            if self.size < self.capacity:
                self.size += 1
    
    def get(self, index: int) -> Optional[T]:
        """Get item at index (0 = oldest, -1 = newest)."""
        with self.lock:
            if index >= self.size or index < -self.size:
                return None
            
            if index < 0:
                index = self.size + index
            
            actual_index = (self.head - self.size + index) % self.capacity
            return self.buffer[actual_index]
    
    def get_all(self) -> List[T]:
        """Get all items in chronological order."""
        with self.lock:
            if self.size == 0:
                return []
            
            items = []
            start_index = (self.head - self.size) % self.capacity
            
            for i in range(self.size):
                index = (start_index + i) % self.capacity
                if self.buffer[index] is not None:
                    items.append(self.buffer[index])
            
            return items
    
    def get_latest(self, count: int) -> List[T]:
        """Get latest N items."""
        with self.lock:
            if count <= 0 or self.size == 0:
                return []
            
            count = min(count, self.size)
            items = []
            
            for i in range(count):
                index = (self.head - count + i) % self.capacity
                if self.buffer[index] is not None:
                    items.append(self.buffer[index])
            
            return items
    
    def clear(self) -> None:
        """Clear all items from buffer."""
        with self.lock:
            self.buffer = [None] * self.capacity
            self.head = 0
            self.size = 0
    
    def __len__(self) -> int:
        """Get current size of buffer."""
        with self.lock:
            return self.size
    
    def __bool__(self) -> bool:
        """Check if buffer has items."""
        return len(self) > 0
    
    def is_full(self) -> bool:
        """Check if buffer is full."""
        with self.lock:
            return self.size == self.capacity
    
    def get_capacity(self) -> int:
        """Get buffer capacity."""
        return self.capacity