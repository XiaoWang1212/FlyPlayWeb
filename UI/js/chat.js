// ===== 聊天功能 =====

let conversationHistory = [];
let hasShownChatWelcome = false;
let hasHiddenChatSuggestions = false;

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


// 逐字顯示訊息（打字機效果）
async function typeMessage(text, type, speed = 20) {
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

async function showPendingChatOutput() {
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
		toggleChatMode();
	} else {
		openSheet();
		syncSheetState("sheet-expanded");
	}

	await typeMessage(pendingChatOutput, "bot", 35);
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
		40,
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
function toggleChatMode() {
	isChatMode = !isChatMode;

	const robotFab = document.getElementById("robotFab");

	if (isChatMode) {
		timelineView.classList.remove("active");
		chatView.classList.add("active");
		openSheet();
		syncSheetState("sheet-expanded");
		showChatWelcomeMessage();

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

	const tripSetup = JSON.parse(localStorage.getItem("tripSetup") || "{}");
	const selectedDestinations = JSON.parse(
		localStorage.getItem("selectedDestinations") || "[]",
	);
	const tripContext = {
		days: tripSetup.daysValue || tripSetup.daysLabel || "",
		destination: selectedDestinations
			.map((dest) => dest.city || dest.name || dest.label)
			.filter(Boolean)
			.join("、"),
		departure: tripSetup.departureLabel || tripSetup.departure || "",
		companion: tripSetup.companionLabel || tripSetup.companion || "",
		// 新增 pace（行程緊湊度），向下相容舊欄位 morningDeparture
		pace: tripSetup.pace || tripSetup.tripPace || tripSetup.morningDepartureLabel || tripSetup.morningDeparture || "",
		morningDeparture: tripSetup.morningDepartureLabel || tripSetup.morningDeparture || "",
		travelType:
			(tripSetup.travelTypeLabels || []).join("、") ||
			tripSetup.travelTypeLabel ||
			tripSetup.travelType ||
			"",
		startDate: tripSetup.startDate || "",
	};
	const currentItinerary = getChatCurrentItinerary();

	hideChatSuggestions();
	appendMsg(text, "user");
	input.value = "";

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
			appendMsg(aiText, "bot");
			if (data && data.parsed && data.parsed.action === "update_day") {
				const updated = applyChatItineraryUpdate(data.parsed);
				if (!updated) {
					appendMsg("系統已回傳修改結果，但無法套用到目前行程。", "bot");
				}
			}
			if (Array.isArray(data.history) && data.history.length > 0) {
				conversationHistory = data.history;
			} else {
				conversationHistory.push({ role: "assistant", content: aiText });
			}
				// 保持聊天視窗狀態，不在每次傳送後自動縮回半層
		} else {
			appendMsg("伺服器錯誤: " + (result.message || result.error || "未知"), "bot");
		}
	} catch (err) {
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();
		appendMsg("網路錯誤，請稍後再試", "bot");
	}
}

function appendMsg(text, type) {
	const div = document.createElement("div");
	div.className = `chat-msg ${type}`;
	div.textContent = text;
	document.getElementById("chatMessages").appendChild(div);
	scrollToBottom();
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
