from functools import wraps
from flask import request, jsonify
from services.auth_service import AuthService

auth_service = AuthService()

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"code": 401, "message": "缺少授權", "data": None}), 401
        token = auth.split(" ", 1)[1]
        user = auth_service.verify_token(token)
        if not user:
            return jsonify({"code": 401, "message": "權杖失效", "data": None}), 401
        request.user = user
        return f(*args, **kwargs)
    return wrapper