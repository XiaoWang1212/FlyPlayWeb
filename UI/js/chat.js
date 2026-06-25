// ===== 聊天功能 =====

let conversationHistory = [];
let hasShownChatWelcome = false;
let hasHiddenChatSuggestions = false;
let _chatAbortController = null;
let _chatTypingAborted = false;

function setChatResponding(responding) {
	const btn = document.getElementById("chatSendBtn");
	if (!btn) return;
	const icon = btn.querySelector("i");
	if (responding) {
		if (icon) icon.className = "fas fa-stop";
		btn.style.borderRadius = "50%";
		btn.style.background = "var(--color-primary)";
		btn.classList.add("is-responding");
		_hideChatSuggestionsTemp();
	} else {
		if (icon) icon.className = "fas fa-paper-plane";
		btn.style.borderRadius = "";
		btn.style.background = "";
		btn.classList.remove("is-responding");
		if (!hasHiddenChatSuggestions) {
			showChatSuggestions();
		}
	}
}

function stopChatResponse() {
	if (_chatAbortController) {
		_chatAbortController.abort();
		_chatAbortController = null;
	}
	_chatTypingAborted = true;
	setChatResponding(false);
	showChatSuggestions();
}

const CHAT_FLOW_TRANSITION_DELAY_MS = 3000;

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getChatCurrentItinerary() {
	if (Array.isArray(allDays) && allDays.length > 0) {
		return allDays;
	}

	const detailedRaw = localStorage.getItem("detailed_itinerary");
	if (detailedRaw) {
		try {
			const detailed = JSON.parse(detailedRaw);
			const days = detailed?.parsed?.days || detailed?.days;
			if (Array.isArray(days) && days.length > 0) {
				return days.map((day) => ({
					day: day.day,
					weekday: day.weekday,
					activities: day.location || day.activities || [],
				}));
			}
		} catch (_) {}
	}

	return [];
}

function _mergeSpotPhotosToLocalItinerary(spotImages) {
	if (!Array.isArray(spotImages) || spotImages.length === 0) return;

	const photoMap = {};
	for (const img of spotImages) {
		const name = (img.name || "").trim();
		const url = (img.photo_url || "").trim();
		if (name && url) photoMap[name] = img;
	}

	// 更新 allDays (in-memory)
	if (Array.isArray(allDays)) {
		for (const day of allDays) {
			for (const act of (day.activities || [])) {
				const name = (act.place_name || act.location_name || act.name || "").trim();
				if (name && photoMap[name] && !act.photo_url) {
					act.photo_url = photoMap[name].photo_url;
					if (photoMap[name].address) act.address = photoMap[name].address;
					if (photoMap[name].place_id) act.place_id = photoMap[name].place_id;
					if (photoMap[name].location) {
						const loc = photoMap[name].location;
						const curLoc = act.location;
						const hasValidLoc = curLoc && curLoc.lat != null && curLoc.lat !== 0 && curLoc.lng != null && curLoc.lng !== 0;
						if (!hasValidLoc) act.location = loc;
					}
				}
			}
		}
	}

}

function buildUpdatedDetailed(days) {
	const detailedRaw = localStorage.getItem("detailed_itinerary");
	if (!detailedRaw) return null;
	let detailed;
	try { detailed = JSON.parse(detailedRaw); } catch (_) { return null; }

	const daysSource = detailed?.parsed?.days || detailed?.days || [];

	// 建立 place_name → 富資料 的查找表（AI 描述、費用、電話等）
	const richByName = {};
	for (const day of daysSource) {
		const list = (Array.isArray(day.location) && day.location.length ? day.location : null) || day.activities || [];
		for (const item of list) {
			const name = (item.place_name || item.location_name || "").trim();
			if (name) richByName[name] = item;
		}
	}

	// 以 allDays 為主結構重建每天活動：保留舊景點的富資料，新景點補上搜尋得到的資料
	const updatedDays = days.map((day) => {
		const activities = (day.activities || []).map((act) => {
			const name = (act.place_name || act.location_name || act.name || "").trim();
			const rich = richByName[name] || {};
			return {
				...rich,
				place_name: name || rich.place_name || "",
				place_id: act.place_id || rich.place_id || "",
				location: act.location || rich.location || null,
				time: act.time || rich.time || "",
				photo_url: act.photo_url || act.photos?.[0]?.photo_url || rich.photo_url || "",
				photos: act.photos?.length ? act.photos : (rich.photos || []),
				address: act.address || rich.address || "",
				rating: act.rating ?? rich.rating ?? null,
				description: rich.description || act.description || "",
				cost: rich.cost || act.cost || "",
				type: rich.type || act.type || "",
			};
		});
		return { day: day.day, weekday: day.weekday || `第${day.day}天`, activities };
	});

	if (detailed?.parsed?.days) {
		return { ...detailed, parsed: { ...detailed.parsed, days: updatedDays } };
	}
	return { ...detailed, days: updatedDays };
}

async function saveItineraryToDb(days) {
	const itineraryId = localStorage.getItem("currentItineraryId");
	const token = localStorage.getItem("userToken");
	if (!itineraryId) { console.warn("[saveItineraryToDb] 缺少 currentItineraryId"); return; }
	if (!token) { console.warn("[saveItineraryToDb] 缺少 userToken"); return; }
	if (!Array.isArray(days) || days.length === 0) { console.warn("[saveItineraryToDb] days 為空", days); return; }
	try {
		const serialized = serializeChatItinerary(days);
		const updatedDetailed = buildUpdatedDetailed(days);
		const body = { data_latlng: serialized };
		if (updatedDetailed) body.detailed_itinerary = updatedDetailed;

		console.log("[saveItineraryToDb] 送出儲存，itineraryId:", itineraryId, "days:", days.length, "天");
		const res = await fetch(`${API_BASE}/api/travel/itinerary/${itineraryId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			const text = await res.text();
			console.error("[saveItineraryToDb] 後端錯誤", res.status, text);
		} else {
			console.log("[saveItineraryToDb] 儲存成功", res.status);
			localStorage.setItem("data_latlng", JSON.stringify({ ...serialized, itinerary_id: itineraryId }));
			if (updatedDetailed) localStorage.setItem("detailed_itinerary", JSON.stringify(updatedDetailed));
		}
	} catch (err) {
		console.error("[saveItineraryToDb] 網路錯誤", err);
	}
}

function serializeChatItinerary(days) {
	return {
		data: (days || []).map((day) => ({
			day: day.day,
			weekday: day.weekday || `第${day.day}天`,
			locations: (day.activities || []).map((activity) => ({
				location_name:
					activity.place_name || activity.location_name || activity.name || "",
				place_id: activity.place_id || "",
				location: activity.location || null,
				time: activity.time || "",
				cost: activity.cost || "",
				photo_url: activity.photo_url || activity.photos?.[0]?.photo_url || "",
				address: activity.address || "",
				rating: activity.rating ?? null,
			})),
		})),
	};
}

function persistChatItinerary(days) {
	if (!Array.isArray(days) || days.length === 0) return;

	const _serialized = serializeChatItinerary(days);
	const _itineraryId = localStorage.getItem("currentItineraryId");
	if (_itineraryId) _serialized.itinerary_id = _itineraryId;
	localStorage.setItem("data_latlng", JSON.stringify(_serialized));

	const detailedRaw = localStorage.getItem("detailed_itinerary");
	if (detailedRaw) {
		try {
			const detailed = JSON.parse(detailedRaw);
			if (detailed?.parsed && Array.isArray(detailed.parsed.days)) {
				detailed.parsed.days = days;
			} else if (Array.isArray(detailed?.days)) {
				detailed.days = days;
			} else {
				detailed.days = days;
			}
			localStorage.setItem("detailed_itinerary", JSON.stringify(detailed));
		} catch (_) {}
	}

	const generatedRaw = localStorage.getItem("generatedItinerary");
	if (generatedRaw) {
		try {
			const generated = JSON.parse(generatedRaw);
			if (generated?.parsed && Array.isArray(generated.parsed.days)) {
				generated.parsed.days = days;
			}
			localStorage.setItem("generatedItinerary", JSON.stringify(generated));
		} catch (_) {}
	}

	saveItineraryToDb(days);
}

function applyChatItineraryUpdate(parsed) {
	const targetDay = Number(parsed?.target_day || parsed?.day || 0);
	const updatedDay = parsed?.updated_day || parsed?.day_data || parsed?.updatedDay;
	if (!targetDay || !updatedDay) return false;

	const nextDays = JSON.parse(JSON.stringify(getChatCurrentItinerary()));
	if (!Array.isArray(nextDays) || nextDays.length === 0) return false;

	const targetIndex = nextDays.findIndex(
		(day, index) => Number(day?.day) === targetDay || index === targetDay - 1,
	);
	if (targetIndex === -1) return false;

	const previousDay = nextDays[targetIndex] || {};
	const previousActivities = Array.isArray(previousDay.activities)
		? previousDay.activities
		: [];
	const nextActivities = Array.isArray(updatedDay.activities)
		? updatedDay.activities.map((activity, index) => ({
			...previousActivities[index],
			...activity,
			location: activity.location || previousActivities[index]?.location || null,
		}))
		: previousActivities;

	nextDays[targetIndex] = {
		...previousDay,
		...updatedDay,
		day: Number(updatedDay.day || targetDay),
		weekday: updatedDay.weekday || previousDay.weekday,
		activities: nextActivities,
	};

	allDays = nextDays;
	persistChatItinerary(nextDays);

	if (typeof createDayButtons === "function") {
		createDayButtons();
	}
	// 重新繪製地圖路線、標記與時間線
	if (typeof refreshItineraryView === "function") {
		refreshItineraryView();
	}

	return true;
}

const ITINERARY_EDIT_FLOW_KEY = "itineraryEditFlow";

function readItineraryEditFlow() {
	try {
		return JSON.parse(localStorage.getItem(ITINERARY_EDIT_FLOW_KEY) || "null");
	} catch (_) {
		return null;
	}
}

function writeItineraryEditFlow(flowState) {
	if (!flowState) {
		localStorage.removeItem(ITINERARY_EDIT_FLOW_KEY);
		return;
	}
	localStorage.setItem(ITINERARY_EDIT_FLOW_KEY, JSON.stringify(flowState));
}

function clearItineraryEditFlow() {
	localStorage.removeItem(ITINERARY_EDIT_FLOW_KEY);
}

function pushConversationMessage(role, content) {
	conversationHistory.push({ role, content });
}

function resetChatConversation() {
	conversationHistory = [];
	hasShownChatWelcome = false;
	hasHiddenChatSuggestions = false;
	localStorage.removeItem("pendingChatOutput");
	localStorage.removeItem("lastChatSuggestion");
	localStorage.removeItem("itineraryEditFlow");
	sessionStorage.removeItem("chatIntroShownProjectId");
	const chatMessages = document.getElementById("chatMessages");
	if (chatMessages) {
		chatMessages.innerHTML = "";
	}
	const chatSuggestions = document.getElementById("chatSuggestions");
	if (chatSuggestions) {
		chatSuggestions.classList.remove("suggestions-hidden");
	}
}

function showChatSuggestions() {
	const chatSuggestions = document.getElementById("chatSuggestions");
	if (!chatSuggestions) return;
	chatSuggestions.classList.remove("suggestions-hidden");
	hasHiddenChatSuggestions = false;
}

function buildChatInitialMessage(projectTitle) {
	const tripContext = buildChatTripContext();
	const tripDays = Array.isArray(allDays) ? allDays.length : 0;
	const title = String(projectTitle || sessionStorage.getItem("currentProjectTitle") || "目前行程").trim();
	const destination = tripContext.destination || "";
	const daysText = tripContext.days || (tripDays > 0 ? `${tripDays} 天` : "");
	const summaryParts = [
		`已載入「${title}行程」`,
		destination ? `目的地是 ${destination}` : "",
		daysText ? `共有 ${daysText} 天 ` : "",
	].filter(Boolean);

	return `${summaryParts.join("，")}。點擊下方建議問題，或直接輸入你想對行程做的修改，我都會盡力協助你！`;
}

function queueChatInitialMessage(message) {
	const text = String(message || "").trim();
	if (!text) return false;
	localStorage.setItem("pendingChatOutput", text);
	return true;
}

async function showProjectChatIntroIfNeeded() {
	const chatMessages = document.getElementById("chatMessages");
	if (!chatMessages || chatMessages.children.length > 0) return false;

	const projectId = String(
		sessionStorage.getItem("currentProjectId") || localStorage.getItem("currentProjectId") || "",
	).trim();
	if (!projectId) return false;

	if (sessionStorage.getItem("chatIntroShownProjectId") === projectId) return false;
	if (localStorage.getItem("pendingChatOutput")) return false;

	const introMessage = buildChatInitialMessage(sessionStorage.getItem("currentProjectTitle") || "");
	if (!introMessage) return false;

	await typeMessage(introMessage, "bot", CHAT_TYPEWRITER_SPEED_SLOW);
	conversationHistory.push({ role: "assistant", content: introMessage });
	sessionStorage.setItem("chatIntroShownProjectId", projectId);
	return true;
}

async function addBotMessage(content) {
	await appendMsg(content, "bot");
	pushConversationMessage("assistant", content);
}

function addUserMessage(content) {
	appendMsg(content, "user");
	pushConversationMessage("user", content);
}

function normalizeFlowText(text) {
	return String(text || "")
		.replace(/\s+/g, "")
		.toLowerCase();
}

function parseChineseNumberToken(token) {
	const normalized = String(token || "").replace(/兩/g, "二").trim();
	if (!normalized) return null;
	if (/^\d+$/.test(normalized)) {
		return Number(normalized);
	}

	const digitMap = {
		零: 0,
		一: 1,
		二: 2,
		三: 3,
		四: 4,
		五: 5,
		六: 6,
		七: 7,
		八: 8,
		九: 9,
	};

	if (Object.prototype.hasOwnProperty.call(digitMap, normalized)) {
		return digitMap[normalized];
	}

	if (normalized === "十") return 10;
	if (!normalized.includes("十")) return null;

	const [tenPart, onePart] = normalized.split("十");
	const tens = tenPart ? digitMap[tenPart] || 0 : 1;
	const ones = onePart ? digitMap[onePart] || 0 : 0;
	return tens * 10 + ones;
}

function extractDayNumberFromText(text) {
	const match = String(text || "").match(/第\s*([0-9一二三四五六七八九十百兩]+)\s*天/);
	if (!match) return null;
	const dayNumber = parseChineseNumberToken(match[1]);
	return Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : null;
}

function extractTargetItemFromText(text, dayNumber) {
	let cleaned = String(text || "");
	if (dayNumber) {
		const dayPattern = new RegExp(`第\\s*${dayNumber}\\s*天`, "g");
		cleaned = cleaned.replace(dayPattern, " ");
	}
	cleaned = cleaned
		.replace(/第\s*[0-9一二三四五六七八九十百兩]+\s*天/g, " ")
		.replace(/[，,。．.!！？?]/g, " ")
		.replace(/(請|我要|想要|想|幫我|把|將|修改|更改|調整|替換|新增|刪除|加入|行程|景點|哪個|那個|這個|的|到|第|天|上午|下午|晚上)/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return cleaned || "";
}

function extractFlowActionFromText(text) {
	const normalized = normalizeFlowText(text);
	if (!normalized) return null;
	if (/(新增|加入|添加|加進去|新增行程)/.test(normalized)) return "add";
	if (/(刪除|移除|刪掉|刪去|刪除行程)/.test(normalized)) return "delete";
	if (/(修改|更改|調整|替換|變更|修改行程)/.test(normalized)) return "update";
	return null;
}

function extractRecommendationMode(text) {
	const normalized = normalizeFlowText(text);
	if (!normalized) return null;
	if (/(ai|推薦|建議|幫我找|幫我推薦)/.test(normalized)) return "ai";
	if (/(自己|手動|我知道|我自己|自行|手動輸入)/.test(normalized)) return "manual";
	return null;
}

function buildChatTripContext() {
	const tripSetup = JSON.parse(localStorage.getItem("tripSetup") || "{}");
	const selectedDestinations = JSON.parse(
		localStorage.getItem("selectedDestinations") || "[]",
	);

	return {
		days: tripSetup.daysValue || tripSetup.daysLabel || "",
		destination: selectedDestinations
			.map((dest) => dest.city || dest.name || dest.label)
			.filter(Boolean)
			.join("、"),
		departure: tripSetup.departureLabel || tripSetup.departure || "",
		companion: tripSetup.companionLabel || tripSetup.companion || "",
		pace:
			tripSetup.pace ||
			tripSetup.tripPace ||
			tripSetup.morningDepartureLabel ||
			tripSetup.morningDeparture ||
			"",
		morningDeparture: tripSetup.morningDepartureLabel || tripSetup.morningDeparture || "",
		travelType:
			(tripSetup.travelTypeLabels || []).join("、") ||
			tripSetup.travelTypeLabel ||
			tripSetup.travelType ||
			"",
		startDate: tripSetup.startDate || "",
	};
}

function openEditModeForDay(targetDay) {
	const dayNumber = Number(targetDay || 0);

	if (dayNumber > 0 && Array.isArray(allDays) && allDays.length >= dayNumber) {
		const dayIdx = dayNumber - 1;
		const timelineBtn = document.querySelector(`#dayButtonContainer button[data-day-index="${dayIdx}"]`);
		if (timelineBtn) {
			switchDay(dayIdx, timelineBtn);
		} else {
			currentDayIndex = dayIdx;
			if (typeof displayDay === "function") displayDay(dayIdx);
		}
	}

	if (isChatMode && typeof toggleChatMode === "function") {
		toggleChatMode();
	}

	if (!isEditMode && typeof toggleEditMode === "function") {
		toggleEditMode();
	}

	if (typeof openSheet === "function") {
		openSheet();
	}
	if (typeof syncSheetState === "function") {
		syncSheetState("sheet-expanded");
	}
}

async function openEditModeWithSearchKeyword(keyword, targetDay, replaceTarget = null) {
	const searchKeyword = String(keyword || "").trim();
	const dayNumber = Number(targetDay || 0);

	if (dayNumber > 0 && Array.isArray(allDays) && allDays.length >= dayNumber) {
		const dayIdx = dayNumber - 1;
		const timelineBtn = document.querySelector(`#dayButtonContainer button[data-day-index="${dayIdx}"]`);
		if (timelineBtn) {
			switchDay(dayIdx, timelineBtn);
		} else {
			currentDayIndex = dayIdx;
			if (typeof displayDay === "function") displayDay(dayIdx);
		}
	}

	if (isChatMode && typeof toggleChatMode === "function") {
		await toggleChatMode();
	}

	if (!isEditMode && typeof toggleEditMode === "function") {
		toggleEditMode();
	}

	if (typeof openSpotSearchModal === "function") {
		openSpotSearchModal(searchKeyword, replaceTarget);
	}
}

function disablePickerContainer(el) {
	el.querySelectorAll("button").forEach((btn) => {
		btn.disabled = true;
	});
}

function appendCancelChipToRow(row) {
	const btn = document.createElement("button");
	btn.className = "chat-picker-chip chat-picker-chip--cancel";
	btn.textContent = "取消";
	btn.addEventListener("click", async () => {
		disablePickerContainer(row);
		btn.classList.add("selected");
		appendMsg("取消", "user");
		pushConversationMessage("user", "取消");
		clearItineraryEditFlow();
		await addBotMessage("已取消。若你想重新開始，可以再輸入「調整行程」。");
		showChatSuggestions();
	});
	row.appendChild(btn);
}

async function showDayPickerForDeleteMessage() {
	const days = getChatCurrentItinerary();
	if (!days.length) {
		await addBotMessage("目前沒有載入行程，請先確認行程已建立。");
		clearItineraryEditFlow();
		return;
	}
	const msgEl = await typeMessage("你想刪除第幾天的景點？", "bot", CHAT_TYPEWRITER_SPEED);
	conversationHistory.push({ role: "assistant", content: "你想刪除第幾天的景點？" });

	const row = document.createElement("div");
	row.className = "chat-picker-row";
	days.forEach((day) => {
		const dayNum = Number(day.day);
		const btn = document.createElement("button");
		btn.className = "chat-picker-chip";
		btn.textContent = `第 ${dayNum} 天${day.weekday ? `（${day.weekday}）` : ""}`;
		btn.addEventListener("click", async () => {
			disablePickerContainer(row);
			btn.classList.add("selected");
			appendMsg(`第 ${dayNum} 天`, "user");
			pushConversationMessage("user", `第 ${dayNum} 天`);

			const activeDays = getActiveDays();
			const dayIndex = activeDays.findIndex((d) => Number(d.day) === dayNum);
			const timelineBtn = document.querySelector(`#dayButtonContainer button[data-day-index="${dayIndex}"]`);
			if (timelineBtn && dayIndex >= 0) switchDay(dayIndex, timelineBtn);

			await showActivityPickerForDeleteMessage(dayNum);
		});
		row.appendChild(btn);
	});
	appendCancelChipToRow(row);
	msgEl.appendChild(row);
	scrollToBottom();
}

async function showActivityPickerForDeleteMessage(dayNum) {
	const days = getChatCurrentItinerary();
	const day = days.find((d) => Number(d.day) === dayNum);
	const activities = Array.isArray(day?.activities) ? day.activities : [];

	if (!activities.length) {
		await addBotMessage(`第 ${dayNum} 天目前沒有景點可刪除。`);
		clearItineraryEditFlow();
		showChatSuggestions();
		return;
	}

	const msgEl = await typeMessage(`第 ${dayNum} 天的景點如下，請選擇要刪除的：`, "bot", CHAT_TYPEWRITER_SPEED);
	conversationHistory.push({ role: "assistant", content: `第 ${dayNum} 天的景點如下，請選擇要刪除的：` });

	const list = document.createElement("div");
	list.className = "chat-activity-list";

	activities.forEach((activity, index) => {
		const name = activity.place_name || activity.location_name || activity.name || "未命名景點";
		const card = document.createElement("button");
		card.className = "chat-activity-card";

		const numEl = document.createElement("span");
		numEl.className = "chat-activity-num";
		numEl.textContent = String(index + 1);
		card.appendChild(numEl);

		const nameEl = document.createElement("span");
		nameEl.className = "chat-activity-name";
		nameEl.textContent = name;
		card.appendChild(nameEl);

		card.addEventListener("click", async () => {
			disablePickerContainer(list);
			card.classList.add("selected");
			appendMsg(name, "user");
			pushConversationMessage("user", name);
			clearItineraryEditFlow();

			deleteActivityFromDay(dayNum, index);
			await addBotMessage(`已將「${name}」從第 ${dayNum} 天刪除。`);
			showChatSuggestions();
		});

		list.appendChild(card);
	});

	msgEl.appendChild(list);
	scrollToBottom();
}

function deleteActivityFromDay(dayNum, actIndex) {
	const targetDays = (typeof isEditMode !== "undefined" && isEditMode && typeof editedDays !== "undefined" && editedDays) ? editedDays : allDays;
	const day = targetDays.find((d) => Number(d.day) === dayNum);
	if (!day || !Array.isArray(day.activities)) return;

	day.activities.splice(actIndex, 1);

	// 重新繪製地圖路線、標記與時間線
	if (typeof refreshItineraryView === "function") {
		refreshItineraryView();
	}

	saveItineraryToDb(allDays);
}

async function showDayPickerForAddMessage() {
	const days = getChatCurrentItinerary();
	if (!days.length) {
		await addBotMessage("目前沒有載入行程，請先確認行程已建立。");
		clearItineraryEditFlow();
		return;
	}
	const msgEl = await typeMessage("你想在第幾天新增景點？", "bot", CHAT_TYPEWRITER_SPEED);
	conversationHistory.push({ role: "assistant", content: "你想在第幾天新增景點？" });

	const row = document.createElement("div");
	row.className = "chat-picker-row";
	days.forEach((day) => {
		const dayNum = Number(day.day);
		const btn = document.createElement("button");
		btn.className = "chat-picker-chip";
		btn.textContent = `第 ${dayNum} 天${day.weekday ? `（${day.weekday}）` : ""}`;
		btn.addEventListener("click", async () => {
			disablePickerContainer(row);
			btn.classList.add("selected");
			appendMsg(`第 ${dayNum} 天`, "user");
			pushConversationMessage("user", `第 ${dayNum} 天`);
			clearItineraryEditFlow();
			await addBotMessage(`好的，我幫你打開第 ${dayNum} 天的新增介面，現在可以直接搜尋並加入景點。`);
			await wait(CHAT_FLOW_TRANSITION_DELAY_MS);
			openEditModeWithSearchKeyword("", dayNum);
		});
		row.appendChild(btn);
	});
	appendCancelChipToRow(row);
	msgEl.appendChild(row);
	scrollToBottom();
}

async function showDayPickerMessage() {
	const days = getChatCurrentItinerary();
	if (!days.length) {
		await addBotMessage("目前沒有載入行程，請先確認行程已建立。");
		clearItineraryEditFlow();
		return;
	}
	const msgEl = await typeMessage("請選擇你想修改第幾天：", "bot", CHAT_TYPEWRITER_SPEED);
	conversationHistory.push({ role: "assistant", content: "請選擇你想修改第幾天：" });
	appendDayPickerCards(msgEl, days);
}

async function showDayPickerForNearbyAttractions(isFood) {
	const days = getChatCurrentItinerary();
	if (!days.length) {
		await addBotMessage("目前沒有載入行程，請先確認行程已建立。");
		return;
	}
	const label = isFood ? "附近美食" : "附近熱門景點";
	const prompt = `你想查第幾天行程的${label}推薦？`;
	const msgEl = await typeMessage(prompt, "bot", CHAT_TYPEWRITER_SPEED);
	conversationHistory.push({ role: "assistant", content: prompt });

	const row = document.createElement("div");
	row.className = "chat-picker-row";
	days.forEach((day) => {
		const dayNum = Number(day.day);
		const btn = document.createElement("button");
		btn.className = "chat-picker-chip";
		btn.textContent = `第 ${dayNum} 天${day.weekday ? `（${day.weekday}）` : ""}`;
		btn.addEventListener("click", async () => {
			disablePickerContainer(row);
			btn.classList.add("selected");
			appendMsg(`第 ${dayNum} 天`, "user");
			pushConversationMessage("user", `第 ${dayNum} 天`);

			// 靜默切換 timeline 到對應天，讓後續「加入行程」加到正確的天
			const activeDays = getActiveDays();
			const dayIndex = activeDays.findIndex((d) => Number(d.day) === dayNum);
			const timelineBtn = document.querySelector(`#dayButtonContainer button[data-day-index="${dayIndex}"]`);
			if (timelineBtn && dayIndex >= 0) switchDay(dayIndex, timelineBtn);

			await fetchNearbyAttractions(dayNum, isFood);
		});
		row.appendChild(btn);
	});
	msgEl.appendChild(row);
	scrollToBottom();
}

async function fetchNearbyAttractions(dayNum, isFood) {
	const tripContext = buildChatTripContext();
	const currentItinerary = getChatCurrentItinerary();
	const itineraryId = localStorage.getItem("currentItineraryId") || null;
	const keyword = isFood ? "附近美食推薦" : "附近熱門景點";
	const message = `${keyword} 第${dayNum}天`;

	const loadingId = "loading-" + Date.now();
	document.getElementById("chatMessages").insertAdjacentHTML(
		"beforeend",
		`<div class="typing" id="${loadingId}"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`,
	);
	scrollToBottom();

	_chatTypingAborted = false;
	_chatAbortController = new AbortController();
	setChatResponding(true);
	try {
		const resp = await fetch(API_BASE + "/api/chat/message", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal: _chatAbortController.signal,
			body: JSON.stringify({
				message,
				conversationHistory,
				tripContext,
				currentItinerary,
				currentDayIndex: dayNum - 1,
				itineraryId,
			}),
		});

		const result = await resp.json();
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();

		if (result && (result.code === 200 || result.success === true)) {
			const data = result.data || result;
			const parsed = data.parsed;

			if (parsed && parsed.action === "nearby_attractions" && Array.isArray(parsed.attractions)) {
				// 卡片出現前先用 nearby 搜尋補上每個推薦景點的座標，
				// 並濾掉距離當天任一景點超過 40 公里的推薦。
				const spinnerEl = showChatLoadingSpinner();
				const nearbyAttractions = await filterNearbyAttractionsByDistance(
					parsed.attractions,
					parsed.target_day ?? dayNum,
				);
				removeChatLoadingSpinner(spinnerEl);

				if (!nearbyAttractions.length) {
					const emptyMsg = `第 ${dayNum} 天附近沒有距離合適的推薦，請再試一次或換一天看看。`;
					await appendMsg(emptyMsg, "bot");
					conversationHistory.push({ role: "assistant", content: emptyMsg });
					return;
				}

				const summary = parsed.summary || `以下是第 ${dayNum} 天所在區域的推薦：`;
				const msgEl = await typeMessage(summary, "bot", CHAT_TYPEWRITER_SPEED);
				conversationHistory.push({ role: "assistant", content: summary });
				appendNearbyAttractionCards(msgEl, nearbyAttractions, parsed.target_day ?? dayNum);
			} else {
				const aiText = (parsed?.question) || data.response || `抱歉，無法取得第 ${dayNum} 天的推薦，請再試一次。`;
				await appendMsg(aiText, "bot");
				conversationHistory.push({ role: "assistant", content: aiText });
			}
		} else {
			await appendMsg("伺服器錯誤: " + (result.message || result.error || "未知"), "bot");
		}
	} catch (err) {
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();
		if (err.name !== "AbortError") {
			await appendMsg("網路錯誤，請稍後再試", "bot");
		}
	} finally {
		_chatAbortController = null;
		_chatTypingAborted = false;
		setChatResponding(false);
	}
}

// 用 nearby（無錨點則改 general）搜尋取得景點座標，回傳 { lat, lng, place } 或 null
async function geocodeNearbySpotName(spotName, anchorLocation) {
	const name = String(spotName || "").trim();
	if (!name) return null;
	try {
		const authHeaders = {
			"Content-Type": "application/json",
			...(localStorage.getItem("userToken") && { Authorization: `Bearer ${localStorage.getItem("userToken")}` }),
		};
		const isValidCoord = (v) => typeof v === "number" && isFinite(v) && v !== 0;

		const extractCoord = (payload) => {
			const places = payload?.data?.places || [];
			if (!places.length) return null;
			const place = places[0];
			const lat = place.location?.lat ?? place.location?.latitude;
			const lng = place.location?.lng ?? place.location?.longitude;
			if (lat == null || lng == null) return null;
			return { lat: Number(lat), lng: Number(lng), place };
		};

		let result = null;
		// 有錨點先用 nearby（locationBias）搜尋
		if (anchorLocation && isValidCoord(anchorLocation.latitude) && isValidCoord(anchorLocation.longitude)) {
			try {
				const r = await fetch(`${API_BASE}/api/maps/search_nearby`, {
					method: "POST",
					headers: authHeaders,
					body: JSON.stringify({
						textQuery: name,
						location: { latitude: anchorLocation.latitude, longitude: anchorLocation.longitude },
						radius: 50000,
						languageCode: "zh-TW",
						maxResultCount: 1,
					}),
				});
				if (r.ok) result = extractCoord(await r.json());
			} catch (_) {}
		}
		// nearby 沒結果（含 locationBias 沒命中）就改用一般文字搜尋，務必取得真實座標
		if (!result) {
			const r = await fetch(`${API_BASE}/api/maps/search`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify({ textQuery: name, languageCode: "zh-TW", maxResultCount: 1 }),
			});
			if (r.ok) result = extractCoord(await r.json());
		}
		return result;
	} catch (err) {
		console.error("geocodeNearbySpotName error:", err);
		return null;
	}
}

// 先補上每個推薦景點的座標，並濾掉與當天任一景點距離超過 maxKm 公里的推薦。
// 為避免漏算：當天景點若沒存座標，會用名稱補搜出參考座標；解析不到座標的推薦一律剔除。
async function filterNearbyAttractionsByDistance(attractions, dayNum, maxKm = 40) {
	if (!Array.isArray(attractions) || attractions.length === 0) return [];

	const isValidCoord = (v) => typeof v === "number" && isFinite(v) && v !== 0;

	const days = getActiveDays();
	const targetDay = days.find((d, i) => Number(d.day) === Number(dayNum) || i === Number(dayNum) - 1);
	const activities = Array.isArray(targetDay?.activities) ? targetDay.activities : [];

	// 1) 收集當天已存的有效座標（排除空值與 0,0），其餘記下名稱稍後補搜
	const dayLocations = [];
	const namesNeedingGeocode = [];
	for (const a of activities) {
		const loc = normalizeActivityLocation(a?.location);
		if (loc && isValidCoord(loc.latitude) && isValidCoord(loc.longitude)) {
			dayLocations.push(loc);
		} else {
			const nm = (a?.place_name || a?.location_name || a?.name || "").trim();
			if (nm) namesNeedingGeocode.push(nm);
		}
	}

	// 2) 當天景點缺座標 → 用名稱補搜參考座標，確保有比較基準（否則會整批漏過濾）
	if (namesNeedingGeocode.length) {
		const refGeos = await Promise.all(
			namesNeedingGeocode.map((nm) => geocodeNearbySpotName(nm, dayLocations[0] || null)),
		);
		for (const g of refGeos) {
			if (g && isValidCoord(g.lat) && isValidCoord(g.lng)) {
				dayLocations.push({ latitude: g.lat, longitude: g.lng });
			}
		}
	}

	// 以當天最後一個有效座標作為 nearby 搜尋的錨點（locationBias）
	const anchor = dayLocations.length ? dayLocations[dayLocations.length - 1] : null;

	// 3) 解析每個推薦的真實座標
	const resolved = await Promise.all(
		attractions.map(async (spot) => {
			const geo = await geocodeNearbySpotName(spot?.name, anchor);
			if (geo) {
				spot.location = { lat: geo.lat, lng: geo.lng };
				// 保留完整 place，點擊卡片時直接沿用，不再重新搜尋（避免座標不一致）
				spot._place = geo.place;
			}
			return { spot, geo };
		}),
	);

	console.log("[nearbyFilter] 參考座標數:", dayLocations.length, dayLocations);

	// 完全拿不到任何當天參考座標時無法計算距離，保留全部（但仍補上座標）
	if (!dayLocations.length) {
		console.warn("[nearbyFilter] 當天無任何參考座標，無法過濾，全數保留");
		return resolved.map((r) => r.spot);
	}

	// 4) 與當天任一景點距離 > maxKm 即剔除；解析不到座標者也剔除（無法證明在範圍內）
	return resolved
		.filter(({ spot, geo }) => {
			if (!geo || !isValidCoord(geo.lat) || !isValidCoord(geo.lng)) {
				console.log(`[nearbyFilter] 剔除「${spot?.name}」：解析不到座標`);
				return false;
			}
			const maxDist = Math.max(
				...dayLocations.map((loc) => getDistance(geo.lat, geo.lng, loc.latitude, loc.longitude)),
			);
			const tooFar = maxDist > maxKm;
			console.log(`[nearbyFilter] 「${spot?.name}」(${geo.lat},${geo.lng}) 最遠 ${maxDist.toFixed(1)}km → ${tooFar ? "剔除" : "保留"}`);
			return !tooFar;
		})
		.map((r) => r.spot);
}

function appendNearbyAttractionCards(parentEl, attractions, dayNum) {
	if (!Array.isArray(attractions) || attractions.length === 0) return;

	const container = document.createElement("div");
	container.className = "chat-nearby-list";

	attractions.forEach((spot) => {
		const card = document.createElement("div");
		card.className = "chat-nearby-card chat-nearby-card--clickable";
		card.setAttribute("role", "button");
		card.setAttribute("tabindex", "0");

		const header = document.createElement("div");
		header.className = "chat-nearby-header";

		const name = document.createElement("span");
		name.className = "chat-nearby-name";
		name.textContent = spot.name || "景點";
		header.appendChild(name);

		if (spot.type) {
			const badge = document.createElement("span");
			badge.className = "chat-nearby-badge";
			badge.textContent = spot.type;
			header.appendChild(badge);
		}

		const mapIcon = document.createElement("span");
		mapIcon.className = "chat-nearby-map-hint";
		mapIcon.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
		header.appendChild(mapIcon);

		card.appendChild(header);

		if (spot.description) {
			const desc = document.createElement("div");
			desc.className = "chat-nearby-desc";
			desc.textContent = spot.description;
			card.appendChild(desc);
		}

		if (spot.estimated_time) {
			const time = document.createElement("div");
			time.className = "chat-nearby-time";
			const rawTime = String(spot.estimated_time);
			time.textContent = rawTime.startsWith("建議停留") ? rawTime : `建議停留 ${rawTime}`;
			card.appendChild(time);
		}

		card.addEventListener("click", () => showNearbySpotOnMap(spot, dayNum, card));
		card.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") showNearbySpotOnMap(spot, dayNum, card);
		});

		container.appendChild(card);
	});

	parentEl.appendChild(container);
	scrollToBottom();
}

async function showNearbySpotOnMap(attraction, dayNum, cardEl) {
	if (cardEl.classList.contains("is-loading")) return;
	cardEl.classList.add("is-loading");

	// 同時相容舊用法（傳字串）與新用法（傳整個 attraction 物件）
	const spotName = typeof attraction === "string" ? attraction : (attraction?.name || "");
	const prefetchedPlace = (attraction && typeof attraction === "object") ? attraction._place : null;

	try {
		const isValidCoord = (v) => typeof v === "number" && isFinite(v) && v !== 0;

		let place = null;

		// 優先沿用篩選階段已解析好的座標，確保地圖標示與過濾時用的是同一個地點
		if (prefetchedPlace) {
			const pLat = prefetchedPlace.location?.lat ?? prefetchedPlace.location?.latitude;
			const pLng = prefetchedPlace.location?.lng ?? prefetchedPlace.location?.longitude;
			if (isValidCoord(pLat) && isValidCoord(pLng)) place = prefetchedPlace;
		}

		// 沒有預存座標才重新搜尋（舊路徑）
		if (!place) {
			const days = getActiveDays();
			const targetDay = days.find((d, i) => Number(d.day) === Number(dayNum) || i === Number(dayNum) - 1);
			const activities = Array.isArray(targetDay?.activities) ? targetDay.activities : [];
			let anchorLocation = null;
			for (let i = activities.length - 1; i >= 0; i--) {
				const loc = normalizeActivityLocation(activities[i]?.location);
				if (loc && isValidCoord(loc.latitude) && isValidCoord(loc.longitude)) { anchorLocation = loc; break; }
			}

			const authHeaders = {
				"Content-Type": "application/json",
				...(localStorage.getItem("userToken") && { Authorization: `Bearer ${localStorage.getItem("userToken")}` }),
			};

			let response;
			if (anchorLocation) {
				response = await fetch(`${API_BASE}/api/maps/search_nearby`, {
					method: "POST",
					headers: authHeaders,
					body: JSON.stringify({
						textQuery: spotName,
						location: { latitude: anchorLocation.latitude, longitude: anchorLocation.longitude },
						radius: 20000,
						languageCode: "zh-TW",
						maxResultCount: 1,
					}),
				});
				// 若 nearby 失敗改走 general search
				if (!response.ok) response = null;
			}

			if (!response) {
				response = await fetch(`${API_BASE}/api/maps/search`, {
					method: "POST",
					headers: authHeaders,
					body: JSON.stringify({ textQuery: spotName, languageCode: "zh-TW", maxResultCount: 1 }),
				});
			}

			const payload = await response.json();
			const places = payload?.data?.places || [];
			if (!places.length) return;
			place = places[0];
		}

		const spot = {
			name: place.name || spotName,
			place_id: place.place_id,
			address: place.address || "",
			location: place.location,
			photo_url: place.photos?.[0]?.photo_url || "",
			photos: place.photos || [],
			rating: place.rating,
		};

		// 切回地圖
		if (isChatMode) toggleChatMode();

		selectedSpotForAdd = spot;
		openSpotInfoOnMap(spot, "載入中...", "載入中...");

		// 背景更新營業資訊
		const { openingHoursText, priceRangeText } = await getBusinessInfo(spot, "");
		if (selectedSpotForAdd === spot) {
			openSpotInfoOnMap(spot, openingHoursText, priceRangeText);
		}
	} catch (err) {
		console.error("showNearbySpotOnMap error:", err);
	} finally {
		cardEl.classList.remove("is-loading");
	}
}

function appendDayPickerCards(parentEl, days) {
	const row = document.createElement("div");
	row.className = "chat-picker-row";

	days.forEach((day) => {
		const dayNum = Number(day.day);
		const btn = document.createElement("button");
		btn.className = "chat-picker-chip";
		btn.textContent = `第 ${dayNum} 天${day.weekday ? `（${day.weekday}）` : ""}`;
		btn.addEventListener("click", () => {
			disablePickerContainer(row);
			btn.classList.add("selected");

			const activeDays = getActiveDays();
			const dayIndex = activeDays.findIndex((d) => Number(d.day) === dayNum);
			const timelineBtn = document.querySelector(`#dayButtonContainer button[data-day-index="${dayIndex}"]`);
			if (timelineBtn && dayIndex >= 0) switchDay(dayIndex, timelineBtn);

			handleDayCardSelected(dayNum, day);
		});
		row.appendChild(btn);
	});
	appendCancelChipToRow(row);

	parentEl.appendChild(row);
	scrollToBottom();
}

function handleDayCardSelected(dayNumber, dayData) {
	appendMsg(`第 ${dayNumber} 天`, "user");
	pushConversationMessage("user", `第 ${dayNumber} 天`);

	writeItineraryEditFlow({
		...readItineraryEditFlow(),
		stage: "pick_activity",
		targetDay: dayNumber,
	});

	void showActivityPickerMessage(dayNumber, dayData);
}

async function showActivityPickerMessage(dayNumber, dayData) {
	const activities = Array.isArray(dayData?.activities) ? dayData.activities : [];
	if (!activities.length) {
		await addBotMessage(`第 ${dayNumber} 天目前沒有行程，可以改用「新增」來加入景點。`);
		clearItineraryEditFlow();
		return;
	}
	const msgEl = await typeMessage(
		`第 ${dayNumber} 天的行程如下，請選擇你想修改的：`,
		"bot",
		CHAT_TYPEWRITER_SPEED,
	);
	conversationHistory.push({
		role: "assistant",
		content: `第 ${dayNumber} 天的行程如下，請選擇你想修改的：`,
	});
	appendActivityPickerCards(msgEl, activities, dayNumber);
}

function appendActivityPickerCards(parentEl, activities, dayNumber) {
	const list = document.createElement("div");
	list.className = "chat-activity-list";

	activities.forEach((activity, index) => {
		const name =
			activity.place_name || activity.location_name || activity.name || "未命名景點";

		const card = document.createElement("button");
		card.className = "chat-activity-card";

		const numEl = document.createElement("span");
		numEl.className = "chat-activity-num";
		numEl.textContent = String(index + 1);
		card.appendChild(numEl);

		const nameEl = document.createElement("span");
		nameEl.className = "chat-activity-name";
		nameEl.textContent = name;
		card.appendChild(nameEl);

		card.addEventListener("click", () => {
			disablePickerContainer(list);
			card.classList.add("selected");
			handleActivityCardSelected(dayNumber, name, index);
		});

		list.appendChild(card);
	});

	parentEl.appendChild(list);
	scrollToBottom();
}

function handleActivityCardSelected(dayNumber, targetItem, targetIndex = -1) {
	appendMsg(targetItem, "user");
	pushConversationMessage("user", targetItem);

	const flow = {
		...readItineraryEditFlow(),
		stage: "choose_mode",
		targetDay: dayNumber,
		targetItem,
		targetIndex,
	};
	writeItineraryEditFlow(flow);

	void showModePickerMessage(flow);
}

async function showModePickerMessage(flow) {
	const msgEl = await typeMessage(
		"你想要 AI 推薦新的景點，還是直接輸入你知道的景點名稱？",
		"bot",
		CHAT_TYPEWRITER_SPEED,
	);
	conversationHistory.push({
		role: "assistant",
		content: "你想要 AI 推薦新的景點，還是直接輸入你知道的景點名稱？",
	});
	appendModePickerCards(msgEl, flow);
}

function appendModePickerCards(parentEl, flow) {
	const row = document.createElement("div");
	row.className = "chat-picker-row";

	[
		{ label: "AI 推薦", mode: "ai" },
		{ label: "自己輸入", mode: "manual" },
	].forEach(({ label, mode }) => {
		const btn = document.createElement("button");
		btn.className = "chat-picker-chip";
		btn.textContent = label;
		btn.addEventListener("click", () => {
			disablePickerContainer(row);
			btn.classList.add("selected");
			void handleModeCardSelected(mode, flow);
		});
		row.appendChild(btn);
	});

	parentEl.appendChild(row);
	scrollToBottom();
}

function showChatLoadingSpinner() {
	const div = document.createElement("div");
	div.className = "chat-msg bot chat-loading-bubble";
	div.innerHTML = '<span class="chat-spinner"></span>';
	document.getElementById("chatMessages").appendChild(div);
	scrollToBottom();
	return div;
}

function removeChatLoadingSpinner(el) {
	if (el && el.parentNode) el.parentNode.removeChild(el);
}

async function handleModeCardSelected(mode, flow) {
	const label = mode === "ai" ? "AI 推薦" : "自己輸入";
	appendMsg(label, "user");
	pushConversationMessage("user", label);

	if (mode === "manual") {
		writeItineraryEditFlow({ ...flow, stage: "manual_spot_name" });
		await addBotMessage("請直接輸入你想加入的景點名稱，我會幫你打開編輯頁面並預填搜尋框。");
		return;
	}

	_chatTypingAborted = false;
	_chatAbortController = new AbortController();
	setChatResponding(true);
	const loadingEl = showChatLoadingSpinner();
	try {
		const tripContext = buildChatTripContext();
		const currentItinerary = getChatCurrentItinerary();
		const resp = await fetch(API_BASE + "/api/chat/itinerary-suggestion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal: _chatAbortController.signal,
			body: JSON.stringify({
				tripContext,
				currentItinerary,
				targetDay: flow.targetDay,
				targetItem: flow.targetItem,
			}),
		});

		const result = await resp.json();
		if (!(result && (result.code === 200 || result.success === true))) {
			throw new Error(result?.message || result?.error || "AI 推薦失敗");
		}

		const data = result.data || result;
		const parsed = data.parsed || {};
		const suggestedSpot =
			parsed.search_keyword ||
			parsed.suggested_spot ||
			parsed.spot_name ||
			parsed.place_name ||
			"";

		if (!suggestedSpot) {
			throw new Error(parsed.question || "AI 沒有回傳可用的景點名稱");
		}

		removeChatLoadingSpinner(loadingEl);
		clearItineraryEditFlow();

		// geocode 並在地圖上標示推薦景點（不自動跳轉畫面）
		const geocodedSpot = await geocodeSpotForReplace(suggestedSpot, flow.targetDay);
		if (geocodedSpot) {
			selectedSpotForAdd = geocodedSpot;
			openSpotInfoOnMap(geocodedSpot, "載入中...", "載入中...", { showAddButton: false });
			getBusinessInfo(geocodedSpot, "").then(({ openingHoursText, priceRangeText }) => {
				if (selectedSpotForAdd === geocodedSpot) openSpotInfoOnMap(geocodedSpot, openingHoursText, priceRangeText, { showAddButton: false });
			});
		}

		const msgEl = await typeMessage(
			`AI 推薦用「${suggestedSpot}」替換「${flow.targetItem}」，要換嗎？`,
			"bot",
			CHAT_TYPEWRITER_SPEED,
		);
		conversationHistory.push({ role: "assistant", content: `AI 推薦用「${suggestedSpot}」替換「${flow.targetItem}」，要換嗎？` });
		appendReplaceConfirmChips(msgEl, flow, geocodedSpot || { name: suggestedSpot });
	} catch (error) {
		removeChatLoadingSpinner(loadingEl);
		if (error.name !== "AbortError") {
			addBotMessage(`AI 推薦時發生問題：${error.message || error}。你也可以改用自己知道的景點名稱。`);
		}
	} finally {
		_chatAbortController = null;
		_chatTypingAborted = false;
		setChatResponding(false);
	}
}

async function geocodeSpotForReplace(spotName, dayNum) {
	try {
		const authHeaders = {
			"Content-Type": "application/json",
			...(localStorage.getItem("userToken") && { Authorization: `Bearer ${localStorage.getItem("userToken")}` }),
		};
		const isValidCoord = (v) => typeof v === "number" && isFinite(v) && v !== 0;

		const days = getActiveDays();
		const targetDay = days.find((d) => Number(d.day) === Number(dayNum));
		const activities = Array.isArray(targetDay?.activities) ? targetDay.activities : [];
		let anchorLocation = null;
		for (let i = activities.length - 1; i >= 0; i--) {
			const loc = normalizeActivityLocation(activities[i]?.location);
			if (loc) { anchorLocation = loc; break; }
		}

		let response;
		if (anchorLocation && isValidCoord(anchorLocation.lat) && isValidCoord(anchorLocation.lng)) {
			response = await fetch(`${API_BASE}/api/maps/search_nearby`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify({
					textQuery: spotName,
					location: { latitude: anchorLocation.lat, longitude: anchorLocation.lng },
					radius: 20000,
					languageCode: "zh-TW",
					maxResultCount: 1,
				}),
			});
			if (!response.ok) response = null;
		}
		if (!response) {
			response = await fetch(`${API_BASE}/api/maps/search`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify({ textQuery: spotName, languageCode: "zh-TW", maxResultCount: 1 }),
			});
		}
		const payload = await response.json();
		const places = payload?.data?.places || [];
		if (!places.length) return null;
		const place = places[0];
		return {
			name: place.name || spotName,
			place_id: place.place_id,
			address: place.address || "",
			location: place.location,
			photo_url: place.photos?.[0]?.photo_url || "",
			photos: place.photos || [],
			rating: place.rating,
		};
	} catch (err) {
		console.error("geocodeSpotForReplace error:", err);
		return null;
	}
}

function appendReplaceConfirmChips(parentEl, flow, newSpot) {
	const row = document.createElement("div");
	row.className = "chat-picker-row";

	const yesBtn = document.createElement("button");
	yesBtn.className = "chat-picker-chip";
	yesBtn.textContent = "是";
	yesBtn.addEventListener("click", async () => {
		disablePickerContainer(row);
		yesBtn.classList.add("selected");
		appendMsg("是", "user");
		pushConversationMessage("user", "是");
		replaceActivityInDay(flow.targetDay, flow.targetItem, newSpot, flow.targetIndex ?? -1);
		await addBotMessage(`已將「${flow.targetItem}」替換為「${newSpot.name}」。`);
		showChatSuggestions();
	});

	const noBtn = document.createElement("button");
	noBtn.className = "chat-picker-chip";
	noBtn.textContent = "否";
	noBtn.addEventListener("click", async () => {
		disablePickerContainer(row);
		noBtn.classList.add("selected");
		appendMsg("否", "user");
		pushConversationMessage("user", "否");
		await addBotMessage("好的，行程保持不變。");
		showChatSuggestions();
	});

	row.appendChild(yesBtn);
	row.appendChild(noBtn);
	parentEl.appendChild(row);
	scrollToBottom();
}

function replaceActivityInDay(dayNum, targetItemName, newSpot, targetIndex = -1) {
	const targetDays = (typeof isEditMode !== "undefined" && isEditMode && typeof editedDays !== "undefined" && editedDays)
		? editedDays
		: allDays;
	const day = targetDays.find((d) => Number(d.day) === dayNum);
	if (!day || !Array.isArray(day.activities)) return;

	const actIndex = (targetIndex >= 0 && targetIndex < day.activities.length)
		? targetIndex
		: day.activities.findIndex((a) => (a.place_name || a.location_name || a.name || "") === targetItemName);
	if (actIndex === -1) return;

	const oldActivity = day.activities[actIndex];
	let newLocation = null;
	if (newSpot.location) {
		const lat = newSpot.location.lat ?? newSpot.location.latitude;
		const lng = newSpot.location.lng ?? newSpot.location.longitude;
		if (lat != null && lng != null) newLocation = { lat: Number(lat), lng: Number(lng) };
	}

	day.activities[actIndex] = {
		...oldActivity,
		place_name: newSpot.name,
		location: newLocation || oldActivity.location,
		photo_url: newSpot.photo_url || oldActivity.photo_url || "",
		photos: newSpot.photos?.length ? newSpot.photos : oldActivity.photos,
		rating: newSpot.rating ?? oldActivity.rating,
		address: newSpot.address || oldActivity.address,
		place_id: newSpot.place_id || oldActivity.place_id,
	};

	// 重新繪製地圖與時間線（displayDay/displayAllDays 內部已會更新對應時間線）
	if (typeof refreshItineraryView === "function") {
		refreshItineraryView();
	}

	saveItineraryToDb(allDays);
}

function appendActionPickerCards(parentEl) {
	const row = document.createElement("div");
	row.className = "chat-picker-row";

	const actions = [
		{ label: "新增景點", value: "add" },
		{ label: "修改行程", value: "update" },
		{ label: "刪除景點", value: "delete" },
	];

	actions.forEach(({ label, value }) => {
		const btn = document.createElement("button");
		btn.className = "chat-picker-chip";
		btn.textContent = label;
		btn.addEventListener("click", () => {
			disablePickerContainer(row);
			btn.classList.add("selected");
			handleActionCardSelected(value, label);
		});
		row.appendChild(btn);
	});

	parentEl.appendChild(row);
	scrollToBottom();
}

async function handleActionCardSelected(action, label) {
	appendMsg(label, "user");
	pushConversationMessage("user", label);

	const currentFlow = readItineraryEditFlow();

	if (action === "add") {
		writeItineraryEditFlow({ ...currentFlow, action: "add", stage: "ask_day_for_add" });
		void showDayPickerForAddMessage();
		return;
	}

	if (action === "delete") {
		writeItineraryEditFlow({ ...currentFlow, action: "delete", stage: "ask_day_for_delete" });
		void showDayPickerForDeleteMessage();
		return;
	}

	writeItineraryEditFlow({ ...currentFlow, action: "update", stage: "pick_day" });
	void showDayPickerMessage();
}

async function startItineraryEditFlow() {
	hideChatSuggestions();
	writeItineraryEditFlow({
		stage: "choose_action",
		action: null,
		targetDay: null,
		targetItem: "",
	});
	const msgEl = await typeMessage("你想新增、修改、還是刪除行程？", "bot", CHAT_TYPEWRITER_SPEED);
	conversationHistory.push({ role: "assistant", content: "你想新增、修改、還是刪除行程？" });
	appendActionPickerCards(msgEl);
}

async function handleItineraryEditFlowInput(text) {
	const currentFlow = readItineraryEditFlow();
	if (!currentFlow) {
		if (/調整行程/.test(String(text || ""))) {
			addUserMessage(text);
			startItineraryEditFlow();
			return true;
		}
		if (/附近熱門景點|附近景點|附近熱門|周邊景點/.test(String(text || ""))) {
			addUserMessage(text);
			await showDayPickerForNearbyAttractions(false);
			return true;
		}
		if (/附近美食推薦|附近美食|附近餐廳/.test(String(text || ""))) {
			addUserMessage(text);
			await showDayPickerForNearbyAttractions(true);
			return true;
		}
		return false;
	}

	const flowText = String(text || "").trim();
	if (!flowText) return true;

	if (/^(取消|結束|退出|離開)$/.test(normalizeFlowText(flowText))) {
		clearItineraryEditFlow();
		addUserMessage(text);
		await addBotMessage("已取消修改行程流程。若你想重新開始，可以再輸入「修改行程」。");
		showChatSuggestions();
		return true;
	}

	if (currentFlow.stage === "choose_action" || currentFlow.stage === "ask_day_for_add" || currentFlow.stage === "ask_day_for_delete" || currentFlow.stage === "pick_day" || currentFlow.stage === "pick_activity" || currentFlow.stage === "choose_mode") {
		clearItineraryEditFlow();
		return false;
	}

	if (currentFlow.stage === "manual_spot_name") {
		const spotName = flowText.replace(/^[「"'【\[]|[」"'】\]]$/g, "").trim();
		if (!spotName) {
			addUserMessage(text);
			addBotMessage("請輸入你想加入的景點名稱。");
			return true;
		}

		// 此流程從 choose_mode 進入，一定是「修改行程」，選好地點後要替換 targetItem 而非新增。
		const targetDay = currentFlow.targetDay;
		const targetItem = currentFlow.targetItem;
		const targetIndex = currentFlow.targetIndex ?? -1;
		const hasTarget = targetItem || targetIndex >= 0;
		clearItineraryEditFlow();
		addUserMessage(text);
		await addBotMessage(
			hasTarget
				? `我已幫你打開編輯頁面，並把「${spotName}」放進搜尋框，選好地點後會替換「${targetItem}」。`
				: `我已幫你打開編輯頁面，並把「${spotName}」放進搜尋框。`,
		);
		await wait(CHAT_FLOW_TRANSITION_DELAY_MS);
		await openEditModeWithSearchKeyword(
			spotName,
			targetDay,
			hasTarget ? { targetItem, targetIndex } : null,
		);
		return true;
	}

	clearItineraryEditFlow();
	return false;
}


const CHAT_TYPEWRITER_SPEED = 20
const CHAT_TYPEWRITER_SPEED_SLOW = 20

// 逐字顯示訊息（打字機效果）
function appendSpotImageCards(parent, spotImages) {
	if (!Array.isArray(spotImages) || spotImages.length === 0) return;

	const gallery = document.createElement("div");
	gallery.className = "chat-spot-gallery";

	spotImages.forEach((spot) => {
		if (!spot || !spot.name) return;

		const card = document.createElement("div");
		card.className = "chat-spot-card";

		let imageEl;
		if (spot.photo_url) {
			imageEl = document.createElement("img");
			imageEl.className = "chat-spot-image";
			imageEl.src = spot.photo_url;
			imageEl.alt = spot.name || "景點圖片";
			imageEl.loading = "lazy";
			imageEl.referrerPolicy = "no-referrer";
			imageEl.onerror = () => {
				const placeholder = document.createElement("div");
				placeholder.className = "chat-spot-image chat-spot-no-photo";
				placeholder.textContent = "📷";
				imageEl.replaceWith(placeholder);
			};
		} else {
			imageEl = document.createElement("div");
			imageEl.className = "chat-spot-image chat-spot-no-photo";
			imageEl.textContent = "📷";
		}

		const title = document.createElement("div");
		title.className = "chat-spot-title";
		title.textContent = spot.name || "景點";

		card.appendChild(imageEl);
		card.appendChild(title);

		if (spot.address) {
			const address = document.createElement("div");
			address.className = "chat-spot-address";
			address.textContent = spot.address;
			card.appendChild(address);
		}

		gallery.appendChild(card);
	});

	if (gallery.children.length > 0) {
		parent.appendChild(gallery);
	}
}

function createSpotCardElement(spot) {
	const card = document.createElement("div");
	card.className = "chat-spot-card";

	const img = document.createElement("img");
	img.className = "chat-spot-image";
	img.src = spot.photo_url;
	img.alt = spot.name || "景點圖片";
	img.loading = "lazy";
	img.referrerPolicy = "no-referrer";
	img.onerror = () => {
		const placeholder = document.createElement("div");
		placeholder.className = "chat-spot-image chat-spot-no-photo";
		placeholder.textContent = "📷";
		img.replaceWith(placeholder);
	};

	const title = document.createElement("div");
	title.className = "chat-spot-title";
	title.textContent = spot.name || "景點";

	card.appendChild(img);
	card.appendChild(title);
	if (spot.address) {
		const address = document.createElement("div");
		address.className = "chat-spot-address";
		address.textContent = spot.address;
		card.appendChild(address);
	}

	img.style.cursor = "pointer";
	img.addEventListener("click", function (e) {
		e.stopPropagation();
		openImageModal(spot.photo_url, spot.name || "景點圖片");
	});

	return card;
}

function openImageModal(photoUrl, title) {
	if (!photoUrl) return;
	let modal = document.getElementById("imageModal");
	if (!modal) {
		modal = document.createElement("div");
		modal.id = "imageModal";
		modal.className = "image-modal";
		modal.innerHTML = `
			<div class="image-modal-backdrop"></div>
			<div class="image-modal-content">
				<button class="image-modal-close" aria-label="關閉">×</button>
				<img class="image-modal-img" src="" alt="" />
				<div class="image-modal-caption"></div>
			</div>
		`;
		document.body.appendChild(modal);

		// events
		modal.querySelector('.image-modal-close').addEventListener('click', closeImageModal);
		modal.querySelector('.image-modal-backdrop').addEventListener('click', closeImageModal);
		document.addEventListener('keydown', function onEsc(e) {
			if (e.key === 'Escape') closeImageModal();
		});
	}

	const imgEl = modal.querySelector('.image-modal-img');
	const capEl = modal.querySelector('.image-modal-caption');
	imgEl.src = photoUrl;
	imgEl.alt = title || '';
	capEl.textContent = title || '';
	modal.classList.add('open');
}

function closeImageModal() {
	const modal = document.getElementById('imageModal');
	if (!modal) return;
	modal.classList.remove('open');
	const imgEl = modal.querySelector('.image-modal-img');
	if (imgEl) imgEl.src = '';
}

async function typeMessage(text, type, speed = CHAT_TYPEWRITER_SPEED, spotImages = []) {
	const div = document.createElement("div");
	div.className = `chat-msg ${type}`;
	if (type === "bot") div.classList.add("is-typing");
	document.getElementById("chatMessages").appendChild(div);

	if (!text) {
		if (type === "bot") {
			appendSpotImageCards(div, spotImages);
		}
		div.classList.remove("is-typing");
		scrollToBottom();
		return div;
	}

	// Split by lines to interleave images after each finished line
	const lines = String(text || "").split(/\r?\n/);
	// Make a shallow copy of spotImages we can consume
	const remainingImages = Array.isArray(spotImages) ? spotImages.slice() : [];

	// Track position relative to last • line: 0=none, 1=meta, 2=desc
	let afterBullet = 0;
	let dayCount = 0;

	for (let li = 0; li < lines.length; li++) {
		const lineText = lines[li];
		const trimmed = lineText.trim();

		const p = document.createElement("div");

		if (trimmed === "") {
			afterBullet = 0;
			p.className = "chat-msg-line";
		} else if (/^第\s*\d+\s*天[\s（(]*(星期[一二三四五六日])?[\s）)]*$/.test(trimmed)) {
			afterBullet = 0;
			dayCount++;
			p.className = dayCount === 1
				? "chat-msg-line chat-day-header chat-day-header--first"
				: "chat-msg-line chat-day-header";
		} else if (trimmed.startsWith("•")) {
			afterBullet = 1;
			p.className = "chat-msg-line chat-msg-line--name";
		} else if (afterBullet === 1) {
			p.className = "chat-msg-line chat-msg-line--meta";
			afterBullet = 2;
		} else if (afterBullet === 2) {
			p.className = "chat-msg-line chat-msg-line--desc";
			afterBullet = 3;
		} else {
			p.className = "chat-msg-line";
		}

		div.appendChild(p);

		// Type this line character-by-character
		for (let ci = 0; ci <= lineText.length; ci++) {
			if (_chatTypingAborted) {
				p.textContent = lineText; // 立即補完這行
				break;
			}
			p.textContent = lineText.slice(0, ci);
			scrollToBottom();
			const waitMs = Math.max(10, speed);
			if (ci < lineText.length) await new Promise((r) => setTimeout(r, waitMs));
		}

		if (_chatTypingAborted) {
			// 立即顯示所有剩餘行
			for (let ri = li + 1; ri < lines.length; ri++) {
				const rp = document.createElement("div");
				rp.className = "chat-msg-line";
				rp.textContent = lines[ri];
				div.appendChild(rp);
			}
			break;
		}

		// 描述行打完後才插入景點圖片
		if (type === "bot" && remainingImages.length > 0 && afterBullet === 3) {
			const spot = remainingImages.shift();
			const card = createSpotCardElement(spot);
			const galleryWrapper = document.createElement("div");
			galleryWrapper.className = "chat-spot-gallery-inline";
			galleryWrapper.appendChild(card);
			div.appendChild(galleryWrapper);
			scrollToBottom();
		}

		// Append a blank line between paragraphs visually
		if (li !== lines.length - 1) {
			const br = document.createElement("div");
			br.style.height = "6px";
			div.appendChild(br);
		}
	}

	// If any images remain, append them as a gallery at the end
	if (type === "bot" && remainingImages.length > 0) {
		appendSpotImageCards(div, remainingImages);
	}

	div.classList.remove("is-typing");
	return div;
}

async function showPendingChatOutput(options = {}) {
	const { ensureChatMode = true } = options;
	const pendingRaw = localStorage.getItem("pendingChatOutput");
	if (!pendingRaw) return false;

	let pendingPayload = null;
	try {
		pendingPayload = JSON.parse(pendingRaw);
	} catch (_) {
		pendingPayload = null;
	}

	const pendingChatOutput =
		pendingPayload && typeof pendingPayload === "object"
			? String(pendingPayload.response || "").trim()
			: String(pendingRaw || "").trim();
	const pendingSpotImages =
		pendingPayload && typeof pendingPayload === "object" && Array.isArray(pendingPayload.spot_images)
			? pendingPayload.spot_images
			: [];

	if (!pendingChatOutput) {
		localStorage.removeItem("pendingChatOutput");
		return false;
	}

	localStorage.removeItem("pendingChatOutput");

	// 如果是透過飛機動畫從 setup 跳轉過來，等動畫完全結束再顯示聊天
	if (sessionStorage.getItem("navigationType") === "planeLead") {
		// 等待 navigationType 被移除（flyInFromTop 的 cleanup 會移除），最多等 5 秒
		const start = Date.now();
		while (sessionStorage.getItem("navigationType") === "planeLead" && Date.now() - start < 5000) {
			await new Promise((r) => setTimeout(r, 100));
		}
		// 再額外等待 1 秒，確保動畫的視覺收尾完成
		await new Promise((r) => setTimeout(r, 1000));
	}

	if (!isChatMode) {
		if (ensureChatMode) {
			isChatMode = true;
			timelineView.classList.remove("active");
			chatView.classList.add("active");
			showChatSuggestions();
			const robotFab = document.getElementById("robotFab");
			if (robotFabIcon) {
				robotFabIcon.classList.remove("fa-robot");
				robotFabIcon.classList.add("fa-list-ul");
			}
			if (robotFab) {
				robotFab.classList.add("chat-open");
			}
		}
	}
	if (isChatMode) {
		openSheet();
		syncSheetState("sheet-expanded");
	}

	await typeMessage(
		pendingChatOutput,
		"bot",
		CHAT_TYPEWRITER_SPEED_SLOW,
		pendingSpotImages,
	);
	conversationHistory.push({
		role: "assistant",
		content: pendingChatOutput,
	});
	return true;
}

function showChatWelcomeMessage() {
	if (hasShownChatWelcome) return;
	const chatMessages = document.getElementById("chatMessages");
	// 如果已經有待顯示的聊天內容（例如從規劃跳轉而來），不要顯示歡迎訊息
	const hasPendingOutput = !!localStorage.getItem('pendingChatOutput');
	const hasLastSuggestion = !!localStorage.getItem('lastChatSuggestion');
	const hasDetailed = !!localStorage.getItem('detailed_itinerary');
	if (!chatMessages || chatMessages.children.length > 0 || hasPendingOutput || hasLastSuggestion || hasDetailed) return;

	hasShownChatWelcome = true;
	void typeMessage(
		"Hello! 我是飛遊小幫手。你可以直接告訴我想修改行程、查景點，或問我旅程上的任何問題。",
		"bot",
		CHAT_TYPEWRITER_SPEED_SLOW,
	);
}

function hideChatSuggestions() {
	hasHiddenChatSuggestions = true;
	const chatSuggestions = document.getElementById("chatSuggestions");
	if (chatSuggestions) chatSuggestions.classList.add("suggestions-hidden");
}

function _hideChatSuggestionsTemp() {
	const chatSuggestions = document.getElementById("chatSuggestions");
	if (chatSuggestions) chatSuggestions.classList.add("suggestions-hidden");
}

// 切換聊天模式
async function toggleChatMode() {
	isChatMode = !isChatMode;

	const robotFab = document.getElementById("robotFab");

	if (isChatMode) {
		timelineView.classList.remove("active");
		chatView.classList.add("active");
		openSheet();
		syncSheetState("sheet-expanded");
		showChatSuggestions();
		const showedPending = await showPendingChatOutput({ ensureChatMode: false });
		if (!showedPending) {
			const showedProjectIntro = await showProjectChatIntroIfNeeded();
			if (!showedProjectIntro) {
			showChatWelcomeMessage();
			}
		}

		robotFabIcon.classList.remove("fa-robot");
		robotFabIcon.classList.add("fa-list-ul");
		robotFab.classList.add("chat-open");

		setTimeout(() => document.getElementById("chatInput").focus(), 300);
	} else {
		chatView.classList.remove("active");
		timelineView.classList.add("active");
		sheet.classList.remove("expanded", "half");
		syncSheetState("sheet-collapsed");

		robotFabIcon.classList.remove("fa-list-ul");
		robotFabIcon.classList.add("fa-robot");
		robotFab.classList.remove("chat-open");
	}
}

// 發送訊息
async function sendMessage() {
	const input = document.getElementById("chatInput");
	const text = input.value.trim();
	if (!text) return;
	input.value = "";

	_chatTypingAborted = false;
	_chatAbortController = new AbortController();
	setChatResponding(true);

	try {
		const flowHandled = await handleItineraryEditFlowInput(text);
		if (flowHandled) {
			return;
		}

		const tripContext = buildChatTripContext();
		const currentItinerary = getChatCurrentItinerary();

		addUserMessage(text);

		const loadingId = "loading-" + Date.now();
		document
			.getElementById("chatMessages")
			.insertAdjacentHTML(
				"beforeend",
				`<div class="typing" id="${loadingId}"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`,
			);
		scrollToBottom();

		const itineraryId = localStorage.getItem("currentItineraryId") || null;
		const resp = await fetch(API_BASE + "/api/chat/message", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal: _chatAbortController.signal,
			body: JSON.stringify({
				message: text,
				conversationHistory,
				tripContext,
				currentItinerary,
				currentDayIndex,
				itineraryId,
			}),
		});

		const result = await resp.json();
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();

		if (result && (result.code === 200 || result.success === true)) {
			const data = result.data || result;
			const isUpdateDay = data?.parsed?.action === "update_day";
			const aiText = isUpdateDay
				? (data.parsed?.summary || "行程已更新。")
				: ((data && (data.parsed?.summary || data.parsed?.question || data.response || data.raw_output)) || "（無回覆）");
			await appendMsg(aiText, "bot", []);

			if (Array.isArray(data.spot_images) && data.spot_images.length > 0) {
				_mergeSpotPhotosToLocalItinerary(data.spot_images);
			}

			if (data && data.parsed && data.parsed.action === "update_day") {
				const updated = applyChatItineraryUpdate(data.parsed);
				if (!updated) {
					await appendMsg("系統已回傳修改結果，但無法套用到目前行程。", "bot");
				}
			}
			if (Array.isArray(data.history) && data.history.length > 0) {
				conversationHistory = data.history;
			} else {
				conversationHistory.push({ role: "assistant", content: aiText });
			}
		} else {
			await appendMsg("伺服器錯誤: " + (result.message || result.error || "未知"), "bot");
		}
	} catch (err) {
		const loader = document.getElementById("chatMessages")?.querySelector(".typing");
		if (loader) loader.remove();
		if (err.name !== "AbortError") {
			await appendMsg("網路錯誤，請稍後再試", "bot");
		}
	} finally {
		_chatAbortController = null;
		_chatTypingAborted = false;
		setChatResponding(false);
	}
}

async function appendMsg(text, type, spotImages = []) {
	if (type === "bot") {
		return typeMessage(text, type, CHAT_TYPEWRITER_SPEED, spotImages);
	}
	const div = document.createElement("div");
	div.className = `chat-msg ${type}`;
	div.textContent = text;
	const chatMessages = document.getElementById("chatMessages");
	chatMessages.appendChild(div);
	requestAnimationFrame(() => {
		scrollToBottom();
		if (typeof div.scrollIntoView === "function") {
			div.scrollIntoView({ block: "end" });
		}
	});
}

function sendSuggestedQuestion(question, buttonElement) {
	const input = document.getElementById("chatInput");
	if (!input || !question) return;

	if (buttonElement && buttonElement.classList) {
		buttonElement.classList.add("is-pressed");
		window.setTimeout(() => {
			buttonElement.classList.remove("is-pressed");
		}, 140);
	}

	input.value = question;
	void sendMessage();
}

function scrollToBottom() {
	const container = document.getElementById("chatMessages");
	container.scrollTop = container.scrollHeight;
}

function chatSendBtnClicked() {
	console.log("[chat] chatSendBtnClicked");
	const btn = document.getElementById("chatSendBtn");
	if (btn && btn.classList.contains("is-responding")) {
		stopChatResponse();
	} else {
		void sendMessage();
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const chatInput = document.getElementById("chatInput");
	if (chatInput) {
		chatInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				void sendMessage();
			}
		});
	}

	void showPendingChatOutput();
});
