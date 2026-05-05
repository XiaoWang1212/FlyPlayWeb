// ===== 聊天功能 =====

// 逐字顯示訊息（打字機效果）
function typeMessage(text, type, speed = 30) {
	const div = document.createElement("div");
	div.className = `chat-msg ${type}`;
	document.getElementById("chatMessages").appendChild(div);

	let index = 0;
	const interval = setInterval(() => {
		if (index < text.length) {
			div.textContent += text[index];
			index++;
			scrollToBottom();
		} else {
			clearInterval(interval);
		}
	}, speed);

	return div;
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
function sendMessage() {
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

	setTimeout(() => {
		document.getElementById(loadingId).remove();

		setTimeout(() => {
			appendMsg("測試訊息", "bot");
			sheet.classList.remove("expanded");
			sheet.classList.add("half");
			fabGroup.classList.remove("horizontal");
			fabGroup.classList.add("half-mode");
		}, 1000);
	}, 1500);
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
