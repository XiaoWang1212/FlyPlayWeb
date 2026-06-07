// ===== 聊天功能 =====

let conversationHistory = [];
let hasShownChatWelcome = false;
let hasHiddenChatSuggestions = false;

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
			})),
		})),
	};
}

function persistChatItinerary(days) {
	if (!Array.isArray(days) || days.length === 0) return;

	localStorage.setItem("data_latlng", JSON.stringify(serializeChatItinerary(days)));

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
	if (currentDayIndex === -1) {
		if (typeof displayAllDays === "function") displayAllDays();
	} else if (typeof displayDay === "function") {
		displayDay(currentDayIndex);
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
		chatSuggestions.style.display = "flex";
	}
}

function showChatSuggestions() {
	const chatSuggestions = document.getElementById("chatSuggestions");
	if (!chatSuggestions) return;
	chatSuggestions.style.display = "flex";
	hasHiddenChatSuggestions = false;
}

function buildChatInitialMessage(projectTitle) {
	const tripContext = buildChatTripContext();
	const tripDays = Array.isArray(allDays) ? allDays.length : 0;
	const title = String(projectTitle || sessionStorage.getItem("currentProjectTitle") || "目前行程").trim();
	const destination = tripContext.destination || "";
	const daysText = tripContext.days || (tripDays > 0 ? `${tripDays} 天` : "");
	const summaryParts = [
		`已載入「${title}」`,
		destination ? `目的地是 ${destination}` : "",
		daysText ? `共有 ${daysText} 天` : "",
	].filter(Boolean);

	return `${summaryParts.join("，")}。你可以直接告訴我想調整哪一天，或請我找景點、交通和餐廳建議。`;
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

function openEditModeWithSearchKeyword(keyword, targetDay) {
	const searchKeyword = String(keyword || "").trim();
	const dayNumber = Number(targetDay || 0);

	if (dayNumber > 0 && Array.isArray(allDays) && allDays.length >= dayNumber) {
		currentDayIndex = dayNumber - 1;
		if (typeof displayDay === "function") {
			displayDay(currentDayIndex);
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
	if (typeof openSpotSearchModal === "function") {
		openSpotSearchModal(searchKeyword);
	}
}

function startItineraryEditFlow() {
	hideChatSuggestions();
	writeItineraryEditFlow({
		stage: "choose_action",
		action: null,
		targetDay: null,
		targetItem: "",
	});
	addBotMessage("你想新增、修改、還是刪除行程？");
}

async function handleItineraryEditFlowInput(text) {
	const currentFlow = readItineraryEditFlow();
	if (!currentFlow) {
		if (/修改行程/.test(String(text || ""))) {
			addUserMessage(text);
			startItineraryEditFlow();
			return true;
		}
		return false;
	}

	const flowText = String(text || "").trim();
	if (!flowText) return true;

	if (/^(取消|結束|退出|離開)$/.test(normalizeFlowText(flowText))) {
		clearItineraryEditFlow();
		addUserMessage(text);
		addBotMessage("已取消修改行程流程。若你想重新開始，可以再輸入「修改行程」。");
		return true;
	}

	addUserMessage(text);

	if (currentFlow.stage === "choose_action") {
		const action = extractFlowActionFromText(flowText);
		if (!action) {
			addBotMessage("請先告訴我你想新增、修改，還是刪除行程。也可以直接輸入「新增」、「修改」或「刪除」。");
			return true;
		}

		if (action === "add") {
			clearItineraryEditFlow();
			await addBotMessage("我已幫你打開新增行程的介面，現在可以直接加入景點。");
			await wait(CHAT_FLOW_TRANSITION_DELAY_MS);
			openEditModeWithSearchKeyword("", currentFlow.targetDay || (currentDayIndex >= 0 ? currentDayIndex + 1 : 1));
			return true;
		}

		if (action === "delete") {
			clearItineraryEditFlow();
			addBotMessage("刪除行程的話，請先點要刪除的那一天，進入編輯模式後，找到想刪除的景點，點它右邊的垃圾桶，最後再按確認就完成了。");
			return true;
		}

		writeItineraryEditFlow({
			...currentFlow,
			action: "update",
			stage: "ask_day_item",
		});
		addBotMessage("請告訴我你要修改第幾天，以及是哪個行程，例如「第 2 天下午的東京鐵塔」。");
		return true;
	}

	if (currentFlow.stage === "ask_day_item") {
		const dayNumber = extractDayNumberFromText(flowText);
		const targetItem = extractTargetItemFromText(flowText, dayNumber);

		if (!dayNumber || !targetItem) {
			addBotMessage("我需要知道第幾天和要修改的行程名稱。可以直接輸入例如「第 3 天的京都塔」。");
			return true;
		}

		writeItineraryEditFlow({
			...currentFlow,
			action: "update",
			stage: "choose_mode",
			targetDay: dayNumber,
			targetItem,
		});
		addBotMessage("你想要 AI 推薦新的景點，還是直接輸入你知道的景點名稱？");
		return true;
	}

	if (currentFlow.stage === "choose_mode") {
		const mode = extractRecommendationMode(flowText);
		if (!mode) {
			addBotMessage("請回覆我你要 AI 推薦，或是自己輸入景點名稱。");
			return true;
		}

		if (mode === "manual") {
			writeItineraryEditFlow({
				...currentFlow,
				stage: "manual_spot_name",
			});
			addBotMessage("請直接輸入你想加入的景點名稱，我會幫你打開編輯頁面並預填搜尋框。");
			return true;
		}

		try {
			const tripContext = buildChatTripContext();
			const currentItinerary = getChatCurrentItinerary();
			const resp = await fetch(API_BASE + "/api/chat/itinerary-suggestion", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tripContext,
					currentItinerary,
					targetDay: currentFlow.targetDay,
					targetItem: currentFlow.targetItem,
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

			clearItineraryEditFlow();
			await addBotMessage(`我幫你推薦了「${suggestedSpot}」，已經幫你打開編輯頁面並預填搜尋框。你只要按加入行程就可以完成修改。`);
			await wait(CHAT_FLOW_TRANSITION_DELAY_MS);
			openEditModeWithSearchKeyword(suggestedSpot, currentFlow.targetDay);
			return true;
		} catch (error) {
			addBotMessage(`AI 推薦時發生問題：${error.message || error}。你也可以改用自己知道的景點名稱。`);
			return true;
		}
	}

	if (currentFlow.stage === "manual_spot_name") {
		const spotName = flowText.replace(/^[「"'【\[]|[」"'】\]]$/g, "").trim();
		if (!spotName) {
			addBotMessage("請輸入你想加入的景點名稱。");
			return true;
		}

		const targetDay = currentFlow.targetDay;
		clearItineraryEditFlow();
		await addBotMessage(`我已幫你打開編輯頁面，並把「${spotName}」放進搜尋框。`);
		await wait(CHAT_FLOW_TRANSITION_DELAY_MS);
		openEditModeWithSearchKeyword(spotName, targetDay);
		return true;
	}

	clearItineraryEditFlow();
	return false;
}


const CHAT_TYPEWRITER_SPEED = 30;
const CHAT_TYPEWRITER_SPEED_SLOW = 45;

// 逐字顯示訊息（打字機效果）
async function typeMessage(text, type, speed = CHAT_TYPEWRITER_SPEED) {
	const div = document.createElement("div");
	div.className = `chat-msg ${type}`;
	document.getElementById("chatMessages").appendChild(div);

	if (!text) {
		scrollToBottom();
		return div;
	}

	const chunkSize = Math.max(1, Math.ceil(text.length / 400));
	for (let index = 0; index < text.length; index += chunkSize) {
		div.textContent = text.slice(0, index + chunkSize);
		scrollToBottom();
		await new Promise((resolve) => setTimeout(resolve, speed));
	}

	return div;
}

async function showPendingChatOutput(options = {}) {
	const { ensureChatMode = true } = options;
	const pendingChatOutput = localStorage.getItem("pendingChatOutput");
	if (!pendingChatOutput) return false;

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

	await typeMessage(pendingChatOutput, "bot", CHAT_TYPEWRITER_SPEED_SLOW);
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
	if (hasHiddenChatSuggestions) return;
	const chatSuggestions = document.getElementById("chatSuggestions");
	if (!chatSuggestions) return;

	hasHiddenChatSuggestions = true;
	chatSuggestions.style.display = "none";
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

	if (await handleItineraryEditFlowInput(text)) {
		return;
	}

	const tripContext = buildChatTripContext();
	const currentItinerary = getChatCurrentItinerary();

	hideChatSuggestions();
	addUserMessage(text);

	const loadingId = "loading-" + Date.now();
	document
		.getElementById("chatMessages")
		.insertAdjacentHTML(
			"beforeend",
			`<div class="typing" id="${loadingId}"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`,
		);
	scrollToBottom();

	try {
		const resp = await fetch(API_BASE + "/api/chat/message", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message: text,
				conversationHistory,
				tripContext,
				currentItinerary,
				currentDayIndex,
			}),
		});

		const result = await resp.json();
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();

		if (result && (result.code === 200 || result.success === true)) {
			const data = result.data || result;
			const aiText =
				(data && (data.parsed?.summary || data.parsed?.question || data.response || data.raw_output || (data.parsed && JSON.stringify(data.parsed)))) ||
				"（無回覆）";
			await appendMsg(aiText, "bot");
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
				// 保持聊天視窗狀態，不在每次傳送後自動縮回半層
		} else {
			await appendMsg("伺服器錯誤: " + (result.message || result.error || "未知"), "bot");
		}
	} catch (err) {
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();
		await appendMsg("網路錯誤，請稍後再試", "bot");
	}
}

async function appendMsg(text, type) {
	if (type === "bot") {
		return typeMessage(text, type, CHAT_TYPEWRITER_SPEED);
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
	input.focus();
	if (typeof input.setSelectionRange === "function") {
		input.setSelectionRange(question.length, question.length);
	}
}

function scrollToBottom() {
	const container = document.getElementById("chatMessages");
	container.scrollTop = container.scrollHeight;
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
