import requests
from typing import Optional, Dict, List
from config import Config

class GoogleMapService:
    def __init__(self):
        self.api_key = Config.GOOGLE_MAPS_API_KEY
        self.base_url = "https://places.googleapis.com/v1"
    
    def search_places(self, text_query: str, language_code: str = "zh-TW", max_results: int = 5):
        """
        Args:
            text_query: 搜索文字（例如："台北 101 附近的咖啡廳"）
            language_code: 語言代碼，預設為繁體中文
            max_results: 最大返回結果數量
        Returns:
            包含搜索結果的字典
        """
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
            
            # 解析結果
            places = data.get('places', [])
            formatted_places = []
            
            for place in places:
                # 精簡照片資訊，只保留前3張的基本資訊
                photos = place.get('photos', [])
                simplified_photos = []
                for photo in photos[:3]:  # 只取前3張
                    simplified_photos.append({
                        'name': photo.get('name', ''),
                        'widthPx': photo.get('widthPx', 0),
                        'heightPx': photo.get('heightPx', 0)
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
            
            return {
                'success': True,
                'places': formatted_places,
                'total_results': len(formatted_places),
                'query': text_query
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
    
    def get_place_details(self, place_id: str):
        """
        獲取地點詳細信息（使用新版API）
        
        Args:
            place_id: Place ID
            
        Returns:
            包含地點詳情的字典
        """
        try:
            url = f"{self.base_url}/places/{place_id}"
            
            headers = {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': self.api_key,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,internationalPhoneNumber,websiteUri,regularOpeningHours,photos,reviews,types'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # 格式化詳情（精簡版）
            photos = data.get('photos', [])
            simplified_photos = [{'name': p.get('name', '')} for p in photos[:5]]  # 只保留前5張的name
            
            reviews = data.get('reviews', [])
            simplified_reviews = [{
                'rating': r.get('rating', 0),
                'text': r.get('text', {}).get('text', '')[:200]  # 評論只取前200字
            } for r in reviews[:3]]  # 只取前3則評論
            
            details = {
                'place_id': data.get('id', ''),
                'name': data.get('displayName', {}).get('text', ''),
                'address': data.get('formattedAddress', ''),
                'location': data.get('location', {}),
                'rating': data.get('rating', 0),
                'phone': data.get('internationalPhoneNumber', ''),
                'website': data.get('websiteUri', ''),
                'opening_hours': data.get('regularOpeningHours', {}),
                'photos': simplified_photos,
                'photo_count': len(photos),
                'reviews': simplified_reviews,
                'review_count': len(reviews),
                'types': data.get('types', [])[:5]
            }
            
            return {
                'success': True,
                'details': details
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
    
    def nearby_search(self, location: Dict, radius: int = 1500, 
                     included_types: Optional[List[str]] = None,
                     language_code: str = "zh-TW",
                     max_results: int = 10):
        """
        附近搜索（使用新版Nearby Search API）
        
        Args:
            location: 中心位置 {'latitude': xx, 'longitude': xx}
            radius: 搜索半徑（米）
            included_types: 地點類型列表（如：['restaurant', 'cafe']）
            language_code: 語言代碼
            max_results: 最大結果數
            
        Returns:
            包含附近地點的字典
        """
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
