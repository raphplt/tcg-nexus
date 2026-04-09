"""
Client Redis partagé pour le stockage temporaire des images.
"""
from functools import lru_cache
import redis
from app.config import get_settings


@lru_cache(maxsize=1)
def get_redis_client() -> redis.Redis:
    settings = get_settings()
    return redis.Redis.from_url(settings.redis_url, decode_responses=False)
