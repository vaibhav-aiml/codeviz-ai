import json
from typing import Any, Dict, Optional

import redis

from .config import settings
from .logger import logger


class RedisStateStore:
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._redis_client = None
        self._fallback_store: Dict[str, Dict[str, Any]] = {}
        self._use_fallback = False

    @property
    def client(self) -> Optional[redis.Redis]:
        if self._use_fallback:
            return None
        if self._redis_client is None:
            try:
                self._redis_client = redis.Redis.from_url(self.redis_url, decode_responses=True)
                self._redis_client.ping()
            except Exception as e:
                logger.error(f"CRITICAL: Redis connection failed ({e}). Falling back to process-local in-memory store.")
                if settings.SENTRY_DSN:
                    try:
                        import sentry_sdk
                        sentry_sdk.capture_exception(e)
                    except Exception:
                        pass
                self._use_fallback = True
                self._redis_client = None
        return self._redis_client

    def save_analysis(self, analysis_id: str, data: Dict[str, Any], ttl: int = 86400) -> bool:
        key = f"analysis:{analysis_id}"
        serialized = json.dumps(data)
        client = self.client
        if client:
            try:
                client.set(key, serialized, ex=ttl)
                return True
            except Exception as e:
                logger.error(f"Error saving analysis to Redis: {e}")
        self._fallback_store[analysis_id] = data
        return True

    def get_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        key = f"analysis:{analysis_id}"
        client = self.client
        if client:
            try:
                data = client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.error(f"Error retrieving analysis from Redis: {e}")
        return self._fallback_store.get(analysis_id)

    def update_analysis_status(self, analysis_id: str, status: str, result: Optional[Dict[str, Any]] = None) -> bool:
        current = self.get_analysis(analysis_id) or {"analysis_id": analysis_id}
        current["status"] = status
        if result is not None:
            current["result"] = result
        return self.save_analysis(analysis_id, current)

    def set_cache(self, key: str, value: Any, ttl: Optional[int] = 86400) -> bool:
        serialized = json.dumps(value)
        client = self.client
        if client:
            try:
                if ttl:
                    client.set(key, serialized, ex=ttl)
                else:
                    client.set(key, serialized)
                return True
            except Exception as e:
                logger.error(f"Error setting cache key {key} in Redis: {e}")
        self._fallback_store[key] = value
        return True

    def get_cache(self, key: str) -> Optional[Any]:
        client = self.client
        if client:
            try:
                val = client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.error(f"Error getting cache key {key} from Redis: {e}")
        return self._fallback_store.get(key)

store = RedisStateStore()
