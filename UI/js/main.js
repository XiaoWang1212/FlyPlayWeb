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
const editFab = document.getElementById("editFab").querySelector("i");
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

spotSearchOverlay.addEventListener("click", function (e) {
	if (e.target === spotSearchOverlay) {
		closeSpotSearchModal();
	}
});

spotSearchInput.addEventListener("focus", function () {
	if (
		spotSearchState.isOpen &&
		Array.isArray(spotSearchState.results) &&
		spotSearchState.results.length > 0 &&
		spotSearchResults.innerHTML === ""
	) {
		renderSpotSearchResults();
	}
});

spotSearchInput.addEventListener("keydown", onSpotSearchKeydown);

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
	try {
		const coordinatesLoaded = await loadCoordinatesFirst();

		await initMap();

		if (coordinatesLoaded) {
			const detailedData = await generateDetailedItinerary();
			if (detailedData) {
				console.log("✓ detailed_itinerary 生成完成");
				await enrichWithPictureInfo(detailedData);
			} else {
				console.warn("⚠️ detailed_itinerary 生成失敗或未執行");
			}
		} else {
			console.warn("⚠️ 座標資料未載入，跳過 detailed_itinerary 生成");
		}

		console.log("=== 頁面初始化完成 ===");
	} catch (error) {
		console.error("初始化失敗:", error);
	}
};

document.addEventListener("DOMContentLoaded", () => {
	loadProjects();
});
