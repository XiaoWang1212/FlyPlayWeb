// ===== 純工具函式（無副作用、無 DOM 依賴）=====

// 根據日期索引回傳對應顏色
function getColorByDay(dayIndex) {
  // dayIndex === -1 代表「全部」，給深灰色
  if (dayIndex === -1) {
    return "#455A64";
  }
  const colors = [
    "#2962FF",
    "#34A853",
    "#EA4335",
    "#FBBC04",
    "#9C27B0",
    "#FFC0CB",
  ];
  return colors[dayIndex % colors.length];
}

// HTML 特殊字元跳脫，防止 XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 將 Google Places API 地點物件統一轉換為 { lat, lng }
function normalizePlaceLocation(place) {
  if (!place || !place.location) return null;

  const lat =
    typeof place.location.lat === "number"
      ? place.location.lat
      : typeof place.location.latitude === "number"
        ? place.location.latitude
        : null;

  const lng =
    typeof place.location.lng === "number"
      ? place.location.lng
      : typeof place.location.longitude === "number"
        ? place.location.longitude
        : null;

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

// 將行程活動的 location 統一轉換為 { latitude, longitude }（搜尋錨點用）
function normalizeActivityLocation(location) {
  if (!location) return null;

  const lat =
    typeof location.lat === "number"
      ? location.lat
      : typeof location.latitude === "number"
        ? location.latitude
        : null;

  const lng =
    typeof location.lng === "number"
      ? location.lng
      : typeof location.longitude === "number"
        ? location.longitude
        : null;

  if (lat === null || lng === null) return null;
  return { latitude: lat, longitude: lng };
}

// 判斷活動是否有有效的路線定位點
function isValidRouteLocation(activity) {
  // 如果有 place_id，直接认为有效
  if (activity.place_id) {
    return true;
  }

  // 否则检查 location 中是否有坐标
  if (!activity.location) return false;
  const lat =
    typeof activity.location.lat === "number"
      ? activity.location.lat
      : typeof activity.location.latitude === "number"
        ? activity.location.latitude
        : null;
  const lng =
    typeof activity.location.lng === "number"
      ? activity.location.lng
      : typeof activity.location.longitude === "number"
        ? activity.location.longitude
        : null;
  if (lat === null || lng === null) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

// Helper: 取得 Directions API 需要的地點格式
function getLocationForDirections(activity) {
  if (
    activity &&
    activity.place_id &&
    typeof activity.place_id === "string" &&
    activity.place_id.length > 0
  ) {
    return { placeId: activity.place_id };
  }
  if (
    activity &&
    activity.location &&
    typeof activity.location.lat === "number" &&
    typeof activity.location.lng === "number"
  ) {
    return { lat: activity.location.lat, lng: activity.location.lng };
  }
  return null;
}
