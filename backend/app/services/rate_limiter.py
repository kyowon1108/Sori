import redis
from app.core.config import settings


class RateLimiter:
    """Redis-based rate limiter for pairing code attempts."""

    def __init__(self):
        self._redis = None

    @property
    def redis(self):
        """Lazy initialization of Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(settings.REDIS_URL)
        return self._redis

    def check_ip_rate_limit(
        self,
        ip: str,
        limit: int = 10,
        window: int = 300
    ) -> bool:
        """
        Check if IP has exceeded pairing attempt limit.

        Args:
            ip: Client IP address
            limit: Maximum attempts allowed (default: 10)
            window: Time window in seconds (default: 300 = 5 minutes)

        Returns:
            True if within limit, False if exceeded
        """
        key = f"pairing:ip:{ip}"
        current = self.redis.incr(key)
        if current == 1:
            self.redis.expire(key, window)
        return current <= limit

    def check_code_rate_limit(
        self,
        code_hash: str,
        limit: int = 5
    ) -> bool:
        """
        Check if code has exceeded attempt limit.

        Args:
            code_hash: SHA256 hash of the pairing code
            limit: Maximum attempts allowed (default: 5)

        Returns:
            True if within limit, False if exceeded
        """
        key = f"pairing:code:{code_hash}"
        current = self.redis.incr(key)
        if current == 1:
            self.redis.expire(key, 600)  # 10 min TTL (match code expiration)
        return current <= limit

    def get_remaining_attempts(
        self,
        code_hash: str,
        limit: int = 5
    ) -> int:
        """
        Get remaining attempts for a code.

        Args:
            code_hash: SHA256 hash of the pairing code
            limit: Maximum attempts allowed (default: 5)

        Returns:
            Number of remaining attempts
        """
        key = f"pairing:code:{code_hash}"
        current = int(self.redis.get(key) or 0)
        return max(0, limit - current)

    def reset_ip_limit(self, ip: str) -> None:
        """Reset rate limit for an IP address."""
        key = f"pairing:ip:{ip}"
        self.redis.delete(key)

    def reset_code_limit(self, code_hash: str) -> None:
        """Reset rate limit for a code hash."""
        key = f"pairing:code:{code_hash}"
        self.redis.delete(key)


# Global rate limiter instance
rate_limiter = RateLimiter()
