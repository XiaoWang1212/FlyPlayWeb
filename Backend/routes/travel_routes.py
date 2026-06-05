from flask import Blueprint, request, jsonify
from controllers.travel_controller import TravelController
import asyncio
from decorators.auth_decorator import login_required

travel_bp = Blueprint("travel", __name__)
travel_ctrl = TravelController()


def unified_response(code, message, data=None):
    return jsonify({"code": code, "message": message, "data": data}), code


@travel_bp.route("/projects", methods=["GET"])
@login_required
def list_projects():
    user_id = request.args.get("user_id")
    if not user_id:
        return unified_response(400, "user_id 為必填")
    result = travel_ctrl.list_projects(user_id)
    if not result["success"]:
        return unified_response(404, result.get("error"))
    return unified_response(200, "專案列表", result["data"])


@travel_bp.route("/project", methods=["POST"])
@login_required
def create_project():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return unified_response(400, "請求體需為 JSON")
    user_id = payload.get("user_id")
    title = payload.get("title")
    if not user_id or not title:
        return unified_response(400, "user_id/title 為必填")
    result = travel_ctrl.create_project(user_id, title)
    return unified_response(201, "專案建立成功", result["data"])


@travel_bp.route("/project/<int:project_id>", methods=["DELETE"])
@login_required
def delete_project(project_id):
    result = travel_ctrl.delete_project(project_id)
    if not result["success"]:
        return unified_response(404, result.get("error"))
    return unified_response(200, "專案刪除成功", result["data"])


@travel_bp.route("/itineraries/<int:project_id>", methods=["GET"])
@login_required
def list_itineraries(project_id):
    result = travel_ctrl.list_itineraries(project_id)
    return unified_response(200, "查詢成功", result["data"])


@travel_bp.route("/itinerary", methods=["POST"])
@login_required
def create_itinerary():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return unified_response(400, "請求體需為 JSON")
    trip_pace = (
        payload.get("pace")
        or payload.get("tripPace")
        or payload.get("morning_departure")
        or payload.get("morningDeparture")
    )
    normalized_payload = dict(payload)
    normalized_payload["pace"] = trip_pace
    required = [
        "project_id",
        "days",
        "departure_airport",
        "destination",
        "type",
        "companion",
        "pace",
        "interests",
        "start_date",
    ]
    if not all(normalized_payload.get(k) is not None for k in required):
        missing = [k for k in required if normalized_payload.get(k) is None]
        return unified_response(400, f"缺少欄位: {', '.join(missing)}")
    result = travel_ctrl.create_itinerary(
        normalized_payload["project_id"],
        normalized_payload["days"],
        normalized_payload["departure_airport"],
        normalized_payload["destination"],
        normalized_payload["type"],
        normalized_payload["companion"],
        normalized_payload["pace"],
        normalized_payload["interests"],
        normalized_payload["start_date"],
    )
    if not result["success"]:
        return unified_response(400, result["error"])
    return unified_response(201, "行程儲存成功", result["data"])


@travel_bp.route("/generate", methods=["POST"])
@login_required
def generate_itinerary():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return unified_response(400, "請求體需為 JSON")
    req = payload
    trip_pace = req.get("pace") or req.get("tripPace") or req.get("morningDeparture") or req.get("morning_departure")
    coro = travel_ctrl.generate_itinerary(
        location=req.get("location"),
        days=req.get("days"),
        trip_pace=trip_pace,
        traveler_type=req.get("travelerType"),
        interests=req.get("interests", []),
        start_date=req.get("startDate"),
    )
    result = asyncio.run(coro)
    if not result["success"]:
        return unified_response(500, result.get("error"))
    return unified_response(200, "行程生成成功", result["data"])


@travel_bp.route("/itinerary/summary", methods=["POST"])
@login_required
def summarize_itinerary():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return unified_response(400, "請求體需為 JSON")

    result = travel_ctrl.format_itinerary_for_display(
        raw_output=payload.get("raw_output"),
        parsed=payload.get("parsed"),
    )
    if not result["success"]:
        return unified_response(500, result.get("error"))

    return unified_response(200, "行程摘要生成成功", result["data"])


@travel_bp.route("/itinerary/<int:itinerary_id>", methods=["GET"])
@login_required
def get_itinerary(itinerary_id):
    result = travel_ctrl.get_itinerary(itinerary_id)
    if not result["success"]:
        return unified_response(404, result.get("error"))
    return unified_response(200, "行程詳情", result["data"])


@travel_bp.route("/itinerary/<int:itinerary_id>", methods=["PUT"])
@login_required
def update_itinerary(itinerary_id):
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return unified_response(400, "請求體需為 JSON")
    result = travel_ctrl.update_itinerary(itinerary_id, payload)
    if not result["success"]:
        return unified_response(400, result.get("error"))
    return unified_response(200, "更新成功", result["data"])


@travel_bp.route("/itinerary/<int:itinerary_id>", methods=["DELETE"])
@login_required
def delete_itinerary(itinerary_id):
    result = travel_ctrl.delete_itinerary(itinerary_id)
    if not result["success"]:
        return unified_response(404, result.get("error"))
    return unified_response(200, "刪除成功", result["data"])
