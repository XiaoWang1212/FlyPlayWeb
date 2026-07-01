// ===== App 教學導覽（Driver.js）=====
(function () {
  'use strict';

  const SETUP_DONE_KEY = 'fp_tutorial_setup_done';
  const INDEX_DONE_KEY = 'fp_tutorial_index_done';

  // 注入客製化樣式，讓 popover 符合 app 配色
  function injectStyles() {
    if (document.getElementById('fp-tutorial-style')) return;
    const style = document.createElement('style');
    style.id = 'fp-tutorial-style';
    style.textContent = `
      .fp-popover.driver-popover {
        background: #fff !important;
        border-radius: 14px !important;
        padding: 20px !important;
        max-width: 300px !important;
        font-family: -apple-system, system-ui, sans-serif !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.28) !important;
      }
      .fp-popover header {
        background: transparent !important;
        color: inherit !important;
        padding: 0 !important;
        margin: 0 !important;
        height: auto !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        position: static !important;
        width: auto !important;
        flex-shrink: unset !important;
      }
      .fp-popover .driver-popover-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #0b559e !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1.3 !important;
        flex: 1 !important;
      }
      .fp-popover .driver-popover-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #0b559e !important;
        margin: 0 !important;
        padding: 0 !important;
        padding-right: 24px !important;
        line-height: 1.3 !important;
        flex: 1 !important;
      }
      .fp-popover .driver-popover-close-btn {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        color: #bbb !important;
        font-size: 16px !important;
      }
      .fp-popover .driver-popover-close-btn:hover {
        color: #555 !important;
      }
      .fp-popover .driver-popover-description {
        font-size: 14px !important;
        color: #444 !important;
        line-height: 1.5 !important;
        margin-bottom: 0 !important;
      }
      .fp-popover .driver-popover-footer {
        margin-top: 16px !important;
      }
      .fp-popover .driver-popover-progress-text {
        font-size: 12px !important;
        color: #aaa !important;
      }
      .fp-popover .driver-popover-next-btn {
        background-color: #ffe966 !important;
        color: #222 !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 8px 18px !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        cursor: pointer !important;
      }
      .fp-popover .driver-popover-next-btn:hover {
        background-color: #ffd933 !important;
      }
      .fp-popover .driver-popover-prev-btn {
        background-color: transparent !important;
        color: #0b559e !important;
        border: 1px solid #0b559e !important;
        border-radius: 8px !important;
        padding: 8px 18px !important;
        font-size: 14px !important;
        cursor: pointer !important;
      }
      .fp-popover .driver-popover-prev-btn.driver-popover-btn-disabled {
        display: none !important;
      }
      .driver-active-element {
        outline: none !important;
      }
      .add-item-btn.driver-active-element {
        position: static !important;
        z-index: auto !important;
        transform: none !important;
      }
      #robotFab.driver-no-interaction {
        pointer-events: auto !important;
      }
      #dragHandle.driver-no-interaction {
        pointer-events: auto !important;
      }
      #dayButtonContainer.driver-no-interaction button {
        pointer-events: auto !important;
      }
      #editTextLabel.driver-no-interaction {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getDriver() {
    return window.driver?.js?.driver;
  }

  // ---- setup.html 教學（2 步） ----
  // 修改教學文字請直接改 steps 陣列裡的 title / description
  function startSetupTutorial() {
    const driverFn = getDriver();
    if (!driverFn) return;

    injectStyles();

    const driverObj = driverFn({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '開始規劃 ✈️',
      allowClose: false,
      disableActiveInteraction: true,
      popoverClass: 'fp-popover',
      onDestroyStarted: () => {
        const isLastStep = driverObj.getActiveIndex?.() === 2;
        localStorage.setItem(SETUP_DONE_KEY, '1');
        const btn = document.getElementById('ai-recommend-btn');
        if (btn && btn.classList.contains('_fp_tutorial_show')) {
          btn.classList.remove('show', '_fp_tutorial_show');
        }
        driverObj.destroy();
        if (isLastStep && typeof submitTutorialTemplate === 'function') {
          queueMicrotask(submitTutorialTemplate);
        }
      },
      steps: [
        // ── Step 1：歡迎畫面 ──
        {
          popover: {
            title: '歡迎使用飛遊 ✈️',
            description: '讓 AI 幫你規劃專屬旅程，只需幾個簡單步驟！',
          }
        },
        // ── Step 2：一次框住所有表單欄位 ──
        {
          element: '.form-scroll',
          popover: {
            title: '自定義你的旅程',
            description: '選擇目的地、天數、旅伴與旅遊風格，每項都可以依照你的喜好調整',
            side: 'top',
            align: 'center',
          }
        },
        // ── Step 3：指向 AI 生成按鈕 ──
        {
          element: '#ai-recommend-btn',
          popover: {
            title: '開始規劃 🚀',
            description: '設定完成後，按這裡讓 AI 飛飛幫你生成專屬行程！',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: () => {
            const btn = document.getElementById('ai-recommend-btn');
            if (btn) btn.classList.add('show', '_fp_tutorial_show');
          },
          onDeHighlighted: () => {
            const btn = document.getElementById('ai-recommend-btn');
            if (btn && btn.classList.contains('_fp_tutorial_show')) {
              btn.classList.remove('show', '_fp_tutorial_show');
            }
          }
        },
      ]
    });

    driverObj.drive();
  }

  // ---- index.html 教學（Part 1：AI 對話，共 5 步） ----
  function startIndexTutorial() {
    const driverFn = getDriver();
    if (!driverFn) return;

    injectStyles();

    function cleanupFabStep() {
      document.getElementById('fp-hide-done-btn')?.remove();
      const fab = document.getElementById('robotFab');
      if (!fab) return;
      if (fab._tutorialHandler) {
        fab.removeEventListener('click', fab._tutorialHandler);
        delete fab._tutorialHandler;
      }
    }

    const chatDriver = driverFn({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '下一步',
      allowClose: false,
      disableActiveInteraction: true,
      popoverClass: 'fp-popover',
      onDestroyStarted: () => {
        cleanupFabStep();
        localStorage.setItem(INDEX_DONE_KEY, '1');
        chatDriver.destroy();
      },
      steps: [
        {
          popover: {
            title: '行程已生成 🎉',
            description: 'AI 飛飛已幫你規劃好行程！先來認識一下 AI 對話功能',
          }
        },
        {
          element: '.chat-header',
          popover: {
            title: '🤖 AI 助手飛飛',
            description: '這是你的 AI 旅遊助手！可以問景點推薦、附近美食，或請飛飛幫你修改行程',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '#chatSuggestions',
          popover: {
            title: '💬 快速提問',
            description: '點選這裡的常用問題，一鍵就能快速發問',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: () => {
            // 從 FAB 步驟退回時確保 hide style 已清除
            document.getElementById('fp-hide-done-btn')?.remove();
          },
        },
        {
          element: '.chat-input-bar',
          popover: {
            title: '✏️ 自由對話',
            description: '也可以直接輸入任何問題，飛飛會即時回覆你',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: () => {
            document.getElementById('fp-hide-done-btn')?.remove();
          },
        },
        // ── Step 5：使用者自己點 FAB，結束 Part 1 ──
        {
          element: '#robotFab',
          popover: {
            title: '切換到行程地圖 🗺️',
            description: '點一下這個機器人，切換到行程地圖看看你的旅程吧',
            side: 'top',
            align: 'end',
          },
          onHighlightStarted: () => {
            const style = document.createElement('style');
            style.id = 'fp-hide-done-btn';
            style.textContent = '.fp-popover .driver-popover-next-btn { display: none !important; }';
            document.head.appendChild(style);

            const fab = document.getElementById('robotFab');
            if (!fab) return;
            fab._tutorialHandler = () => {
              cleanupFabStep();
              chatDriver.destroy();
              setTimeout(startMapTutorial, 350);
            };
            fab.addEventListener('click', fab._tutorialHandler, { once: true });
          },
          onDeHighlighted: () => {
            cleanupFabStep();
          },
        },
      ]
    });

    chatDriver.drive();
  }

  // ---- index.html 教學（Part 2：行程地圖） ----
  function startMapTutorial() {
    const driverFn = getDriver();
    if (!driverFn) return;

    function enterEditMode() {
      const label = document.getElementById('editTextLabel');
      if (label && label.textContent.trim() === '編輯') label.click();
    }
    function exitEditMode() {
      const label = document.getElementById('editTextLabel');
      if (label && label.textContent.trim() === '取消') label.click();
    }

    let sheetObs = null;
    let dayHandler = null;
    let editHandler = null;

    function injectHideNavBtns() {
      if (document.getElementById('fp-hide-nav-btns')) return;
      const s = document.createElement('style');
      s.id = 'fp-hide-nav-btns';
      s.textContent = '.fp-popover .driver-popover-navigation-btns { display: none !important; }';
      document.head.appendChild(s);
    }
    function removeHideNavBtns() {
      document.getElementById('fp-hide-nav-btns')?.remove();
    }
    function injectHidePrevBtn() {
      if (document.getElementById('fp-hide-prev-btn')) return;
      const s = document.createElement('style');
      s.id = 'fp-hide-prev-btn';
      s.textContent = '.fp-popover .driver-popover-prev-btn { display: none !important; }';
      document.head.appendChild(s);
    }
    function removeHidePrevBtn() {
      document.getElementById('fp-hide-prev-btn')?.remove();
    }

    function cleanupInteractive() {
      removeHideNavBtns();
      removeHidePrevBtn();
      sheetObs?.disconnect(); sheetObs = null;
      if (dayHandler) { dayHandler.el.removeEventListener('click', dayHandler.fn); dayHandler = null; }
      if (editHandler) { editHandler.el.removeEventListener('click', editHandler.fn); editHandler = null; }
    }

    const mapDriver = driverFn({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '開始探索！',
      allowClose: false,
      disableActiveInteraction: true,
      popoverClass: 'fp-popover',
      onDestroyStarted: () => {
        cleanupInteractive();
        exitEditMode();
        localStorage.setItem(INDEX_DONE_KEY, '1');
        mapDriver.destroy();
      },
      steps: [
        // ── Step 1：使用者自己展開行程清單 ──
        {
          element: '#dragHandle',
          popover: {
            title: '📋 行程清單',
            description: '往上滑展開行程清單，查看每天的詳細行程',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: () => {
            injectHideNavBtns();
            const mc = document.getElementById('mapContainer');
            if (!mc) return;
            if (mc.classList.contains('sheet-half') || mc.classList.contains('sheet-expanded')) {
              setTimeout(() => mapDriver.moveNext(), 300);
              return;
            }
            sheetObs = new MutationObserver(() => {
              if (mc.classList.contains('sheet-half') || mc.classList.contains('sheet-expanded')) {
                sheetObs?.disconnect(); sheetObs = null;
                setTimeout(() => mapDriver.moveNext(), 400);
              }
            });
            sheetObs.observe(mc, { attributes: true, attributeFilter: ['class'] });
          },
          onDeHighlighted: () => {
            sheetObs?.disconnect(); sheetObs = null;
          },
        },
        // ── Step 2：點任一天 ──
        {
          element: '#dayButtonContainer',
          popover: {
            title: '📅 選擇一天',
            description: '點任一天的按鈕進入，就能看到「編輯」按鈕來調整行程',
            side: 'bottom',
            align: 'center',
          },
          onHighlightStarted: () => {
            const container = document.getElementById('dayButtonContainer');
            if (!container) return;
            const fn = (e) => {
              if (e.target.closest('button[data-day-index]')) {
                container.removeEventListener('click', fn);
                dayHandler = null;
                setTimeout(() => mapDriver.moveNext(), 400);
              }
            };
            dayHandler = { el: container, fn };
            container.addEventListener('click', fn);
          },
          onDeHighlighted: () => {
            if (dayHandler) { dayHandler.el.removeEventListener('click', dayHandler.fn); dayHandler = null; }
          },
        },
        // ── Step 3：點「編輯」進入編輯模式 ──
        {
          element: '#editTextLabel',
          popover: {
            title: '✏️ 進入編輯模式',
            description: '點「編輯」，就能拖曳排序、新增景點、刪除不要的',
            side: 'bottom',
            align: 'end',
          },
          onHighlightStarted: () => {
            exitEditMode(); // 若從下一步退回則先重置
            const label = document.getElementById('editTextLabel');
            if (!label) return;
            const fn = () => {
              label.removeEventListener('click', fn);
              editHandler = null;
              setTimeout(() => mapDriver.moveNext(), 400);
            };
            editHandler = { el: label, fn };
            label.addEventListener('click', fn);
          },
          onDeHighlighted: () => {
            if (editHandler) { editHandler.el.removeEventListener('click', editHandler.fn); editHandler = null; }
          },
        },
        // ── Steps 4-6：編輯模式展示（不可互動，恢復 nav buttons）──
        {
          element: '.drag-handle',
          popover: {
            title: '↕️ 拖曳排序',
            description: '長按並拖曳可以調整景點的先後順序',
            side: 'left',
            align: 'center',
          },
          onHighlightStarted: () => { removeHideNavBtns(); injectHidePrevBtn(); enterEditMode(); },
          onDeHighlighted: () => { removeHidePrevBtn(); },
        },
        {
          element: '.delete-btn',
          popover: {
            title: '🗑️ 刪除景點',
            description: '點垃圾桶圖示可以從行程中移除這個景點',
            side: 'left',
            align: 'center',
          },
          onHighlightStarted: () => { enterEditMode(); },
        },
        {
          element: '.add-item-btn',
          popover: {
            title: '➕ 新增景點',
            description: '點這裡可以搜尋附近地點，把喜歡的景點加入今天行程',
            side: 'bottom',
            align: 'center',
          },
          onHighlightStarted: () => {
            enterEditMode();
            // driver.js 用 inline !important style 強制加 position/z-index，
            // CSS !important 贏不了，只能用 JS 在 render 前直接清掉
            queueMicrotask(() => {
              const btn = document.querySelector('.add-item-btn');
              if (!btn) return;
              btn.classList.remove('driver-active-element', 'driver-no-interaction');
              btn.style.removeProperty('position');
              btn.style.removeProperty('z-index');
            });
          },
          onDeHighlighted: () => { exitEditMode(); },
        },
        // ── Step 7：介紹交通（edit mode 已在上一步離開）──
        {
          element: '.transit-route-link',
          popover: {
            title: '🚗 查看路線',
            description: '點景點之間的「路線」，可以切換步行、大眾運輸、駕車等方式，並在地圖上查看路線',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '.menu-btn',
          popover: {
            title: '☰ 我的行程',
            description: '點這裡管理所有行程、開始新旅程',
            side: 'bottom',
            align: 'start',
          }
        },
        {
          element: 'header .action-btn',
          popover: {
            title: '📥 下載 PDF',
            description: '行程規劃完成後，可以下載精美的 PDF 行程單！',
            side: 'bottom',
            align: 'end',
          }
        },
      ]
    });

    mapDriver.drive();
  }

  // ---- 初始化：判斷目前頁面 ----
  function init() {
    const path = window.location.pathname;

    if (path.includes('setup')) {
      if (!localStorage.getItem(SETUP_DONE_KEY)) {
        setTimeout(startSetupTutorial, 700);
      }
    } else if (
      path.includes('index') ||
      path.endsWith('/') ||
      path.endsWith('/UI') ||
      path.endsWith('/UI/')
    ) {
      if (!localStorage.getItem(INDEX_DONE_KEY)) {
        setTimeout(startIndexTutorial, 2500);
      }
    }
  }

  // 公開函數：可從任何地方重新啟動教學
  window.restartTutorial = function () {
    const path = window.location.pathname;
    if (path.includes('setup')) {
      localStorage.removeItem(SETUP_DONE_KEY);
      startSetupTutorial();
    } else {
      localStorage.removeItem(INDEX_DONE_KEY);
      startIndexTutorial();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
