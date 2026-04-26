// ===== 地圖功能 =====

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
			_businessInfo: activity._businessInfo || null,
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
				content: `<div class="spot-map-info-wrapper">${buildSpotPreviewInfoHtml(activitySpot, "載入中...", "載入中...", { showAddButton: false, closeHandler: "closeCurrentPopup()" })}</div>`,
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
			if (activitySpot._businessInfo) {
				activity._businessInfo = activitySpot._businessInfo;
			}

			if (currentInfoWindow !== infoWindow) {
				return;
			}

			infoWindow.setContent(
				`<div class="spot-map-info-wrapper">${buildSpotPreviewInfoHtml(activitySpot, openingHoursText, priceRangeText, { showAddButton: false, closeHandler: "closeCurrentPopup()" })}</div>`,
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

// closeCurrentPopup / closeCustomMapPopup 為 clearCurrentPopup 的別名
// — closeCurrentPopup：供 buildSpotPreviewInfoHtml 的 onclick 字串呼叫
// — closeCustomMapPopup：供 #customMapPopup 的 onclick HTML 屬性呼叫
function closeCurrentPopup() {
	clearCurrentPopup();
}

function closeCustomMapPopup() {
	clearCurrentPopup();
}

function clearMapRoutes() {
	currentRenderers.forEach((renderer) => renderer.setMap(null));
	currentRenderers = [];

	currentMarkers.forEach((marker) => (marker.map = null));
	currentMarkers = [];

	clearCurrentPopup();
}

// 顯示所有天的行程
function displayAllDays() {
	clearMapRoutes(); // 先清除舊路線

	const { DirectionsService, DirectionsRenderer } = google.maps;

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
			console.warn(`[ALL] 第 ${dayIndex + 1} 天活動數量不足`, activities);
			return;
		}
		if (routeActivities.length < 2) {
			console.warn(`[ALL] 第 ${dayIndex + 1} 天有效路線點不足`, {
				activities,
				routeActivities,
				判斷結果: activities.map((a) => isValidRouteLocation(a)),
			});
			return;
		}

		const directionsService = new DirectionsService();
		const directionsRenderer = new DirectionsRenderer({
			map: map,
			suppressMarkers: true,
			preserveViewport: true,
			polylineOptions: {
				strokeColor: getColorByDay(dayIndex),
				strokeWeight: 7,
				strokeOpacity: 0.6,
			},
		});
		currentRenderers.push(directionsRenderer);

		const origin = getLocationForDirections(routeActivities[0]);
		const destination = getLocationForDirections(
			routeActivities[routeActivities.length - 1],
		);
		const waypoints = routeActivities.slice(1, -1).map((act) => ({
			location: getLocationForDirections(act),
			stopover: true,
		}));
		map.panTo({ lat: avgLat - 0.07, lng: avgLng });
		map.setZoom(11.5);
		directionsService.route(
			{
				origin: origin,
				destination: destination,
				waypoints: waypoints,
				optimizeWaypoints: false,
				travelMode: google.maps.TravelMode.WALKING,
			},
			(result, status) => {
				if (status === "OK") {
					directionsRenderer.setDirections(result);
					addCustomMarkers(routeActivities, dayIndex);
				} else {
					console.error(`[ALL] 路線規劃失敗 (Day ${dayIndex + 1})`, {
						status: status,
						origin: origin,
						destination: destination,
						waypoints: waypoints,
						activities: routeActivities.map((a) => ({
							name: a.place_name,
							location: a.location,
							place_id: a.place_id,
						})),
					});
					addCustomMarkers(routeActivities, dayIndex);
				}
			},
		);
	});

	loadAllTimelineActivities();
}

// 顯示單一天的行程
function displayDay(dayIndex) {
	clearMapRoutes(); // 先清除舊路線
	const day = getActiveDays()[dayIndex];

	if (!day || !day.activities || day.activities.length < 2) {
		console.error("該日期沒有足夠的活動");
		return;
	}

	const { DirectionsService, DirectionsRenderer } = google.maps;

	const directionsService = new DirectionsService();
	const directionsRenderer = new DirectionsRenderer({
		map: map,
		suppressMarkers: true,
		polylineOptions: {
			strokeColor: getColorByDay(dayIndex),
			strokeWeight: 7,
			strokeOpacity: 0.9,
		},
	});

	currentRenderers.push(directionsRenderer);

	const activities = day.activities;
	const routeActivities = activities.filter((a) => isValidRouteLocation(a));

	// 先更新該天時間線，避免路線失敗時仍顯示全部內容
	loadSingleDayTimeline(day, dayIndex);

	const origin = getLocationForDirections(routeActivities[0]);
	const destination = getLocationForDirections(
		routeActivities[routeActivities.length - 1],
	);
	if (!origin || !destination) {
		addCustomMarkers(routeActivities, dayIndex);
		return;
	}

	const waypoints = routeActivities.slice(1, -1).map((act) => ({
		location: getLocationForDirections(act),
		stopover: true,
	}));

	directionsService.route(
		{
			origin: origin,
			destination: destination,
			waypoints: waypoints,
			optimizeWaypoints: false,
			travelMode: google.maps.TravelMode.WALKING,
		},
		(result, status) => {
			if (status === "OK") {
				directionsRenderer.setDirections(result);
				addCustomMarkers(routeActivities, dayIndex);
				setTimeout(() => {
					map.panBy(0, 180);
				}, 150);
			} else {
				console.error(`路線規劃失敗 (Day ${dayIndex + 1})`, {
					status: status,
					origin: origin,
					destination: destination,
					waypoints: waypoints,
					activities: routeActivities.map((a) => ({
						name: a.place_name,
						location: a.location,
						place_id: a.place_id,
					})),
				});
				addCustomMarkers(routeActivities, dayIndex);
			}
		},
	);
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

		const { Map } = await google.maps.importLibrary("maps");
		map = new Map(document.getElementById("map"), {
			zoom: 10,
			center: { lat: avgLat, lng: avgLng },
			mapId: "DEMO_MAP_ID",
			fullscreenControl: false,
			mapTypeControl: false,
		});

		map.addListener("click", () => {
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
		script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=routes&loading=async`;
		script.async = true;
		document.head.appendChild(script);
	});

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
