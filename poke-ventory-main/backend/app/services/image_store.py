"""
Service d'accès au cache pour stocker les images d'import.
"""
from __future__ import annotations

import uuid
from typing import Optional

from app.config import get_settings
from app.services.redis_client import get_redis_client


class ImageStorageService:
    def __init__(self, ttl_override: Optional[int] = None) -> None:
        settings = get_settings()
        self._client = get_redis_client()
        self._ttl = ttl_override or settings.image_ttl_seconds
        self._prefix = "analysis:image"

    def _key(self, image_id: str) -> str:
        return f"{self._prefix}:{image_id}"

    def save_image(self, content: bytes) -> tuple[str, str]:
        """
        Stocke l'image en Redis et retourne (image_id, redis_key).
        """
        image_id = str(uuid.uuid4())
        key = self._key(image_id)
        self._client.setex(key, self._ttl, content)
        return image_id, key

    def fetch_image(self, redis_key: str) -> Optional[bytes]:
        return self._client.get(redis_key)

    def touch(self, redis_key: str) -> None:
        self._client.expire(redis_key, self._ttl)

    def delete(self, redis_key: str) -> None:
        self._client.delete(redis_key)
