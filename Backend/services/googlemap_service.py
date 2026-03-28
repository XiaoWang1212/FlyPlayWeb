import requests
from typing import Optional, Dict, List
from config import Config
from models.cache_model import PlaceCache

class GoogleMapService:
    def __init__(self):
        self.api_key = Config.GOOGLE_MAPS_API_KEY
        self.base_url = "https://places.googleapis.com/v1"
        self.place_cache = PlaceCache()
    
    def search_places(self, text_query: str, language_code: str = "zh-TW", max_results: int = 5):
        cache_key = f"search_{text_query}_{language_code}_{max_results}"
        cached = self.place_cache.get(cache_key)
        if cached:
            return cached

        try:
            url = f"{self.base_url}/places:searchText"
            headers = {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': self.api_key,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.rating,places.types,places.photos,places.internationalPhoneNumber,places.websiteUri'
            }
            payload = {
                'textQuery': text_query,
                'languageCode': language_code,
                'maxResultCount': max_results
            }
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            places = data.get('places', [])
            formatted_places = []
            for place in places:
                photos = place.get('photos', [])
                simplified_photos = []
                for photo in photos[:3]:
                    photo_name = photo.get('name', '')
                    photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&key={self.api_key}" if photo_name else ""
                    simplified_photos.append({
                        'name': photo_name,
                        'photo_url': photo_url,
                        'widthPx': photo.get('widthPx', 0),
                        'heightPx': photo.get('heightPx', 0),
                    })
                formatted_place = {
                    'place_id': place.get('id', ''),
                    'name': place.get('displayName', {}).get('text', ''),
                    'address': place.get('formattedAddress', ''),
                    'location': place.get('location', {}),
                    'rating': place.get('rating', 0),
                    'types': place.get('types', [])[:3],
                    'phone': place.get('internationalPhoneNumber', ''),
                    'website': place.get('websiteUri', ''),
                    'photos': simplified_photos,
                    'photo_count': len(photos)
                }
                formatted_places.append(formatted_place)
            result = {
                'success': True,
                'places': formatted_places,
                'total_results': len(formatted_places),
                'query': text_query
            }
            # 寫入快取
            self.place_cache.set(cache_key, result)
            return result
        except requests.RequestException as e:
            return {
                'success': False,
                'error': f"網絡錯誤: {str(e)}",
                'error_type': 'NETWORK_ERROR'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"錯誤: {str(e)}",
                'error_type': 'UNKNOWN_ERROR'
            }
            
    def search_places_nearby(self, text_query: str, location: Dict, radius: int = 5000, language_code: str = "zh-TW", max_results: int = 10):
            cache_key = f"search_nearby_{text_query}_{location['latitude']}_{location['longitude']}_{max_results}"
            cached = self.place_cache.get(cache_key)
            if cached:
                return cached

            try:
                url = f"{self.base_url}/places:searchText"
                headers = {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': self.api_key,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.rating,places.userRatingCount,places.types,places.photos'
                }
                payload = {
                    'textQuery': text_query,
                    'languageCode': language_code,
                    'maxResultCount': max_results,
                    'locationBias': {
                        'circle': {
                            'center': {
                                'latitude': location.get('latitude'),
                                'longitude': location.get('longitude')
                            },
                            'radius': radius
                        }
                    }
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                response.raise_for_status()
                data = response.json()
                places = data.get('places', [])
                formatted_places = []
                for place in places:
                    photos = place.get('photos', [])
                    simplified_photos = []
                    for photo in photos[:3]:
                        photo_name = photo.get('name', '')
                        photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&key={self.api_key}" if photo_name else ""
                        simplified_photos.append({
                            'name': photo_name,
                            'photo_url': photo_url,
                            'widthPx': photo.get('widthPx', 0),
                            'heightPx': photo.get('heightPx', 0),
                        })
                    formatted_place = {
                        'place_id': place.get('id', ''),
                        'name': place.get('displayName', {}).get('text', ''),
                        'address': place.get('formattedAddress', ''),
                        'location': place.get('location', {}),
                        'rating': place.get('rating', 0),
                        'user_rating_count': place.get('userRatingCount', 0),
                        'types': place.get('types', [])[:3],
                        'photos': simplified_photos,
                        'photo_count': len(photos)
                    }
                    formatted_places.append(formatted_place)
                result = {
                    'success': True,
                    'places': formatted_places,
                    'total_results': len(formatted_places),
                    'query': text_query
                }
                self.place_cache.set(cache_key, result)
                return result
            except requests.RequestException as e:
                return {
                    'success': False,
                    'error': f"網絡錯誤: {str(e)}",
                    'error_type': 'NETWORK_ERROR'
                }
            except Exception as e:
                return {
                    'success': False,
                    'error': f"錯誤: {str(e)}",
                    'error_type': 'UNKNOWN_ERROR'
                }
    
    def get_place_details(self, place_id_or_name: str, is_name: bool = False):
        if is_name:
            search_result = self.search_places(place_id_or_name)
        if not search_result.get('success') or not search_result.get('places'):
            return {
                'success': False,
                'error': '查無此地點',
                'error_type': 'NOT_FOUND'
            }
            place_id = search_result['places'][0]['place_id']
        else:
            place_id = place_id_or_name

        cache_key = f"details_{place_id}"
        cached = self.place_cache.get(cache_key)
        if cached:
            return cached

        try:
            url = f"{self.base_url}/places/{place_id}"
            headers = {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': self.api_key,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,internationalPhoneNumber,websiteUri,regularOpeningHours,photos,reviews,types,priceLevel,priceRange'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            photos = data.get('photos', [])
            simplified_photos = [{'name': p.get('name', '')} for p in photos[:5]]
            reviews = data.get('reviews', [])
            simplified_reviews = [{
                'rating': r.get('rating', 0),
                'text': r.get('text', {}).get('text', '')[:200]
            } for r in reviews[:3]]

            price_level = data.get('priceLevel') or data.get('price_level')
            price_range = data.get('priceRange') or data.get('price_range')
            if not price_range and isinstance(price_level, int):
                price_range_map = {
                    0: '免費',
                    1: '$',
                    2: '$$',
                    3: '$$$',
                    4: '$$$$'
                }
                price_range = price_range_map.get(price_level, '未知')

            price_map = {
                0: '免費',
                1: '便宜',
                2: '中等',
                3: '昂貴',
                4: '高檔'
            }
            price_text = price_map.get(price_level, None) if isinstance(price_level, int) else None

            details = {
                'place_id': data.get('id', ''),
                'name': data.get('displayName', {}).get('text', ''),
                'address': data.get('formattedAddress', ''),
                'location': data.get('location', {}),
                'rating': data.get('rating', 0),
                'phone': data.get('internationalPhoneNumber', ''),
                'website': data.get('websiteUri', ''),
                'opening_hours': data.get('regularOpeningHours', {}),
                'price_level': price_level,
                'price_text': price_text,
                'price_range': price_range,
                'photos': simplified_photos,
                'photo_count': len(photos),
                'reviews': simplified_reviews,
                'review_count': len(reviews),
                'types': data.get('types', [])[:5]
            }
            result = {
                'success': True,
                'details': details
            }
            self.place_cache.set(cache_key, result)
            return result
        except requests.RequestException as e:
            return {
                'success': False,
                'error': f"網絡錯誤: {str(e)}",
                'error_type': 'NETWORK_ERROR'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"錯誤: {str(e)}",
                'error_type': 'UNKNOWN_ERROR'
            }
    
    def nearby_search(self, location: Dict, radius: int = 1500, 
                     included_types: Optional[List[str]] = None,
                     language_code: str = "zh-TW",
                     max_results: int = 10):
        try:
            url = f"{self.base_url}/places:searchNearby"
            
            headers = {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': self.api_key,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.rating,places.types'
            }
            
            payload = {
                'locationRestriction': {
                    'circle': {
                        'center': {
                            'latitude': location.get('latitude'),
                            'longitude': location.get('longitude')
                        },
                        'radius': radius
                    }
                },
                'languageCode': language_code,
                'maxResultCount': max_results
            }
            
            if included_types:
                payload['includedTypes'] = included_types
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # 解析結果
            places = data.get('places', [])
            formatted_places = []
            
            for place in places:
                formatted_place = {
                    'place_id': place.get('id', ''),
                    'name': place.get('displayName', {}).get('text', ''),
                    'address': place.get('formattedAddress', ''),
                    'location': place.get('location', {}),
                    'rating': place.get('rating', 0),
                    'types': place.get('types', [])
                }
                formatted_places.append(formatted_place)
            
            return {
                'success': True,
                'places': formatted_places,
                'total_results': len(formatted_places)
            }
            
        except requests.RequestException as e:
            return {
                'success': False,
                'error': f"網絡錯誤: {str(e)}",
                'error_type': 'NETWORK_ERROR'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"錯誤: {str(e)}",
                'error_type': 'UNKNOWN_ERROR'
            }
    
    def get_distance_and_duration(self, origin: str, destination: str, mode: str = 'driving'):
        cache_key = f"distance_{origin}_{destination}_{mode}"
        cached = self.place_cache.get(cache_key)
        if cached:
            return cached
        try:
            url = f"https://maps.googleapis.com/maps/api/directions/json"
            params = {
                'origin': origin,
                'destination': destination,
                'mode': mode,
                'key': self.api_key,
                'language': 'zh-TW'
            }
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            if data.get('status') != 'OK':
                return {'success': False, 'error': data.get('error_message', '查詢失敗')}
            leg = data['routes'][0]['legs'][0]
            result = {
                'success': True,
                'distance': leg['distance']['text'],
                'duration': leg['duration']['text'],
                'mode': mode
            }
            self.place_cache.set(cache_key, result)
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}
        
    def get_place_business_info(self, place_id_or_name: str, is_name: bool = False):
        if is_name:
            search_result = self.search_places(place_id_or_name)
            if not search_result.get('success') or not search_result.get('places'):
                return {'success': False, 'error': '查無此地點', 'error_type': 'NOT_FOUND'}
            
            matched = next((p for p in search_result['places'] 
                        if p.get('name', '').strip() == place_id_or_name.strip()), None)
        
            place_id = matched['place_id'] if matched else search_result['places'][0]['place_id']
        else:
            place_id = place_id_or_name

        cache_key = f"business_{place_id}"
        cached = self.place_cache.get(cache_key)
        if cached:
            return cached
        try:
            url = f"https://places.googleapis.com/v1/places/{place_id}"
            headers = {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': self.api_key,
                'X-Goog-FieldMask': 'id,displayName,regularOpeningHours,priceRange' 
            }
            params = {
                'languageCode': 'zh-TW'
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code != 200:
                return {
                    'success': False, 
                    'error': f"API 請求失敗: {response.status_code}",
                    'error_type': 'API_ERROR'
                }
            
            data = response.json()
            result = {
                'success': True,
                'place_id': data.get('id'),
                'name': data.get('displayName', {}).get('text'),
                'opening_hours': data.get('regularOpeningHours', {}).get('weekdayDescriptions', []),
                'price_range': data.get('priceRange', '未知')
            }
            
            self.place_cache.set(cache_key, result)
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}
        
    def get_route_details(self, origin: str, destination: str, mode: str = 'driving'):
        cache_key = f"route_{origin}_{destination}_{mode}"
        cached = self.place_cache.get(cache_key)
        if cached:
            return cached
        try:
            url = f"https://maps.googleapis.com/maps/api/directions/json"
            params = {
                'origin': origin,
                'destination': destination,
                'mode': mode,
                'key': self.api_key,
                'language': 'zh-TW'
            }
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            if data.get('status') != 'OK':
                return {'success': False, 'error': data.get('error_message', '查詢失敗')}
            steps = []
            for step in data['routes'][0]['legs'][0]['steps']:
                if mode == 'transit' and 'transit_details' in step:
                    transit = step['transit_details']
                    steps.append({
                        'instruction': step['html_instructions'],
                        'vehicle': transit['line']['vehicle']['type'],
                        'line_name': transit['line']['name'],
                        'departure_stop': transit['departure_stop']['name'],
                        'arrival_stop': transit['arrival_stop']['name'],
                        'num_stops': transit['num_stops']
                    })
                else:
                    steps.append({
                        'instruction': step['html_instructions'],
                        'distance': step['distance']['text'],
                        'duration': step['duration']['text']
                    })
            result = {
                'success': True,
                'steps': steps
            }
            self.place_cache.set(cache_key, result)
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}