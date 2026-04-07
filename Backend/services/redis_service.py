import redis
import json

# 連接 Redis (假設你後端裝好了 Redis)
r = redis.Redis(host='localhost', port=6379, db=0)

def get_distance_with_cache(origin, destination, gmaps_service):
    cache_key = f"dist:{origin}:{destination}"
    
    # 1. 先看 Redis 有沒有
    cached_data = r.get(cache_key)
    if cached_data:
        return json.loads(cached_data)
    
    # 2. 沒有的話才問 Google
    print("Caching miss! Calling Google Maps API...")
    result = gmaps_service.get_distance_and_duration([origin], [destination])
    
    # 3. 存入 Redis (設定過期時間例如 30 天，因為路徑不太會變)
    r.setex(cache_key, 3600*24*30, json.dumps(result))
    
    return result