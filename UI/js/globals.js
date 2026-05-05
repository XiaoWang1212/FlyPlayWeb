// ===== 全域狀態變數 =====
// 地圖物件（由 initMap 初始化後賦值）
let map;

// 行程資料
let allDays = [];
let currentDayIndex = -1;

// API 根路徑
const API_BASE = "http://127.0.0.1:5001";

// 地圖中心座標（由實際資料計算，預設東京）
let avgLat = 35.6762;
let avgLng = 139.6503;

// 地圖上目前繪製的路線與標記（切換天數時清除）
let currentRenderers = [];
let currentMarkers = [];

// 目前開啟的資訊視窗
let currentInfoWindow = null;

// 防止地圖點擊與標記點擊衝突
let justClickedMarker = false;

// 景點搜尋預覽標記
let spotPreviewMarker = null;

// 選中要加入行程的景點
let selectedSpotForAdd = null;
