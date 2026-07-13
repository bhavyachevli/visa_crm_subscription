"""
Pure-Python sliding-window rate limiter.
No external dependencies — uses only collections.defaultdict + time.
"""
from collections import defaultdict
import time
from fastapi import Request, HTTPException


class RateLimiter:
    """
    Simple sliding-window rate limiter stored in process memory.
    Each unique (path + client IP) pair has its own call window.
    """
    def __init__(self):
        # {key: [timestamp, ...]}
        self._windows: dict = defaultdict(list)

    def is_allowed(self, key: str, max_calls: int, period_seconds: int) -> bool:
        now = time.time()
        # Drop timestamps outside the current window
        self._windows[key] = [t for t in self._windows[key] if now - t < period_seconds]
        if len(self._windows[key]) >= max_calls:
            return False
        self._windows[key].append(now)
        return True

    def limit(self, max_calls: int, period_seconds: int = 60):
        """
        Returns a FastAPI dependency that rate-limits by client IP + path.

        Usage:
            @router.post("/login")
            def login(..., _rl=Depends(limiter.limit(5, 60))):
                ...
        """
        def dependency(request: Request):
            ip = request.client.host if request.client else "unknown"
            key = f"{request.url.path}:{ip}"
            if not self.is_allowed(key, max_calls, period_seconds):
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please wait before trying again."
                )
        return dependency


# Singleton — imported by app.py and auth.py
limiter = RateLimiter()
