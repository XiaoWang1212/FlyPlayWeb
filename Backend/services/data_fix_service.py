import math

from services.googlemap_service import GoogleMapService


class DataFixService:
    """
    數據修復和坐標查詢服務
    負責增強行程數據的位置坐標信息
    """
    
    def __init__(self):
        self.google_map_service = GoogleMapService()

    @staticmethod
    def _calculate_distance_km(origin, target):
        """使用 Haversine 公式計算兩點距離（公里）。"""
        lat1 = origin.get('latitude')
        lon1 = origin.get('longitude')
        lat2 = target.get('latitude')
        lon2 = target.get('longitude')

        if None in (lat1, lon1, lat2, lon2):
            return None

        earth_radius_km = 6371
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return earth_radius_km * c
    
    def enrich_data_with_location(self, data, destination=None):
        output_data = []
        center_location = None

        days = data.get("data", [])

        # 第一步：用目的地城市 geocode 取得固定中心點
        if destination:
            print(f"🌐 用目的地 '{destination}' 確定中心點")
            dest_result = self.google_map_service.search_places(
                text_query=destination,
                language_code='zh-TW',
                max_results=1
            )
            if dest_result.get('success') and dest_result.get('places'):
                place = dest_result['places'][0]
                location = place.get('location', {})
                if location.get('latitude') is not None and location.get('longitude') is not None:
                    center_location = {
                        'latitude': location['latitude'],
                        'longitude': location['longitude']
                    }
                    print(f"✓ 中心點已確定（來自目的地）: {center_location}")

        # fallback：目的地 geocode 失敗時，從第一個景點取中心
        if not center_location:
            print("⚠️ 目的地 geocode 失敗，改從第一個景點取中心點")
            for day in days:
                for loc in day.get('location', []):
                    location_name = loc.get('location_name', '')
                    print(f"🔍 正在查詢第一個中心點: {location_name}")
                    search_result = self.google_map_service.search_places(
                        text_query=location_name,
                        language_code='zh-TW',
                        max_results=1
                    )
                    if search_result.get('success') and search_result.get('places'):
                        place = search_result['places'][0]
                        location = place.get('location', {})
                        if location.get('latitude') is not None and location.get('longitude') is not None:
                            center_location = {
                                'latitude': location['latitude'],
                                'longitude': location['longitude']
                            }
                            print(f"✓ 中心點已確定（來自景點）: {center_location}")
                            break
                if center_location:
                    break

        if not center_location:
            return {
                'success': False,
                'error': '無法確定中心位置',
                'data': []
            }

        # 第二步：查詢所有地點
        print(f"開始查詢剩餘地點")
        for day in days:
            day_result = {
                "day": day.get("day"),
                "locations": []
            }

            for loc in day.get('location', []):  
                location_name = loc.get('location_name', '')

                nearby_result = self.google_map_service.search_places_nearby(
                    text_query=location_name,
                    location=center_location,
                    radius=50000,
                    language_code='zh-TW',
                    max_results=1
                )

                if nearby_result.get('success') and nearby_result.get('places'):
                    place = nearby_result['places'][0]
                    location = place.get('location', {})
                    place_name_found = place.get('name', location_name)

                    distance_km = self._calculate_distance_km(center_location, location)
                    print(f"[datafx] {location_name} → 找到「{place_name_found}」lat={location.get('latitude'):.4f} lng={location.get('longitude'):.4f} 距中心 {distance_km:.1f} km")

                    # 距離計算失敗或超過50公里，都跳過
                    if distance_km is None:
                        print(f"跳過 {location_name}，無法計算距離（坐標不完整）")
                        continue

                    if distance_km > 50:
                        print(f"跳過 {location_name}，距離中心點 {distance_km:.2f} 公里，超過 50 公里")
                        continue

                    day_result["locations"].append({
                        "location_name": location_name,
                        "place_id": place.get('place_id'),
                        "location": location
                    })

                    # 更新中心點
                    if location.get('latitude') is not None:
                        center_location = {
                            'latitude': location['latitude'],
                            'longitude': location['longitude']
                        }
                else:
                    # 搜尋失敗，無法確定坐標，無法計算距離，直接跳過
                    print(f"無法搜尋 {location_name}，跳過")
                    continue

            output_data.append(day_result)

        return {
            'success': True,
            'data': output_data
        }
    
    def enrich_data_with_picture(self, days):
        """增強詳細行程格式 (location 字段) 的圖片信息"""
        modified_days = []
        
        for day in days:
            modified_day = {
                'day': day.get('day'),
                'weekday': day.get('weekday', ''),
                'location': []
            }
            
            # 修改每個地點
            locations = day.get('location', [])
            for loc in locations:
                modified_loc = {
                    'time': loc.get('time', ''),
                    'place_name': loc.get('place_name', '未命名'),
                    'description': loc.get('description', ''),
                    'type': loc.get('type', ''),
                    'cost': loc.get('cost', ''),
                    'location': loc.get('location', {'lat': 0, 'lng': 0})
                }
                
                # 使用 search_places 獲取圖片
                place_name = modified_loc['place_name']
                existing_location = modified_loc.get('location')
                has_valid_location = (
                    isinstance(existing_location, dict)
                    and existing_location.get('lat') not in (None, 0)
                    and existing_location.get('lng') not in (None, 0)
                )
                print(f"[enrich_picture] {place_name} | 既有座標={existing_location} | 有效={has_valid_location}")
                if place_name and place_name != '未命名':
                    try:
                        if has_valid_location:
                            # 有效座標 → 用座標做 nearby 搜尋，確保地址/照片是正確地點
                            search_result = self.google_map_service.search_places_nearby(
                                text_query=place_name,
                                location={
                                    'latitude': existing_location['lat'],
                                    'longitude': existing_location['lng'],
                                },
                                radius=500,
                                language_code='zh-TW',
                                max_results=1
                            )
                            print(f"[enrich_picture] {place_name} → 保留既有座標，用座標搜附近資訊")
                        else:
                            # 沒有座標 → 全域搜尋
                            search_result = self.google_map_service.search_places(
                                place_name,
                                language_code='zh-TW',
                                max_results=1
                            )

                        if search_result.get('success') and search_result.get('places'):
                            place = search_result['places'][0]

                            # 沒有有效座標時才更新座標
                            location = place.get('location', {})
                            if not has_valid_location and location.get('latitude') is not None and location.get('longitude') is not None:
                                print(f"[enrich_picture] {place_name} → 更新座標為 {location}")
                                modified_loc['location'] = {
                                    'lat': location['latitude'],
                                    'lng': location['longitude']
                                }

                            # 添加圖片
                            if place.get('photos'):
                                modified_loc['photos'] = [place['photos'][0]]

                            # 添加相關信息
                            if place.get('rating'):
                                modified_loc['rating'] = place['rating']

                            if place.get('address'):
                                modified_loc['address'] = place['address']

                            if place.get('phone'):
                                modified_loc['phone'] = place['phone']
                            
                    except Exception as e:
                        print(f"獲取 {place_name} 的圖片失敗: {e}")
                
                modified_day['location'].append(modified_loc)
            
            modified_days.append(modified_day)
        
        return modified_days
