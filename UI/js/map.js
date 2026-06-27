// ===== 地圖功能 =====

// Google Maps script 載入 promise（在 fetch API key 後 resolve）
let _googleMapsResolve;
const googleMapsReady = new Promise((resolve) => { _googleMapsResolve = resolve; });

async function addCustomMarkers(activities, dayIndex) {
	const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
	const color = getColorByDay(dayIndex);

	activities.forEach((activity, actIndex) => {
		// 製作地圖上的圓形小標記
		const markerDiv = document.createElement("div");
		markerDiv.classList.add("custom-marker");
		markerDiv.style.backgroundColor = color;
		markerDiv.innerHTML = `<span>${actIndex + 1}</span>`;

		const activitySpot = {
			place_id: activity.place_id || "",
			name: activity.place_name || "未命名地點",
			address: activity.address || "尚未提供詳細地址",
			photos: activity.photos || [],
			rating: activity.rating,
			user_rating_count: activity.user_rating_count,
		};

		const marker = new AdvancedMarkerElement({
			map: map,
			position: activity.location,
			content: markerDiv,
			title: activity.place_name,
		});

		marker.activityId =
			activity.activityId || activity.place_name || String(actIndex);
		currentMarkers.push(marker);

		marker.addListener("click", async (e) => {
			justClickedMarker = true;

			console.log("Marker clicked:", {
				activity: activity,
				activitySpot: activitySpot,
			});

			if (currentInfoWindow) {
				currentInfoWindow.close();
			}

			const infoWindow = new google.maps.InfoWindow({
				content: `<div class="custom-map-popup-info-wrapper">${buildSpotPreviewInfoHtml(activitySpot, "載入中...", "載入中...", { showAddButton: false, closeHandler: "closeCurrentPopup()" })}</div>`,
				maxWidth: 360,
			});
			currentInfoWindow = infoWindow;

			infoWindow.open({ map, anchor: marker });

			// 使用該天 weekday 顯示對應營業時間，避免固定顯示星期一
			const dayWeekday =
				dayIndex >= 0 && dayIndex < allDays.length
					? allDays[dayIndex]?.weekday || ""
					: "";

			const { openingHoursText, priceRangeText } = await getBusinessInfo(
				activitySpot,
				dayWeekday,
			);
			// 商家資訊快取由 search.js 內的 Map 統一管理。

			if (currentInfoWindow !== infoWindow) {
				return;
			}

			infoWindow.setContent(
				`<div class="custom-map-popup-info-wrapper">${buildSpotPreviewInfoHtml(activitySpot, openingHoursText, priceRangeText, { showAddButton: false, closeHandler: "closeCurrentPopup()" })}</div>`,
			);
		});
	});
}

function clearCurrentPopup() {
	if (currentInfoWindow) {
		currentInfoWindow.close();
		currentInfoWindow = null;
	}
}

// closeCurrentPopup 為 clearCurrentPopup 的別名
// — closeCurrentPopup：供 buildSpotPreviewInfoHtml 的 onclick 字串呼叫
function closeCurrentPopup() {
	clearCurrentPopup();
}

function clearMapRoutes() {
	mapRouteSession++; // 讓所有進行中的路線運算自行失效
	currentRenderers.forEach((polyline) => polyline.setMap(null));
	currentRenderers = [];

	currentMarkers.forEach((marker) => (marker.map = null));
	currentMarkers = [];

	// 切換天數或離開編輯模式時，一併收掉景點預覽地標 marker。
	closeSpotPreviewInfo();
}

// 透過新版 google.maps.routes.Route 計算並繪製單天路線（取代已棄用的 DirectionsService/Renderer）
async function renderDayRoute(
	routeActivities,
	dayIndex,
	sessionAtDispatch,
	polylineStyle,
	onSuccess,
) {
	const origin = getWaypointForRoute(routeActivities[0]);
	const destination = getWaypointForRoute(
		routeActivities[routeActivities.length - 1],
	);

	if (!origin || !destination) {
		addCustomMarkers(routeActivities, dayIndex);
		return;
	}

	const intermediates = routeActivities
		.slice(1, -1)
		.map((act) => getWaypointForRoute(act));

	try {
		const { Route } = await google.maps.importLibrary("routes");
		const { routes } = await Route.computeRoutes({
			origin,
			destination,
			intermediates,
			travelMode: "WALKING",
			fields: ["path"],
		});

		if (sessionAtDispatch !== mapRouteSession) return; // 已被新的 displayDay/clearMapRoutes 取消

		if (!routes || routes.length === 0) {
			console.error(`路線規劃失敗 (Day ${dayIndex + 1})：找不到路線`, {
				origin,
				destination,
				intermediates,
				activities: routeActivities.map((a) => ({
					name: a.place_name,
					location: a.location,
					place_id: a.place_id,
				})),
			});
			addCustomMarkers(routeActivities, dayIndex);
			return;
		}

		const polylines = routes[0].createPolylines();
		polylines.forEach((polyline) => {
			polyline.setOptions(polylineStyle);
			polyline.setMap(map);
			currentRenderers.push(polyline);
		});
		addCustomMarkers(routeActivities, dayIndex);
		if (onSuccess) onSuccess();
	} catch (error) {
		if (sessionAtDispatch !== mapRouteSession) return;
		console.error(`路線規劃失敗 (Day ${dayIndex + 1})`, {
			error,
			origin,
			destination,
			intermediates,
		});
		addCustomMarkers(routeActivities, dayIndex);
	}
}

function buildSpotFromPlaceResult(place, fallbackLocation) {
	const placeLocation = place && place.geometry ? place.geometry.location : null;
	const location = placeLocation || fallbackLocation;
	const lat = location && typeof location.lat === "function" ? location.lat() : location?.lat;
	const lng = location && typeof location.lng === "function" ? location.lng() : location?.lng;
	const hasPhoto = Array.isArray(place?.photos) && place.photos.length > 0;
	const photoUrl = hasPhoto
		? place.photos[0].getUrl({ maxWidth: 320, maxHeight: 320 })
		: "";

	return {
		place_id: place?.place_id || "",
		name: place?.name || "未命名地點",
		address: place?.formatted_address || place?.vicinity || "無地址資訊",
		location: {
			lat: typeof lat === "number" ? lat : 0,
			lng: typeof lng === "number" ? lng : 0,
		},
		photos: photoUrl ? [{ photo_url: photoUrl }] : [],
		rating: place?.rating,
		user_rating_count: place?.user_ratings_total,
		types: place?.types || [],
	};
}

function getPlaceDetails(placeId) {
	if (!placeId || !map || !google?.maps?.places) return Promise.resolve(null);

	return new Promise((resolve) => {
		const service = new google.maps.places.PlacesService(map);
		service.getDetails(
			{
				placeId: placeId,
				fields: [
					"place_id",
					"name",
					"formatted_address",
					"geometry",
					"photos",
					"rating",
					"user_ratings_total",
					"types",
				],
			},
			(result, status) => {
				if (
					status === google.maps.places.PlacesServiceStatus.OK &&
					result
				) {
					resolve(result);
					return;
				}
				resolve(null);
			},
		);
	});
}

async function handleMapPlaceClick(event) {
	if (!event?.placeId) return;

	const place = await getPlaceDetails(event.placeId);
	const spot = buildSpotFromPlaceResult(place || {}, event.latLng);

	selectedSpotForAdd = spot;
	openSpotInfoOnMap(spot, "載入中...", "載入中...");

	const selectedWeekday =
		currentDayIndex >= 0 && currentDayIndex < allDays.length
			? allDays[currentDayIndex]?.weekday || ""
			: "";
	const { openingHoursText, priceRangeText } = await getBusinessInfo(
		spot,
		selectedWeekday,
	);

	if (selectedSpotForAdd === spot) {
		openSpotInfoOnMap(spot, openingHoursText, priceRangeText);
	}
}

// 顯示所有天的行程
function displayAllDays() {
	clearMapRoutes(); // 先清除舊路線

	const bounds = new google.maps.LatLngBounds();

	getActiveDays().forEach((day, dayIndex) => {
		if (!day || !day.activities) {
			console.warn(`[ALL] 第 ${dayIndex + 1} 天資料異常`, day);
			return;
		}

		const activities = day.activities;
		const routeActivities = activities.filter((a) =>
			isValidRouteLocation(a),
		);

		if (activities.length < 2) {
			return;
		}
		if (routeActivities.length < 2) {
			return;
		}

		routeActivities.forEach((a) => bounds.extend(a.location));

		renderDayRoute(routeActivities, dayIndex, mapRouteSession, {
			strokeColor: getColorByDay(dayIndex),
			strokeWeight: 7,
			strokeOpacity: 0.6,
		});
	});

	if (!bounds.isEmpty()) {
		map.fitBounds(bounds, { top: 60, right: 40, bottom: 320, left: 40 });
	}

	loadAllTimelineActivities();
}

// 顯示單一天的行程
function displayDay(dayIndex) {
	clearMapRoutes(); // 先清除舊路線
	const day = getActiveDays()[dayIndex];

	if (!day || !day.activities) {
		console.error("該日期資料不存在");
		return;
	}

	// 不論活動數量，先更新時間線（確保新增的景點馬上顯示）
	loadSingleDayTimeline(day, dayIndex);

	// 路線渲染需要至少 2 個有效座標點
	const routeActivities = day.activities.filter((a) => isValidRouteLocation(a));
	if (routeActivities.length < 2) return;

	// 根據該天所有景點的座標範圍自動決定縮放層級
	const bounds = new google.maps.LatLngBounds();
	routeActivities.forEach((a) => bounds.extend(a.location));
	map.fitBounds(bounds, { top: 60, right: 40, bottom: 320, left: 40 });

	renderDayRoute(routeActivities, dayIndex, mapRouteSession, {
		strokeColor: getColorByDay(dayIndex),
		strokeWeight: 7,
		strokeOpacity: 0.9,
	});
}

// 依目前選取的天數重新繪製地圖路線、標記與時間線
// （供聊天 AI 修改行程後刷新畫面使用）
function refreshItineraryView() {
	if (typeof google === "undefined" || !map) return;

	if (currentDayIndex === -1) {
		displayAllDays();
		return;
	}

	const days = getActiveDays();
	const idx =
		currentDayIndex >= 0 && currentDayIndex < days.length
			? currentDayIndex
			: 0;
	displayDay(idx);
}

async function initMap() {
	try {
		let aiItinerary = localStorage.getItem("data_latlng");
		let usedLocal = false;
		if (aiItinerary) {
			try {
				const parsed = JSON.parse(aiItinerary);
				if (
					parsed.data &&
					Array.isArray(parsed.data) &&
					parsed.data.length > 0
				) {
					allDays = parsed.data.map((dayObj) => ({
						day: dayObj.day,
						weekday: dayObj.weekday || `第${dayObj.day}天`,
						activities: (dayObj.locations || []).map((loc) => ({
							place_name: loc.location_name,
							location: {
								lat: loc.location.latitude || 0,
								lng: loc.location.longitude || 0,
							},
							place_id: loc.place_id || "",
						})),
					}));
					usedLocal = true;
				}
			} catch (e) {
				// 解析失敗 fallback
				allDays = [];
			}
		}

		// 2. localStorage 沒資料時，不再呼叫 /api/itinerary（該端點僅支援 POST）
		if (!usedLocal) {
			allDays = Array.isArray(allDays) ? allDays : [];
		}

		// 計算所有景點的平均座標
		let totalLat = 0;
		let totalLng = 0;
		let pointCount = 0;

		allDays.forEach((day) => {
			day.activities.forEach((activity) => {
				if (
					activity.location &&
					activity.location.lat &&
					activity.location.lng
				) {
					totalLat += activity.location.lat;
					totalLng += activity.location.lng;
					pointCount++;
				}
			});
		});

		avgLat = pointCount > 0 ? totalLat / pointCount : 35.6762;
		avgLng = pointCount > 0 ? totalLng / pointCount : 139.6503;

		await googleMapsReady;
		const { Map } = await google.maps.importLibrary("maps");
		map = new Map(document.getElementById("map"), {
			zoom: 10,
			center: { lat: avgLat, lng: avgLng },
			mapId: "DEMO_MAP_ID",
			fullscreenControl: false,
			mapTypeControl: false,
			clickableIcons: true, 
		});

		map.addListener("click", (event) => {
			if (event && event.placeId) {
				event.stop();
				handleMapPlaceClick(event);
				return;
			}
			if (justClickedMarker) {
				justClickedMarker = false;
				return;
			}
			// 當點擊地圖時，檢查下邊欄是否展開，如果是就收起
			const sheet = document.getElementById("bottomSheet");
			if (sheet && sheet.classList.contains("expanded")) {
				closeSheet();
			}
			clearCurrentPopup();
		});

		if (Array.isArray(allDays) && allDays.length > 0) {
			createDayButtons();
			displayAllDays();
		}
	} catch (error) {
		console.error("初始化地圖失敗：", error);
	}
}

fetch(`${API_BASE}/api/google-key`)
	.then((res) => res.json())
	.then((data) => {
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=routes,places`;
		script.async = true;
		script.onload = () => _googleMapsResolve();
		script.onerror = () => _googleMapsResolve(); // 失敗也 resolve，讓 initMap 裡的錯誤正常拋出
		document.head.appendChild(script);
	})
	.catch(() => _googleMapsResolve());

// 跳轉到對應景點並開啟簡介
function focusMarker(id) {
	// 1. 在地圖標記陣列中找到對應的 marker
	const marker = currentMarkers.find((m) => m.activityId === id);

	if (marker) {
		// 2. 地圖平移到該座標
		map.panTo(marker.position);

		// 3. 稍微放大地圖 (可選，增加視覺感)
		map.setZoom(16);

		// 4. 觸發該標記的點擊事件，藉此打開 InfoWindow (簡介)
		// 注意：如果想直接打開，也可以手動調用 currentInfoWindow.open
		google.maps.event.trigger(marker, "click");

		// 5. 自動收起下邊欄 (可選，讓使用者看清楚地圖)
		// 如果不想點了就收起，可以註解掉下面這行
		closeSheet();
	}
}
