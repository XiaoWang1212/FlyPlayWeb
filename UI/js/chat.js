// ===== 聊天功能 =====

let conversationHistory = [];

// 逐字顯示訊息（打字機效果）
async function typeMessage(text, type, speed = 45) {
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

// 切換聊天模式
function toggleChatMode() {
	isChatMode = !isChatMode;

	if (isChatMode) {
		timelineView.classList.remove("active");
		chatView.classList.add("active");
		openSheet();
		syncSheetState("sheet-expanded");
		document.getElementById("editFab").style.display = "none";

		robotFabIcon.classList.remove("fa-robot");
		robotFabIcon.classList.add("fa-list-ul");

		setTimeout(() => document.getElementById("chatInput").focus(), 300);
	} else {
		chatView.classList.remove("active");
		timelineView.classList.add("active");
		sheet.classList.remove("expanded", "half");
		syncSheetState("sheet-collapsed");
		if (currentDayIndex !== -1) {
			document.getElementById("editFab").style.display = "flex";
		}

		robotFabIcon.classList.remove("fa-list-ul");
		robotFabIcon.classList.add("fa-robot");
	}
}

// 發送訊息
async function sendMessage() {
	const input = document.getElementById("chatInput");
	const text = input.value.trim();
	if (!text) return;

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
			body: JSON.stringify({ message: text, conversationHistory }),
		});

		const result = await resp.json();
		const loader = document.getElementById(loadingId);
		if (loader) loader.remove();

		if (result && (result.code === 200 || result.success === true)) {
			const data = result.data || result;
			const aiText =
				(data && (data.response || data.raw_output || (data.parsed && JSON.stringify(data.parsed)))) ||
				"（無回覆）";
			appendMsg(aiText, "bot");
			if (Array.isArray(data.history) && data.history.length > 0) {
				conversationHistory = data.history;
			} else {
				conversationHistory.push({ role: "assistant", content: aiText });
			}
			sheet.classList.remove("expanded");
			sheet.classList.add("half");
			fabGroup.classList.remove("horizontal");
			fabGroup.classList.add("half-mode");
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
