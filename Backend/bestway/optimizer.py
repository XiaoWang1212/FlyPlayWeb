import numpy as np
import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from datetime import datetime
# from services.googlemap_service import GoogleMapService
import json
import redis
import os

# 取得目前 try.py 所在的資料夾路徑
base_path = os.path.dirname(__file__)
file_path = os.path.join(base_path, 'response_test.json')

with open(file_path, 'r', encoding='utf-8') as f:
    response_json = json.load(f)


def json_to_locations_adapter(response_json):
    raw_days = response_json['data']['parsed']['days']
    locations = []


    for day in raw_days:
        for activity in day['activities']:
            # 將 "14:00" 轉為 840 分鐘
            h, m = map(int, activity['time'].split(':'))
            time_in_minutes = h * 60 + m
            
            loc_data = {
                "name": activity['place_name'],
                "lat": activity['location']['lat'],
                "lng": activity['location']['lng'],
                "type": "hotel" if activity['type'] == "住宿" or activity['type'] == "hotel" else "attraction",
                "preferred_range": (time_in_minutes - 60, time_in_minutes + 60),
                "open": activity.get('open', 0),
                "close": activity.get('close', 1440)
                
            }
            locations.append(loc_data)
            
    return locations

# 模擬 Google Maps API 回傳結果

class MockGoogleMapService:
    def get_distance_and_duration(self, origins, destinations, **kwargs):
        """
        模擬 Google Maps Distance Matrix API
        根據經緯度計算球面距離，並轉換為合理的交通時間
        """
        rows = []
        for src in origins:
            elements = []
            # 解析經緯度字串 "lat,lng"
            s_lat, s_lng = map(float, src.split(','))
            
            for dst in destinations:
                d_lat, d_lng = map(float, dst.split(','))
                
                # 1. 使用 Haversine 公式計算兩點間的公里數
                R = 6371  # 地球半徑 (km)
                phi1, phi2 = math.radians(s_lat), math.radians(d_lat)
                dphi = math.radians(d_lat - s_lat)
                dlambda = math.radians(d_lng - s_lng)
                
                a = math.sin(dphi / 2)**2 + \
                    math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist_km = R * c
                
                # 2. 根據距離模擬時間 (假設市區/郊區綜合時速 50 km/h)
                # 加入基礎時間 5 分鐘 (300秒) 代表停紅燈、找車位等
                if dist_km < 0.1:  # 同一地點
                    duration_sec = 0
                else:
                    duration_sec = int((dist_km / 50) * 3600) + 300 
                
                elements.append({
                    "status": "OK",
                    "duration": {"value": duration_sec}, # 秒
                    "distance": {"value": int(dist_km * 1000)} # 公尺
                })
            rows.append({"elements": elements})
        return {"rows": rows}


class CachedGoogleMapService:
    def __init__(self):
        # 連接本地 Redis
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.gmaps = MockGoogleMapService()

    def get_distance_matrix(self, origins, destinations):
        cache_key = f"dist_matrix:{hash(str(origins))}:{hash(str(destinations))}"
        
        # 2. 檢查 Redis
        cached_data = self.redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 3. 沒有快取，呼叫 Google Maps API
        result = self.gmaps.get_distance_and_duration(origins, destinations)

        # 4. 將結果存入 Redis，設定過期時間 
        self.redis_client.setex(cache_key, 60 * 60 * 24 * 30, json.dumps(result))
        
        return result

class MultiModalItineraryOptimizer:
    def __init__(self, locations, num_days, transport_mode='driving'):
        """
        :param transport_mode: 'driving', 'walking', 'transit', 'bicycling'
        """
        self.gmaps = MockGoogleMapService()
        self.locations = locations
        self.num_days = num_days
        self.transport_mode = transport_mode
        self.num_locations = len(locations)
        self.time_matrix = None

    #if transport_mode == 'transit', departure_time is required to get accurate schedules
    def get_multi_modal_matrix(self, departure_time=None):
        if not departure_time:
            departure_time = datetime.now()

        origins = [f"{loc['lat']},{loc['lng']}" for loc in self.locations]
        destinations = origins
        
        matrix_res = self.gmaps.get_distance_and_duration(
            origins, 
            destinations, 
            mode=self.transport_mode,
            departure_time=departure_time,
            language='zh-TW'
        )

        matrix = np.zeros((self.num_locations, self.num_locations), dtype=int)
        for i, row in enumerate(matrix_res['rows']):
            for j, element in enumerate(row['elements']):
                if element['status'] == 'OK':
                    # 轉換為分鐘 (Duration value is in seconds)
                    matrix[i][j] = element['duration']['value'] // 60
                else:
                    matrix[i][j] = 9999 # 不可達路徑
        
        self.time_matrix = matrix
        return matrix
    
    def generate_starts_and_ends(self):
        starts = []
        ends = []
        
        # 找出所有標註為飯店的索引
        hotel_indices = [i for i, loc in enumerate(self.locations) if loc['type'] == 'hotel']
        
        for d in range(self.num_days):
            end_hotel = hotel_indices[d] if d < len(hotel_indices) else hotel_indices[-1]
            
            if d - 1 >= 0 :
                start_hotel = hotel_indices[d-1]
            else:
                start_hotel = hotel_indices[0]
                
            starts.append(start_hotel)
            ends.append(end_hotel)
                    
        return starts, ends

    def solve(self):
        if self.time_matrix is None:
            self.get_multi_modal_matrix()
        
        starts, ends = self.generate_starts_and_ends()
    
        
        
        # 2. 初始化 Manager 
        manager = pywrapcp.RoutingIndexManager(
            self.num_locations, 
            self.num_days, 
            starts, 
            ends
        )

        # 3. 初始化 Routing Model
        routing = pywrapcp.RoutingModel(manager)


        # 定義交通成本回調
        def time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            
            
            travel_time = self.time_matrix[from_node][to_node]
            
           
            service_time = self.locations[from_node].get('duration', 100)
            
            
            buffer_time = 5 if self.transport_mode == 'transit' else 0
            
            return travel_time + service_time + buffer_time

        transit_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # 加入時間窗約束 
        routing.AddDimension(
            transit_callback_index,
            60,    # 允許等待時間 (Slack)
            1440,  # 一天最大分鐘數
            False, 
            'Time'
        )
    
        time_dimension = routing.GetDimensionOrDie('Time')
        
        time_dimension.SetGlobalSpanCostCoefficient(50)

        # 2. 遍歷每一天（每一輛車），設定其起點的時間範圍
        for day_idx in range(self.num_days):
            index = routing.Start(day_idx)
            time_dimension.CumulVar(index).SetRange(480, 600)
        

        for loc_idx in range(self.num_locations):
            index = manager.NodeToIndex(loc_idx)
            if self.locations[loc_idx]['type'] != 'hotel':
                time_dimension.CumulVar(index).SetRange(
                    int(self.locations[loc_idx]['open']), 
                    int(self.locations[loc_idx]['close'])
                )

        start_end_nodes = set(starts) | set(ends)

        for i in range(self.num_locations):
            index = manager.NodeToIndex(i)
            if index == -1: continue

            #  處理 Disjunction 
            if i not in start_end_nodes:
                routing.AddDisjunction([index], 10000)

            pref_range = self.locations[i].get('preferred_range')
            if pref_range and self.locations[i]['type'] != 'hotel':
                start_pref, end_pref = pref_range
                time_dimension.SetCumulVarSoftLowerBound(index, start_pref, 20)
                time_dimension.SetCumulVarSoftUpperBound(index, end_pref, 20)

        # 搜尋參數
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        )
        #透過 Metaheuristic 避免陷入局部最優解
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 10 

        solution = routing.SolveWithParameters(search_parameters)

        if solution:
            return self._format_result(manager, routing, solution)
        return {"error": "無法生成行程"}

    def _format_result(self, manager, routing, solution):
        time_dimension = routing.GetDimensionOrDie('Time')
        final_itinerary = {}

        for day_idx in range(self.num_days):
            day_list = []
            index = routing.Start(day_idx)
            prev_departure_time = None # 用於紀錄前一點的離開時間
            
            while not routing.IsEnd(index):
                node_idx = manager.IndexToNode(index)
                time_var = time_dimension.CumulVar(index)
                arrival_time = solution.Min(time_var)
                
                # 計算從上一點到這一點的交通時間
                travel_time_str = "0"
                if prev_departure_time is not None:
                    travel_time_minutes = arrival_time - prev_departure_time
                    travel_time_str = f"{travel_time_minutes}"
                
                # 取得當前點的停留時間 (預設 100)
                service_time = self.locations[node_idx].get('duration', 100)
                # 離開時間 = 抵達時間 + 停留時間
                departure_time = arrival_time + service_time
                
                day_list.append({
                    "location": self.locations[node_idx]['name'],
                    "arrival": f"{arrival_time//60:02d}:{arrival_time%60:02d}",
                    "travel_time_from_previous": travel_time_str + " min",
                    "transport_mode": self.transport_mode,
                    "lat": self.locations[node_idx]['lat'],
                    "lng": self.locations[node_idx]['lng']
                })
                
                prev_departure_time = departure_time
                index = solution.Value(routing.NextVar(index))
            
            # 處理最後回到終點 (飯店) 的交通時間
            node_idx = manager.IndexToNode(index)
            arrival_time = solution.Min(time_dimension.CumulVar(index))
            travel_time_to_end = arrival_time - prev_departure_time
            
            day_list.append({
                "location": self.locations[node_idx]['name'], 
                "arrival": f"{arrival_time//60:02d}:{arrival_time%60:02d}",
                "travel_time_from_previous": f"{travel_time_to_end} min",
                "status": "End Day"
            })
            final_itinerary[f"Day {day_idx+1}"] = day_list

        return final_itinerary
    


if __name__ == "__main__":
    # 1. 讀取並轉換資料
    try:
        locations = json_to_locations_adapter(response_json)
        print(f"成功載入 {len(locations)} 個地點")
        original_days = len(response_json['data']['parsed']['days'])
    except Exception as e:
        print(f"資料轉換失敗: {e}")
        exit()

    # 2. 初始化優化器
    # 注意：如果沒有真的 GoogleMapService，要把類別內的 self.gmaps 換成 Mock
    optimizer = MultiModalItineraryOptimizer(
        locations=locations, 
        num_days=original_days,
        transport_mode='driving'
    )
    
    # 如果要跳過真的 API 呼叫，可以手動注入 Mock
    optimizer.gmaps = MockGoogleMapService() 

    # 3. 執行運算
    print("開始計算最優路徑...")
    result = optimizer.solve()

    # 4. 印出結果
    print(json.dumps(result, indent=2, ensure_ascii=False))
