import requests 
from config import Config

class GoogleMapService:
    def __init__(self):
        self.api_key = Config.GOOGLE_MAPS_API_KEY
        self.base_url = "https://maps.googleapis.com/maps/api"
    
    def search_places(self, query, location=None, radius=5000):
        try:
            url = f"{self.base_url}/place/textsearch/json"
            params = {
                'query': query,
                'key': self.api_key
            }
            
            if location:
                params['location'] = f"{location['lat']},{location['lng']}"
                params['radius'] = radius
            
            response = requests.get(url, params=params)
            data = response.json()
            
            return {
                'success': True,
                'places': data.get('results', [])
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_place_details(self, place_id):
        try:
            url = f"{self.base_url}/place/details/json"
            params = {
                'place_id': place_id,
                'key': self.api_key,
                'fields': 'name,rating,formatted_phone_number,opening_hours,website,photos'
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            return {
                'success': True,
                'details': data.get('result', {})
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_directions(self, origin, destination, mode='driving'):
        try:
            url = f"{self.base_url}/directions/json"
            params = {
                'origin': origin,
                'destination': destination,
                'mode': mode,
                'key': self.api_key
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            return {
                'success': True,
                'routes': data.get('routes', [])
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_distance_and_duration(self, origin, destination, mode='driving'):
        """
        mode: 'driving' 或 'transit' (自駕與大眾運輸）
        """
        try:
            url = f"{self.base_url}/directions/json"
            params = {
                'origin': origin,
                'destination': destination,
                'mode': mode,
                'key': self.api_key,
                'language': 'zh-TW'
            }
            response = requests.get(url, params=params)
            data = response.json()
            if data.get('status') != 'OK':
                return {'success': False, 'error': data.get('error_message', '查詢失敗')}
            route = data['routes'][0]['legs'][0]
            return {
                'success': True,
                'distance': route['distance']['text'],
                'duration': route['duration']['text'],
                'mode': mode
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_opening_hours(self, place_id):
        try:
            url = f"{self.base_url}/place/details/json"
            params = {
                'place_id': place_id,
                'fields': 'name,opening_hours',
                'key': self.api_key,
                'language': 'zh-TW'
            }
            response = requests.get(url, params=params)
            data = response.json()
            if data.get('status') != 'OK':
                return {'success': False, 'error': data.get('error_message', '查詢失敗')}
            result = data.get('result', {})
            return {
                'success': True,
                'name': result.get('name'),
                'opening_hours': result.get('opening_hours', {}).get('weekday_text', [])
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_route_details(self, origin, destination, mode='driving'):
        """
        mode: 'driving' 或 'transit' (自駕或大眾運輸）
        """
        try:
            url = f"{self.base_url}/directions/json"
            params = {
                'origin': origin,
                'destination': destination,
                'mode': mode,
                'key': self.api_key,
                'language': 'zh-TW'
            }
            response = requests.get(url, params=params)
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
            return {
                'success': True,
                'steps': steps
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}