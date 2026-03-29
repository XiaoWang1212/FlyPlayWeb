from flask import Blueprint, request, jsonify
from controllers.auth_controller import AuthController

auth_bp = Blueprint("auth", __name__)
auth_ctrl = AuthController()

def unified_response(code, message, data=None):
    return jsonify({"code": code, "message": message, "data": data}), code

@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(force=True, silent=True) or {}
    email = payload.get("email")
    password = payload.get("password")
    res = auth_ctrl.login(email, password)
    if res["success"]:
        return unified_response(200, "登入成功", res["user"])
    return unified_response(401, res.get("error", "登入失敗"))

@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(force=True, silent=True) or {}
    email = payload.get("email")
    password = payload.get("password")
    name = payload.get("name")
    res = auth_ctrl.register(email, password, name)
    if res["success"]:
        return unified_response(201, "註冊成功", res["user"])
    return unified_response(400, res.get("error", "註冊失敗"))