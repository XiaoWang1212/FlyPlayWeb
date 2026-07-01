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

	// 外觀由 CSS nth-child 規則控制，不設 inline style

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

	// 移除舊的日期標題、活動與新增按鈕
	const oldDayTitles = timelineList.querySelectorAll("[data-day-title]");
	const oldItems = timelineList.querySelectorAll(".timeline-item");
	const oldAddBtns = timelineList.querySelectorAll(".add-item-btn");

	oldDayTitles.forEach((el) => el.remove());
	oldItems.forEach((el) => el.remove());
	oldAddBtns.forEach((el) => el.remove());

	// 添加該天的日期標題
	const weekdayLabel = getWeekdayLabel(day.day);
	day.weekday = weekdayLabel;

	const dayTitle = document.createElement("div");
	dayTitle.setAttribute("data-day-title", "true");
	const dayHeadText = weekdayLabel ? `第 ${day.day} 天 - ${weekdayLabel}` : `第 ${day.day} 天`;
	dayTitle.innerHTML = `<span>${dayHeadText}</span><span class="edit-btn-group">${isEditMode ? '<span class="edit-text-btn" onclick="confirmDrag()">完成</span>' : ''}<span id="editTextLabel" class="edit-text-btn" onclick="toggleEditMode(event)">${isEditMode ? '取消' : '編輯'}</span></span>`;
	timelineList.appendChild(dayTitle);

	// 編輯模式下在活動上方插入新增按鈕（保護重複插入）
	if (isEditMode && !timelineList.querySelector(".add-item-btn")) {
		const addBtn = document.createElement("div");
		addBtn.className = "add-item-btn";
		addBtn.innerHTML = '<i class="fas fa-plus"></i> 新增行程';
		addBtn.onclick = addItem;
		timelineList.appendChild(addBtn);
	}

	// 添加該天的所有活動
	day.activities.forEach((activity, actIndex) => {
		const isLast = actIndex === day.activities.length - 1;
		const nextActivity = isLast ? null : day.activities[actIndex + 1];
		const photoUrl =
			activity.photos && activity.photos[0]
				? activity.photos[0].photo_url
				: "";

		const oLat = activity.location?.lat ?? '';
		const oLng = activity.location?.lng ?? '';
		const dLat = nextActivity?.location?.lat ?? '';
		const dLng = nextActivity?.location?.lng ?? '';
		const oName = (activity.place_name || '').replace(/"/g, '&quot;');
		const dName = (nextActivity?.place_name || '').replace(/"/g, '&quot;');

		const newItemHTML = `
      <div class="delete-btn" onclick="deleteItem(this)"><i class="fas fa-trash"></i></div>

      <div class="location-block" onclick="focusMarker('${activity.activityId || activity.place_name || String(actIndex)}')">
        <div class="drag-handle"><i class="fas fa-grip-lines"></i></div>
        <div class="timeline-left">
          <div class="location-img" ${photoUrl ? `style="background-image: url('${photoUrl}'); background-size: cover; background-position: center;"` : ""}>
            <i class="far fa-image" ${photoUrl ? 'style="display: none;"' : ""}></i>
          </div>
        </div>
        <div class="timeline-right">
          <div class="timeline-title">
            <span class="place-name">${actIndex + 1}. ${activity.place_name}</span>
            <span class="time-badge">${activity.time}</span>
          </div>
          <div class="timeline-desc">${activity.description}</div>
          ${activity.cost ? `<div class="activity-cost">💰 ${activity.cost}</div>` : ""}
        </div>
      </div>

      ${!isLast ? `
      <div class="transit-block"
           data-origin-lat="${oLat}" data-origin-lng="${oLng}"
           data-dest-lat="${dLat}" data-dest-lng="${dLng}"
           data-origin-name="${oName}" data-dest-name="${dName}"
           data-day-index="${dayIndex}" data-act-index="${actIndex}"
           ${activity.transit_mode ? `data-best-mode="${activity.transit_mode}"` : ''}>
        <div class="transit-line"></div>
        <div class="transit-info-row">
          <div class="transit-summary" onclick="openTransitModal(this.closest('.transit-block'))">
            <i class="fas fa-walking transit-mode-icon"></i>
            <span class="transit-text">計算中…</span>
            <i class="fas fa-chevron-down transit-chevron"></i>
          </div>
          <a class="transit-route-link" href="javascript:void(0)"
             onclick="openGoogleMapsRoute(event, this.closest('.transit-block'))">路線</a>
        </div>
      </div>
      ` : '<div style="height: 15px;"></div>'}
    `;

		const div = document.createElement("div");
		div.className = "timeline-item";
		div.dataset.activityId =
			activity.activityId || activity.place_name || String(actIndex);
		div.innerHTML = newItemHTML;
		timelineList.appendChild(div);
	});
	setTimeout(() => initTransitBlocks(), 300);
}

// 載入所有活動的時間線
function loadAllTimelineActivities() {
	const timelineList = document.getElementById("timelineList");

	// 移除舊的日期標題、活動與新增按鈕
	const oldDayTitles = timelineList.querySelectorAll("[data-day-title]");
	const oldItems = timelineList.querySelectorAll(".timeline-item");
	const oldAddBtns = timelineList.querySelectorAll(".add-item-btn");

	oldDayTitles.forEach((el) => el.remove());
	oldItems.forEach((el) => el.remove());
	oldAddBtns.forEach((el) => el.remove());

	allDays.forEach((day, dayIndex) => {
		const weekdayLabel = getWeekdayLabel(day.day);
		day.weekday = weekdayLabel;

		const dayTitle = document.createElement("div");
		dayTitle.setAttribute("data-day-title", "true");
		dayTitle.textContent = weekdayLabel ? `第 ${day.day} 天 - ${weekdayLabel}` : `第 ${day.day} 天`;
		timelineList.appendChild(dayTitle);

		console.log(`正在載入第 ${day.day} 天的活動：`, day.activities);

		day.activities.forEach((activity, actIndex) => {
			const isLast = actIndex === day.activities.length - 1;
			const nextActivity = isLast ? null : day.activities[actIndex + 1];
			const photoUrl =
				activity.photos && activity.photos[0]
					? activity.photos[0].photo_url
					: "";

			const oLat = activity.location?.lat ?? '';
			const oLng = activity.location?.lng ?? '';
			const dLat = nextActivity?.location?.lat ?? '';
			const dLng = nextActivity?.location?.lng ?? '';
			const oName = (activity.place_name || '').replace(/"/g, '&quot;');
			const dName = (nextActivity?.place_name || '').replace(/"/g, '&quot;');

			const newItemHTML = `
      <div class="delete-btn" onclick="deleteItem(this)"><i class="fas fa-trash"></i></div>

      <div class="location-block" onclick="focusMarker('${activity.activityId || activity.place_name || String(actIndex)}')">
        <div class="drag-handle"><i class="fas fa-grip-lines"></i></div>
        <div class="timeline-left">
          <div class="location-img" ${photoUrl ? `style="background-image: url('${photoUrl}'); background-size: cover; background-position: center;"` : ""}>
            <i class="far fa-image" ${photoUrl ? 'style="display: none;"' : ""}></i>
          </div>
        </div>
        <div class="timeline-right">
          <div class="timeline-title">
            <span class="place-name">${actIndex + 1}. ${activity.place_name}</span>
            <span class="time-badge">${activity.time}</span>
          </div>
          <div class="timeline-desc">${activity.description}</div>
          ${activity.cost ? `<div class="activity-cost">💰 ${activity.cost}</div>` : ""}
        </div>
      </div>

      ${!isLast ? `
      <div class="transit-block"
           data-origin-lat="${oLat}" data-origin-lng="${oLng}"
           data-dest-lat="${dLat}" data-dest-lng="${dLng}"
           data-origin-name="${oName}" data-dest-name="${dName}"
           data-day-index="${dayIndex}" data-act-index="${actIndex}"
           ${activity.transit_mode ? `data-best-mode="${activity.transit_mode}"` : ''}>
        <div class="transit-line"></div>
        <div class="transit-info-row">
          <div class="transit-summary" onclick="openTransitModal(this.closest('.transit-block'))">
            <i class="fas fa-walking transit-mode-icon"></i>
            <span class="transit-text">計算中…</span>
            <i class="fas fa-chevron-down transit-chevron"></i>
          </div>
          <a class="transit-route-link" href="javascript:void(0)"
             onclick="openGoogleMapsRoute(event, this.closest('.transit-block'))">路線</a>
        </div>
      </div>
      ` : '<div style="height: 15px;"></div>'}
    `;

			const div = document.createElement("div");
			div.className = "timeline-item";
			div.dataset.activityId =
				activity.activityId || activity.place_name || String(actIndex);
			div.innerHTML = newItemHTML;
			timelineList.appendChild(div);
		});
	});
	setTimeout(() => initTransitBlocks(), 300);
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


	// 1. 獲取所有按鈕，並把所有按鈕的顏色清空（恢復成未選中的預設樣式
	const allBtns = document.querySelectorAll("#dayButtonContainer button");
	allBtns.forEach((btn) => {
		btn.classList.remove("active");
		btn.style.backgroundColor = "";
		btn.style.borderColor = "";
		btn.style.color = "";
	});

	// 2. 加上 active class，由 CSS 控制外觀
	clickedBtn.classList.add("active");

  // 3. 判斷要顯示單天還是全部
	if (dayIndex === -1) {
		if (isEditMode) {
			if (isDragChanged) {
				timelineList.innerHTML = originalTimelineHTML;
				isDragChanged = false;
			}
			editedDays = null;
			isEditMode = false;
			timelineView.classList.remove("editing");
			sortable.option("disabled", true);
			// document.getElementById("dragConfirmBtn")?.classList.remove("show");
		}
		displayAllDays();
	} else {
		displayDay(dayIndex);
	}
}
