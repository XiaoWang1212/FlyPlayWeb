from services.googlemap_service import GoogleMapService


class DataFixService:
    """
    數據修復和坐標查詢服務
    負責增強行程數據的位置坐標信息
    """
    
    def __init__(self):
        self.google_map_service = GoogleMapService()

    def _time_slots_for_count(self, count):
        """依當天活動數量生成固定且遞增的時間槽。"""
        presets = {
            1: ["09:00"],
            2: ["09:00", "14:00"],
            3: ["09:00", "12:00", "15:00"],
            4: ["09:00", "12:00", "15:00", "18:00"],
            5: ["08:00", "11:00", "14:00", "17:00", "20:00"],
        }
        if count in presets:
            return presets[count]

        base_hour = 8
        return [f"{(base_hour + i * 2):02d}:00" for i in range(count)]

    def normalize_itinerary_times(self, days):
        """依目前 location 順序重排 time，忽略原本錯誤或過期時間。"""
        if not isinstance(days, list):
            return days

        for day in days:
            if not isinstance(day, dict):
                continue

            locations = day.get('location', [])
            if not isinstance(locations, list):
                continue

            slots = self._time_slots_for_count(len(locations))
            for idx, loc in enumerate(locations):
                if isinstance(loc, dict):
                    loc['time'] = slots[idx] if idx < len(slots) else slots[-1]

        return days
    
    def enrich_data_with_location(self, data):
        output_data = []
        center_location = None

        days = data.get("data", [])

        # 第一步：找到第一個有座標的地點
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

                    if location.get('latitude') is not None:
                        center_location = {
                            'latitude': location['latitude'],
                            'longitude': location['longitude']
                        }
                        print(f"✓ 中心點已確定: {center_location}")
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
                    day_result["locations"].append({
                        "location_name": location_name,
                        "place_id": -1,
                        "location": {}
                    })

            output_data.append(day_result)

        return {
            'success': True,
            'data': output_data
        }
    
    def enrich_data_with_picture(self, days):
        """增強詳細行程格式 (location 字段) 的圖片信息"""
        # 先統一時間，確保編輯/拖曳後 time 會自動對齊順序。
        days = self.normalize_itinerary_times(days)
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
                if place_name and place_name != '未命名':
                    try:
                        search_result = self.google_map_service.search_places(
                            place_name, 
                            language_code='zh-TW',
                            max_results=1
                        )
                        
                        if search_result.get('success') and search_result.get('places'):
                            place = search_result['places'][0]
                            
                            # 更新坐標
                            location = place.get('location', {})
                            if location.get('latitude') is not None and location.get('longitude') is not None:
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
