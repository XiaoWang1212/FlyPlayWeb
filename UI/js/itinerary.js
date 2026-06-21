// ===== 行程資料載入與處理 =====

// 根據建立行程時選擇的開始日期，計算「第 N 天」對應的星期幾
function getWeekdayLabel(dayNumber) {
	const tripSetup = JSON.parse(localStorage.getItem("tripSetup") || "{}");
	const startDate =
		localStorage.getItem("currentItineraryStartDate") ||
		tripSetup.startDate ||
		"";

	const parts = String(startDate).split("-").map(Number);
	if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "";

	// 第1天保留給搭機日，行程實際從開始日期的次日算起，
	// 故第 N 天對應「開始日期 + N」天
	const date = new Date(parts[0], parts[1] - 1, parts[2]);
	date.setDate(date.getDate() + Number(dayNumber));

	const weekdayLabels = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	return weekdayLabels[date.getDay()];
}

// 第一階段：先加載坐標信息（供給 localStorage 的 generatedItinerary）
async function loadCoordinatesFirst() {
	try {
		console.log("載入坐標信息...");

		// 從 localStorage 中獲取行程 ID
		const generatedItinerary = localStorage.getItem("generatedItinerary");
		if (!generatedItinerary) {
			console.warn("未找到 generatedItinerary");
			return false;
		}

		const itineraryData = JSON.parse(generatedItinerary);
		const itinerary_id = itineraryData.itinerary_id || itineraryData.id;

		if (!itinerary_id) {
			console.warn("未找到 itinerary_id");
			return false;
		}

		console.log(`使用 itinerary_id: ${itinerary_id} 加載行程`);

		// 若 localStorage 已有同一 itinerary 的座標，直接使用不重新打 API
		const cached = localStorage.getItem("data_latlng");
		if (cached) {
			try {
				const cachedData = JSON.parse(cached);
				const cachedId =
					cachedData?.itinerary_id ||
					cachedData?.meta?.itinerary_id;
				if (cachedId && String(cachedId) === String(itinerary_id)) {
					console.log("使用快取的 data_latlng，跳過 API 呼叫");
					allDays = cachedData.data.map((dayData) => ({
						day: dayData.day,
						weekday: dayData.weekday || `第${dayData.day}天`,
						activities: (dayData.locations || []).map((loc) => ({
							place_name: loc.location_name,
							location: {
								lat: loc.location?.latitude || 0,
								lng: loc.location?.longitude || 0,
							},
							place_id: loc.place_id || "",
							time: loc.time || "",
							description: "",
							type: "",
							cost: "",
						})),
					}));
					return true;
				}
			} catch (_) {}
		}

		// 調用後端 API 獲取行程數據
		const response = await fetch(`${API_BASE}/data/latlng`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				itinerary_id: itinerary_id,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.error || "獲取行程失敗");
		}

		// 存進 localStorage
		localStorage.setItem("data_latlng", JSON.stringify(result));
		console.log("坐標數據已存入 localStorage");

		// 從 /data/latlng 的結果構建臨時行程數據結構
		allDays = result.data.map((dayData) => {
			return {
				day: dayData.day,
				weekday: dayData.weekday || `第${dayData.day}天`,
				activities: dayData.locations.map((loc) => ({
					place_name: loc.location_name,
					location: {
						lat: loc.location.latitude || 0,
						lng: loc.location.longitude || 0,
					},
					place_id: loc.place_id || "",
					time: loc.time || "",
					description: "",
					type: "",
					cost: "",
				})),
			};
		});

		console.log("坐標已載入", allDays);
		return true;
	} catch (error) {
		console.error("載入坐標失敗：", error);
		return false;
	}
}

// 通過Gemini補充詳細信息
async function getDetailedItineraryFromDb(itineraryId) {
	try {
		const token = localStorage.getItem("userToken");
		const projectId = Number(
			sessionStorage.getItem("currentProjectId") ||
				localStorage.getItem("currentProjectId") ||
				0,
		);

		if (!token || !projectId || !itineraryId) return null;

		const res = await fetch(
			`${API_BASE}/api/travel/itineraries/${projectId}`,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			},
		);
		const body = await res.json().catch(() => ({}));
		if (redirectToLoginIfUnauthorized(res.status, body)) return null;
		if (!res.ok) return null;
		if (body.code !== 200 || !Array.isArray(body.data)) return null;

		const row = body.data.find(
			(item) => Number(item.itinerary_id) === Number(itineraryId),
		);
		const detailed = row?.detailed_itinerary;

		if (
			detailed &&
			typeof detailed === "object" &&
			(
				(Array.isArray(detailed.parsed?.days) && detailed.parsed.days.length > 0) ||
				(Array.isArray(detailed.days) && detailed.days.length > 0)
			)
		) {
			return detailed;
		}

		return null;
	} catch (e) {
		console.warn("查詢 DB detailed_itinerary 失敗:", e);
		return null;
	}
}

async function generateDetailedItinerary() {
	try {
		const generatedItinerary = localStorage.getItem("generatedItinerary");
		const itineraryInfo = generatedItinerary ? JSON.parse(generatedItinerary) : null;
		const itineraryId =
			itineraryInfo?.itinerary_id ||
			itineraryInfo?.id ||
			Number(localStorage.getItem("currentItineraryId")) ||
			null;

		const dbDetailed = await getDetailedItineraryFromDb(itineraryId);
		if (!dbDetailed) {
			console.warn("⚠️ DB 無 detailed_itinerary");
			return false;
		}

		console.log("✓ DB detailed_itinerary 載入成功");
		localStorage.setItem("detailed_itinerary", JSON.stringify(dbDetailed));

		const daysSource = dbDetailed?.parsed?.days || dbDetailed?.days || [];
		if (!Array.isArray(daysSource) || !daysSource.length) return false;

		// 將 allDays 座標合併進 detailed 資料
		const mergedDays = daysSource.map((day, dayIndex) => {
			const currentDay = allDays.find(
				(d, idx) => Number(d?.day) === Number(day?.day) || idx === dayIndex,
			);
			const currentActivities = Array.isArray(currentDay?.activities)
				? currentDay.activities
				: [];

			const list = day.location || day.activities || [];
			const normalizedList = list.map((item, itemIndex) => {
				let matched = currentActivities.find((a) => a?.place_name === item?.place_name);
				if (!matched) matched = currentActivities[itemIndex];
				return { ...item, location: item.location || matched?.location || null };
			});

			return Array.isArray(day.location)
				? { ...day, location: normalizedList }
				: { ...day, activities: normalizedList };
		});

		allDays = convertToAllDaysFormat(mergedDays);
		createDayButtons();
		if (currentDayIndex === -1) displayAllDays();
		else displayDay(currentDayIndex);
		return true;
	} catch (error) {
		console.error("載入詳細行程失敗：", error);
		return false;
	}
}

// 補充圖片信息
async function enrichWithPictureInfo(detailedData) {
	try {
		console.log("第三步：調用 /api/itinerary 補充圖片信息");

		const itineraryId =
			Number(localStorage.getItem("currentItineraryId")) ||
			Number(
				(() => {
					try {
						const raw = localStorage.getItem("generatedItinerary");
						if (!raw) return 0;
						const parsed = JSON.parse(raw);
						return parsed?.itinerary_id || parsed?.id || 0;
					} catch (_) {
						return 0;
					}
				})(),
			) ||
			null;

		const daysSource =
			detailedData?.parsed?.days || detailedData?.days || [];
		if (!Array.isArray(daysSource) || daysSource.length === 0) {
			console.warn("沒有可補圖的 days 資料");
			return false;
		}

		// 若 allDays 內所有景點都已有圖片與有效座標，跳過 API 呼叫
		if (Array.isArray(allDays) && allDays.length > 0) {
			const allEnriched = allDays.every((day) =>
				(day.activities || []).every((act) => {
					const hasPhoto = !!(act.photo_url || "").trim();
					const loc = act.location;
					const hasLoc = loc && loc.lat != null && loc.lat !== 0 && loc.lng != null && loc.lng !== 0;
					return hasPhoto && hasLoc;
				})
			);
			if (allEnriched) {
				console.log("所有景點已有圖片與座標，跳過 enrichWithPictureInfo");
				return true;
			}
		}

		// 以目前 allDays 的座標回填到 detailed days，避免補圖後丟失地圖座標
		const daysWithLocation = daysSource.map((day, dayIndex) => {
			const currentDay = allDays.find(
				(d, idx) =>
					Number(d?.day) === Number(day?.day) || idx === dayIndex,
			);
			const currentActivities = Array.isArray(currentDay?.activities)
				? currentDay.activities
				: [];

			const list = day.location || day.activities || [];
			const normalizedList = list.map((item, itemIndex) => {
				let matched = currentActivities.find(
					(a) => a?.place_name === item?.place_name,
				);
				if (!matched) matched = currentActivities[itemIndex];

				return {
					...item,
					location: item.location || matched?.location || null,
				};
			});

			if (Array.isArray(day.location)) {
				return { ...day, location: normalizedList };
			}
			return { ...day, activities: normalizedList };
		});

		// 讀 _build_spot_image_cards 存的快取（nearby search 結果）
		let spotImagesCache = [];
		try {
			const raw = localStorage.getItem("spotImagesCache");
			if (raw) spotImagesCache = JSON.parse(raw);
		} catch (_) {}

		// 先POST保存到後端
		const response = await fetch(`${API_BASE}/api/itinerary`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				days: daysWithLocation,
				itinerary_id: itineraryId,
				spot_images_cache: spotImagesCache,
			}),
		});
		if (!response.ok) {
			throw new Error(`POST 失敗 ${response.status}`);
		}

		const result = await response.json();
		if (result.code !== 200 || !Array.isArray(result?.data?.days)) {
			throw new Error(result.error || "圖片補充回傳格式錯誤");
		}

		console.log("✓ 圖片信息已補充");
		localStorage.removeItem("spotImagesCache");

		// 轉換為 allDays 格式並更新畫面
		allDays = convertToAllDaysFormat(result.data.days);
		createDayButtons();
		if (currentDayIndex === -1) {
			displayAllDays();
		} else {
			displayDay(currentDayIndex);
		}

		return true;
	} catch (error) {
		console.error("補充圖片信息失敗：", error);
		return false;
	}
}

// 轉換為 allDays 期望的格式
function convertToAllDaysFormat(days) {
	if (!days) return [];

	return days.map((day) => ({
		day: day.day,
		weekday: day.weekday,
		activities: (day.location || day.activities || []).map((item) => ({
			time: item.time,
			place_name: item.place_name,
			description: item.description || "",
			type: item.type || "景點",
			cost: item.cost || "未知",
			location: item.location || null,
			photo_url: item.photo_url || (Array.isArray(item.photos) && item.photos[0]?.photo_url) || "",
			photos: item.photos,
			rating: item.rating,
			address: item.address,
			phone: item.phone,
		})),
	}));
}

function normalizeItineraryRowToAllDays(item) {
	if (!item || typeof item !== "object") return [];

	const rawLatLng =
		item?.data_latlng?.data && Array.isArray(item.data_latlng.data)
			? item.data_latlng.data
			: Array.isArray(item?.data_latlng)
				? item.data_latlng
				: [];

	const mergeDaysWithLatLng = (daysSource) => {
		const days = convertToAllDaysFormat(daysSource);
		if (!Array.isArray(days) || !days.length) return [];

		if (!rawLatLng.length) return days;

		return days.map((day, dayIndex) => {
			const dayLatLng =
				rawLatLng.find((d) => Number(d?.day) === Number(day?.day)) ||
				rawLatLng[dayIndex];
			const locations = Array.isArray(dayLatLng?.locations)
				? dayLatLng.locations
				: [];

			return {
				...day,
				activities: (day.activities || []).map((activity, actIndex) => {
					const hasValidLocation =
						activity?.location &&
						typeof activity.location.lat === "number" &&
						typeof activity.location.lng === "number" &&
						!(
							activity.location.lat === 0 &&
							activity.location.lng === 0
						);

					if (hasValidLocation) return activity;

					let matched = locations.find(
						(loc) => loc?.location_name === activity?.place_name,
					);
					if (!matched) matched = locations[actIndex];

					if (!matched?.location) return activity;

					return {
						...activity,
						location: {
							lat:
								typeof matched.location.latitude === "number"
									? matched.location.latitude
									: null,
							lng:
								typeof matched.location.longitude === "number"
									? matched.location.longitude
									: null,
						},
					};
				}),
			};
		});
	};

	const fromDetailedParsed = item?.detailed_itinerary?.parsed?.days;
	if (Array.isArray(fromDetailedParsed) && fromDetailedParsed.length > 0) {
		return mergeDaysWithLatLng(fromDetailedParsed);
	}

	const fromDetailedDays = item?.detailed_itinerary?.days;
	if (Array.isArray(fromDetailedDays) && fromDetailedDays.length > 0) {
		return mergeDaysWithLatLng(fromDetailedDays);
	}

	const fromDataJson = item?.data_json?.days;
	if (Array.isArray(fromDataJson) && fromDataJson.length > 0) {
		return mergeDaysWithLatLng(fromDataJson);
	}

	if (rawLatLng.length > 0) {
		return rawLatLng.map((dayObj) => ({
			day: dayObj.day,
			weekday: dayObj.weekday || `第${dayObj.day}天`,
			activities: (dayObj.locations || []).map((loc) => ({
				place_name: loc.location_name,
				location: {
					lat:
						typeof loc?.location?.latitude === "number"
							? loc.location.latitude
							: null,
					lng:
						typeof loc?.location?.longitude === "number"
							? loc.location.longitude
							: null,
				},
				time: "",
				description: "",
				type: "",
				cost: "",
			})),
		}));
	}

	return [];
}
