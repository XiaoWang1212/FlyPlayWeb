from services.googlemap_service import GoogleMapService
from typing import Dict, Optional, List

class MapController:
    """地圖控制器，處理地圖相關業務邏輯"""
    
    def __init__(self):
        """初始化服務層"""
        self.map_service = GoogleMapService()
    
    def handle_text_search(self, text_query: str, language_code: str = "zh-TW", 
                          max_results: int = 5):
        """
        處理文字搜索請求-新版API
        
        Args:
            text_query: 搜索文字
            language_code: 語言代碼
            max_results: 最大結果數
            
        Returns:
            處理後的響應數據
        """
        
        # 驗證輸入
        if not text_query or not text_query.strip():
            return {
                'success': False,
                'error': '搜索文字不能為空',
                'code': 'INVALID_INPUT'
            }
        
        # 驗證結果數量
        if max_results < 1 or max_results > 20:
            return {
                'success': False,
                'error': '結果數量必須在1-20之間',
                'code': 'INVALID_INPUT'
            }
        
        # 調用服務層
        result = self.map_service.search_places(
            text_query=text_query.strip(),
            language_code=language_code,
            max_results=max_results
        )
        
        # 處理響應
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
        # 驗證輸入
        if not place_id or not place_id.strip():
            return {
                'success': False,
                'error': '地點ID不能為空',
                'code': 'INVALID_INPUT'
            }
        
        # 調用服務層
        result = self.map_service.get_place_details(place_id=place_id.strip())
        
        # 處理響應
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
        """
        處理附近搜索請求
        
        Args:
            location: 中心位置
            radius: 搜索半徑
            included_types: 地點類型列表
            language_code: 語言代碼
            max_results: 最大結果數
            
        Returns:
            處理後的響應數據
        """
        # 驗證位置
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
        
        # 驗證半徑
        if radius < 100 or radius > 50000:
            return {
                'success': False,
                'error': '搜索半徑必須在100-50000米之間',
                'code': 'INVALID_INPUT'
            }
        
        # 調用服務層
        result = self.map_service.nearby_search(
            location=location,
            radius=radius,
            included_types=included_types,
            language_code=language_code,
            max_results=max_results
        )
        
        # 處理響應
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
