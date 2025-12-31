from services.googlemap_service import GoogleMapService
from typing import Dict, Optional, List

class MapController:
    
    def __init__(self):
        self.map_service = GoogleMapService()
    
    def handle_text_search(self, text_query: str, language_code: str = "zh-TW", 
                          max_results: int = 5):
        if not text_query or not text_query.strip():
            return {
                'success': False,
                'error': '搜索文字不能為空',
                'code': 'INVALID_INPUT'
            }
        
        if max_results < 1 or max_results > 20:
            return {
                'success': False,
                'error': '結果數量必須在1-20之間',
                'code': 'INVALID_INPUT'
            }
        
        result = self.map_service.search_places(
            text_query=text_query.strip(),
            language_code=language_code,
            max_results=max_results
        )
        
        if result['success']:
            return {
                'success': True,
                'data': {
                    'places': result['places'],
                    'total': result.get('total_results', 0),
                    'query': result.get('query', text_query)
                }
            }
        else:
            return {
                'success': False,
                'error': result.get('error', '搜索失敗'),
                'error_type': result.get('error_type', 'UNKNOWN_ERROR')
            }
    
    def handle_place_details(self, place_id: str):
        if not place_id or not place_id.strip():
            return {
                'success': False,
                'error': '地點ID不能為空',
                'code': 'INVALID_INPUT'
            }
        
        result = self.map_service.get_place_details(place_id=place_id.strip())
        
        if result['success']:
            return {
                'success': True,
                'data': {
                    'details': result['details'],
                    'place_id': place_id
                }
            }
        else:
            return {
                'success': False,
                'error': result.get('error', '獲取詳情失敗'),
                'error_type': result.get('error_type', 'UNKNOWN_ERROR')
            }
    
    def handle_nearby_search(self, location: Dict, radius: int = 1500,
                           included_types: Optional[List[str]] = None,
                           language_code: str = "zh-TW",
                           max_results: int = 10):
        if not location or not isinstance(location, dict):
            return {
                'success': False,
                'error': '位置信息不正確',
                'code': 'INVALID_INPUT'
            }
        
        if 'latitude' not in location or 'longitude' not in location:
            return {
                'success': False,
                'error': '位置必須包含latitude和longitude',
                'code': 'INVALID_INPUT'
            }
        
        if radius < 100 or radius > 50000:
            return {
                'success': False,
                'error': '搜索半徑必須在100-50000米之間',
                'code': 'INVALID_INPUT'
            }
        
        result = self.map_service.nearby_search(
            location=location,
            radius=radius,
            included_types=included_types,
            language_code=language_code,
            max_results=max_results
        )
        
        if result['success']:
            return {
                'success': True,
                'data': {
                    'places': result['places'],
                    'total': result.get('total_results', 0),
                    'location': location,
                    'radius': radius,
                    'types': included_types
                }
            }
        else:
            return {
                'success': False,
                'error': result.get('error', '查詢失敗'),
                'error_type': result.get('error_type', 'UNKNOWN_ERROR')
            }

    def handle_distance_and_duration(self, origin: str, destination: str, mode: str = 'driving'):
        """
        mode: 'driving' 或 'transit' (自駕或大眾運輸）
        """
        if not origin or not destination:
            return {
                'success': False,
                'error': '必須提供起點與終點',
                'code': 'INVALID_INPUT'
            }
        result = self.map_service.get_distance_and_duration(origin, destination, mode)
        if result.get('success'):
            return {
                'success': True,
                'data': {
                    'distance': result.get('distance'),
                    'duration': result.get('duration'),
                    'mode': result.get('mode'),
                    'origin': origin,
                    'destination': destination
                }
            }
        else:
            return {
                'success': False,
                'error': result.get('error', '查詢失敗'),
                'error_type': result.get('error_type', 'UNKNOWN_ERROR')
            }

    def handle_opening_hours(self, place_id_or_name: str, is_name: bool = False):
        if not place_id_or_name:
            return {
                'success': False,
                'error': '必須提供地點名稱或 place_id',
                'code': 'INVALID_INPUT'
            }
        result = self.map_service.get_opening_hours(place_id_or_name, is_name=is_name)
        if result.get('success'):
            return {
                'success': True,
                'data': {
                    'name': result.get('name'),
                    'opening_hours': result.get('opening_hours'),
                    'place_id': result.get('place_id', place_id_or_name)
                }
            }
        else:
            return {
                'success': False,
                'error': result.get('error', '查詢失敗'),
                'error_type': result.get('error_type', 'UNKNOWN_ERROR')
            }

    def handle_route_details(self, origin: str, destination: str, mode: str = 'driving'):
        """
        mode: 'driving' 或 'transit' (自駕或大眾運輸）
        """
        if not origin or not destination:
            return {
                'success': False,
                'error': '必須提供起點與終點',
                'code': 'INVALID_INPUT'
            }
        result = self.map_service.get_route_details(origin, destination, mode)
        if result.get('success'):
            return {
                'success': True,
                'data': {
                    'steps': result.get('steps'),
                    'mode': mode,
                    'origin': origin,
                    'destination': destination
                }
            }
        else:
            return {
                'success': False,
                'error': result.get('error', '查詢失敗'),
                'error_type': result.get('error_type', 'UNKNOWN_ERROR')
            }