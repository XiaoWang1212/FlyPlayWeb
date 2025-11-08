from flask import Blueprint, request, jsonify
from services.googlemap_service import GoogleMapService

map_bp = Blueprint('maps', __name__)
map_service = GoogleMapService()

@map_bp.route('/search', methods=['POST'])
def search_places():
    data = request.get_json()
    query = data.get('query')
    location = data.get('location')
    radius = data.get('radius', 5000)
    
    result = map_service.search_places(query, location, radius)
    return jsonify(result)

@map_bp.route('/details/<place_id>', methods=['GET'])
def get_place_details(place_id):
    result = map_service.get_place_details(place_id)
    return jsonify(result)

@map_bp.route('/directions', methods=['POST'])
def get_directions():
    data = request.get_json()
    origin = data.get('origin')
    destination = data.get('destination')
    mode = data.get('mode', 'driving')
    
    result = map_service.get_directions(origin, destination, mode)
    return jsonify(result)