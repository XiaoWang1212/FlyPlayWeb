// ===== 時間線與日期切換 =====

// 創建日期按鈕
function createDayButtons() {
	const timelineView = document.getElementById("timelineView");
	const oldContainer = document.getElementById("dayButtonContainer");
	if (oldContainer) oldContainer.remove();
	const buttonContainer = document.createElement("div");
	buttonContainer.id = "dayButtonContainer";

	const allBtn = document.createElement("button");
	allBtn.textContent = "全部";
	allBtn.classList.add("active"); // 預設為選中狀態

	// 新增：網頁一開始載入時，就幫「全部」按鈕上色
	const allColor = getColorByDay(-1);
	allBtn.style.backgroundColor = allColor;
	allBtn.style.color = "#FFFFFF";
	allBtn.style.borderColor = allColor;

	document.getElementById("editFab").style.display = "none";

	allBtn.onclick = () => switchDay(-1, allBtn);
	buttonContainer.appendChild(allBtn);
	// -------------------------
	allDays.forEach((day, index) => {
		const btn = document.createElement("button");
		btn.textContent = `第 ${day.day} 天`;
		btn.setAttribute("data-day-index", index);
		btn.onclick = () => switchDay(index, btn);
		buttonContainer.appendChild(btn);
	});

	console.log("AllDAYS", allDays);

	// 把按鈕加到時間線最上方
	timelineView.insertBefore(buttonContainer, timelineView.firstChild);
}

// 載入單天時間線
function loadSingleDayTimeline(day, dayIndex) {
	const timelineList = document.getElementById("timelineList");

	// 移除舊的日期標題和活動
	const oldDayTitles = timelineList.querySelectorAll("[data-day-title]");
	const oldItems = timelineList.querySelectorAll(".timeline-item");

	oldDayTitles.forEach((el) => el.remove());
	oldItems.forEach((el) => el.remove());

	// 添加該天的日期標題
	const dayTitle = document.createElement("div");
	dayTitle.setAttribute("data-day-title", "true");
	dayTitle.textContent = `第 ${day.day} 天 - ${day.weekday}`;
	timelineList.appendChild(dayTitle);

	// 添加該天的所有活動
	day.activities.forEach((activity, actIndex) => {
		const isLast = actIndex === day.activities.length - 1;
		const photoUrl =
			activity.photos && activity.photos[0]
				? activity.photos[0].photo_url
				: "";

		const newItemHTML = `
      <div class="delete-btn" onclick="deleteItem(this)"><i class="fas fa-trash"></i></div>

      <div class="location-block" onclick="focusMarker('${activity.activityId || activity.place_name || String(actIndex)}')">
        <div class="timeline-left">
          <div class="location-img" ${photoUrl ? `style="background-image: url('${photoUrl}'); background-size: cover; background-position: center;"` : ""}>
            <i class="far fa-image" ${photoUrl ? 'style="display: none;"' : ""}></i>
          </div>
        </div>
        <div class="timeline-right">
          <div class="timeline-title">
            ${actIndex + 1}. ${activity.place_name}
            <span class="time-badge">${activity.time}</span>
          </div>
          <div class="timeline-desc">${activity.description}</div>
          ${activity.cost ? `<div class="activity-cost">💰 ${activity.cost}</div>` : ""}
        </div>
      </div>

      ${
			!isLast
				? `
      <div class="transit-block">
        <div class="transit-line"></div>
        <div class="transit-data"><i class="fas fa-bus"></i> 預估交通時間...</div>
      </div>
      `
				: '<div style="height: 15px;"></div>'
		}
    `;

		const div = document.createElement("div");
		div.className = "timeline-item";
		div.dataset.activityId =
			activity.activityId || activity.place_name || String(actIndex);
		div.innerHTML = newItemHTML;
		timelineList.appendChild(div);
	});
}

// 載入所有活動的時間線
function loadAllTimelineActivities() {
	const timelineList = document.getElementById("timelineList");

	// 移除舊的日期標題和活動
	const oldDayTitles = timelineList.querySelectorAll("[data-day-title]");
	const oldItems = timelineList.querySelectorAll(".timeline-item");

	oldDayTitles.forEach((el) => el.remove());
	oldItems.forEach((el) => el.remove());

	allDays.forEach((day, dayIndex) => {
		const dayTitle = document.createElement("div");
		dayTitle.setAttribute("data-day-title", "true");
		dayTitle.textContent = `第 ${day.day} 天 - ${day.weekday}`;
		timelineList.appendChild(dayTitle);

		console.log(`正在載入第 ${day.day} 天的活動：`, day.activities);

		day.activities.forEach((activity, actIndex) => {
			const isLast = actIndex === day.activities.length - 1;
			const photoUrl =
				activity.photos && activity.photos[0]
					? activity.photos[0].photo_url
					: "";

			const newItemHTML = `
      <div class="delete-btn" onclick="deleteItem(this)"><i class="fas fa-trash"></i></div>

      <div class="location-block" onclick="focusMarker('${activity.activityId || activity.place_name || String(actIndex)}')">
        <div class="timeline-left">
          <div class="location-img" ${photoUrl ? `style="background-image: url('${photoUrl}'); background-size: cover; background-position: center;"` : ""}>
            <i class="far fa-image" ${photoUrl ? 'style="display: none;"' : ""}></i>
          </div>
        </div>
        <div class="timeline-right">
          <div class="timeline-title">
            ${actIndex + 1}. ${activity.place_name}
            <span class="time-badge">${activity.time}</span>
          </div>
          <div class="timeline-desc">${activity.description}</div>
          ${activity.cost ? `<div class="activity-cost">💰 ${activity.cost}</div>` : ""}
        </div>
      </div>

      ${
			!isLast
				? `
      <div class="transit-block">
        <div class="transit-line"></div>
        <div class="transit-data"><i class="fas fa-bus"></i> 預估交通時間...</div>
      </div>
      `
				: '<div style="height: 15px;"></div>'
		}
    `;

			const div = document.createElement("div");
			div.className = "timeline-item";
			div.dataset.activityId =
				activity.activityId || activity.place_name || String(actIndex);
			div.innerHTML = newItemHTML;
			timelineList.appendChild(div);
		});
	});
}

// 切換日期
function switchDay(dayIndex, clickedBtn) {
	if (isEditMode && currentDayIndex !== dayIndex) {
		if (currentDayIndex === -1) {
			saveAllDayOrder();
		} else {
			saveCurrentDayOrder(currentDayIndex);
		}
	}

	currentDayIndex = dayIndex;

	const editFabBtn = document.getElementById("editFab");
	if (dayIndex === -1) {
		editFabBtn.style.display = "none"; // 「全部」時隱藏
	} else {
		if (!isChatMode) {
			editFabBtn.style.display = "flex"; // 「單天」且「不在聊天室」時才顯示
		}
	}

	// 1. 獲取所有按鈕，並把所有按鈕的顏色清空（恢復成未選中的預設樣式
	const allBtns = document.querySelectorAll("#dayButtonContainer button");
	allBtns.forEach((btn) => {
		btn.classList.remove("active");
		btn.style.backgroundColor = ""; // 清除背景色
		btn.style.color = ""; // 清除文字顏色
		btn.style.borderColor = ""; // 清除邊框顏色
	});

  // 2. 設定當前被點擊按鈕的專屬顏色
	clickedBtn.classList.add("active");
	const activeColor = getColorByDay(dayIndex);
	clickedBtn.style.backgroundColor = activeColor;
	clickedBtn.style.color = "#FFFFFF"; // 把文字變成白色，避免背景太深看不清楚文字
	clickedBtn.style.borderColor = activeColor;

  // 3. 判斷要顯示單天還是全部
	if (dayIndex === -1) {
		displayAllDays();
	} else {
		displayDay(dayIndex);
	}
}
