from google.cloud import firestore
from datetime import datetime, timedelta

class PlaceCache:
    def __init__(self):
        self.db = firestore.Client()
        self.collection = self.db.collection('places')

    def get(self, place_id, expire_days=7):
        doc = self.collection.document(place_id).get()
        if doc.exists:
            data = doc.to_dict()
            cached_time = datetime.fromisoformat(data['cached_at'])
            if datetime.utcnow() - cached_time < timedelta(days=expire_days):
                return data['result']
        return None

    def set(self, place_id, result):
        self.collection.document(place_id).set({
            'result': result,
            'cached_at': datetime.utcnow().isoformat()
        })