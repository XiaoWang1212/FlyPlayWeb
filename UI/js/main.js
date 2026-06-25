// ===== DOM 參考、狀態變數、事件監聽、初始化 =====

// --- DOM 參考 ---
const sidebar = document.getElementById("sidebar");
const overlay = document.querySelector(".sidebar-overlay");
const sheet = document.getElementById("bottomSheet");
const fabGroup = document.getElementById("fabGroup");
const mapContainer = document.getElementById("mapContainer");
const dragHandle = document.getElementById("dragHandle");
const timelineView = document.getElementById("timelineView");
const chatView = document.getElementById("chatView");
const editFab = null;
const robotFabIcon = document.getElementById("robotFab").querySelector("i");

// --- 搜尋相關 DOM 參考 ---
const spotSearchOverlay = document.getElementById("spotSearchOverlay");
const spotSearchInput = document.getElementById("spotSearchInput");
const spotSearchResults = document.getElementById("spotSearchResults");

// --- 狀態變數 ---
let isEditMode = false;
let isChatMode = false;
let originalTimelineHTML = "";
let isDragChanged = false;
let editedDays = null;

const spotSearchState = {
	isOpen: false,
	results: [],
	selectedIndex: -1,
	requestId: 0,
};

// --- SortableJS 設定 (拖拽功能) ---
const timelineList = document.getElementById("timelineList");

let sortable = new Sortable(timelineList, {
	animation: 150,
	disabled: true,
	delay: 200,
	delayOnTouchOnly: true,
	handle: ".timeline-item",
	ghostClass: "sortable-ghost",
	dragClass: "sortable-drag",
	filter: "[data-day-title],.delete-btn,.add-item-btn",
	// 避免 Sortable 對 filter 元素 preventDefault 吃掉 click（Chrome 下會導致新增行程按鈕沒反應）
	// 加了這個 chrome 就不會有問題了誒
	preventOnFilter: false,
	scroll: true,
	scrollSpeed: 10,
	onEnd: function (evt) {
		if (currentDayIndex === -1) {
			saveAllDayOrder();
		} else {
			saveCurrentDayOrder(currentDayIndex);
		}
		isDragChanged = true;
		document.getElementById("dragConfirmBtn").classList.add("show");
	},
});

// --- 事件監聽 ---
dragHandle.addEventListener("click", toggleBottomSheet);
dragHandle.addEventListener("touchstart", handleTouchStart, { passive: true });
dragHandle.addEventListener("touchend", handleTouchEnd);

mapContainer.addEventListener("click", function (e) {
	if (
		!sheet.contains(e.target) &&
		!fabGroup.contains(e.target) &&
		sheet.classList.contains("expanded")
	) {
		closeSheet();
	}
});

// 全頁搜尋模式下，避免點地圖空白區就自動關閉搜尋面板。

spotSearchInput.addEventListener("focus", function () {
	// 從「搜尋紀錄」收合狀態重新進入時，展開並清空關鍵字與結果，讓使用者直接重新搜尋。
	if (spotSearchOverlay.classList.contains("results-collapsed")) {
		spotSearchOverlay.classList.remove("results-collapsed");
		spotSearchInput.value = "";
		spotSearchState.results = [];
		spotSearchState.selectedIndex = -1;
		spotSearchResults.innerHTML = "";
	}
});

spotSearchInput.addEventListener("keydown", onSpotSearchKeydown);

// 從瀏覽器輸入歷史/自動填入點選一筆帶入時，自動搜尋並離開輸入狀態，免再按 Enter。
// 帶入時 inputType 會是 insertReplacementText 或空（null），且非 IME 組字中；一般打字 inputType 為 insertText，不會觸發。
spotSearchInput.addEventListener("input", function (e) {
	const isPickedFromHistory =
		e.inputType === "insertReplacementText" || !e.inputType;
	if (isPickedFromHistory && !e.isComposing && spotSearchInput.value.trim()) {
		triggerSpotSearch(true);
		spotSearchInput.blur();
	}
});

// 處理鍵盤彈出時的視窗大小變化
window.visualViewport.addEventListener("resize", function () {
	const inputBar = document.querySelector(".chat-input-bar");
	if (inputBar && isChatMode) {
		const keyboardHeight =
			window.innerHeight - window.visualViewport.height;
		inputBar.style.bottom = keyboardHeight + "px";
	}
});

// 鍵盤收起時恢復位置
window.visualViewport.addEventListener("scroll", function () {
	const inputBar = document.querySelector(".chat-input-bar");
	if (inputBar && window.visualViewport.height === window.innerHeight) {
		inputBar.style.bottom = "0px";
	}
});

// --- 初始化 ---
window.onload = async function () {
	// openProject（由 loadProjects 觸發）已完成初始化，跳過重複執行
	if (Array.isArray(allDays) && allDays.length > 0) {
		console.log("=== 頁面初始化完成（由 openProject 完成）===");
		return;
	}
	try {
		const coordinatesLoaded = await loadCoordinatesFirst();

		await initMap();

		if (coordinatesLoaded) {
			const ok = await generateDetailedItinerary();
			if (!ok) console.warn("⚠️ detailed_itinerary 載入失敗");
		} else {
			console.warn("⚠️ 座標資料未載入，跳過 detailed_itinerary 生成");
		}

		console.log("=== 頁面初始化完成 ===");
	} catch (error) {
		console.error("初始化失敗:", error);
	}
};

document.addEventListener("DOMContentLoaded", () => {
	syncSheetState("sheet-collapsed");
	loadProjects();

	// 機器人每 6 秒揮一次手
	setInterval(() => {
		const fab = document.getElementById("robotFab");
		if (!fab || fab.classList.contains("chat-open")) return;
		fab.classList.add("robot-wave");
		fab.addEventListener("animationend", () => fab.classList.remove("robot-wave"), { once: true });
	}, 3500);
});

document.addEventListener("click", () => {
	document.querySelectorAll(".trip-dropdown.open").forEach((d) => d.classList.remove("open"));
});
