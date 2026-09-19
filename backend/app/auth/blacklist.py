import redis

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


def revoke_token(token: str, expires_in_seconds: int):
    redis_client.setex(f"revoked:{token}", expires_in_seconds, "true")


def is_token_revoked(token: str) -> bool:
    return redis_client.exists(f"revoked:{token}") == 1
