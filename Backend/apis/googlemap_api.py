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