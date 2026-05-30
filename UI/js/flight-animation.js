/**
 * flight-animation.js
 * 用 GSAP 驅動的 Catmull-Rom 樣條飛行路徑。
 *
 * 巡迴飛行的機頭角度取自樣條的解析切線（穩定不抖），機頭永遠朝行進方向。
 * 尾跡是「彗星尾」(renderTrail)：把飛機尾端座標存進環狀 Float32Array
 * 緩衝（不會每幀配置記憶體），再畫成一段段 <line>，越往尾端越淡、越細，
 * 任何路徑都適用（曲線巡迴或直線俯衝）。
 *
 * overlay SVG 由本檔 ensureOverlay() 動態注入，所以 setup.html /
 * index.html 不需要任何飛機相關的 HTML 標記。
 */

const PLANE_CX = 310;
const PLANE_CY = 177;
const TRAIL_MAX = 90;

// 加到「行進方向角度」上的旋轉量（度），讓飛機圖案畫出來的機頭對齊
// 實際飛行方向。視覺微調用：調大 = 順時針，調小 = 逆時針。
const PLANE_NOSE_OFFSET = 33;

// 俯衝（index 進場）時機頭固定的旋轉角度（度）。直直向下 = 行進角 90°
// 再加上機頭補正。獨立成一個常數，若覺得沒有完全垂直就改這個數字。
const DIVE_NOSE_DEG = 93 + PLANE_NOSE_OFFSET;

// 尾跡起點往機身後方退多少（SVG 單位），讓尾跡從機尾冒出而不是機身中段。
const TAIL_OFFSET = 30;

// 飛機停機點與「抵達機場」選擇器頂端之間保留的間距（螢幕 px），
// 確保任何螢幕尺寸下飛機都不會壓到選擇器。
const HOME_GAP_PX = 60;

// 尾跡座標的環狀緩衝 — 不會每幀配置記憶體
const trailX = new Float32Array(TRAIL_MAX);
const trailY = new Float32Array(TRAIL_MAX);
let trailHead = 0;
let trailCount = 0;

// 快取的 DOM 參照，動畫啟動時填入
let elSvg = null;
let elTrail = null;
let elMover = null;
let elPlane = null;

let flightTimeline = null;

// 封閉迴圈的 Catmull-Rom 控制點（SVG 602×1024 座標空間）。
// index 0（home）會依螢幕重新計算。控制點繞螢幕中心「順時針、角度單調
// 遞增」排列（不來回折返），所以每個彎都是大鈍角弧、不會出現銳角 V。
// 半徑刻意有大有小，讓飛機在「畫面內掃過」與「飛出 viewBox」之間交錯。
const SPLINE_PTS = [
  { x: PLANE_CX, y: PLANE_CY }, // 0: home（上方，動態，在抵達機場上面）
  { x:  660, y: 110 },          // 1: 右上 — 飛出畫面（淺）
  { x:  480, y: 430 },          // 2: 右   — 畫面內
  { x:  700, y: 780 },          // 3: 右下 — 飛出畫面（淺）
  { x:  300, y: 900 },          // 4: 下   — 畫面內
  { x:   90, y: 760 },          // 5: 左下 — 畫面內
  { x: -180, y: 420 },          // 6: 左   — 飛出畫面
  { x:  170, y: 190 },          // 7: 左上 — 畫面內，繞回 home
];

// 在參數 t ∈ [0, SPLINE_PTS.length) 求封閉 Catmull-Rom 樣條的位置 + 切線
function evalSpline(t) {
  const n = SPLINE_PTS.length;
  const i1 = Math.floor(t) % n;
  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;
  const u = t - Math.floor(t);
  const u2 = u * u;
  const u3 = u2 * u;
  const p0 = SPLINE_PTS[i0], p1 = SPLINE_PTS[i1];
  const p2 = SPLINE_PTS[i2], p3 = SPLINE_PTS[i3];
  const ax = -p0.x + 3 * p1.x - 3 * p2.x + p3.x;
  const bx =  2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x;
  const cx = -p0.x + p2.x;
  const ay = -p0.y + 3 * p1.y - 3 * p2.y + p3.y;
  const by =  2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y;
  const cy = -p0.y + p2.y;
  return {
    x: 0.5 * (2 * p1.x + cx * u + bx * u2 + ax * u3),
    y: 0.5 * (2 * p1.y + cy * u + by * u2 + ay * u3),
    // 對 u 的導數 → 行進方向
    tx: 0.5 * (cx + 2 * bx * u + 3 * ax * u2),
    ty: 0.5 * (cy + 2 * by * u + 3 * ay * u2),
  };
}

// 樣條參數 t 處的飛機旋轉角（度），與動畫採同一套換算，
// 讓停機時的機頭角度跟起飛瞬間完全一致。
function headingAt(t) {
  const s = evalSpline(t);
  return Math.atan2(s.ty, s.tx) * (180 / Math.PI) + PLANE_NOSE_OFFSET;
}

const tProxy = { t: 0 };

const SVGNS = 'http://www.w3.org/2000/svg';

// 飛機 overlay 的 HTML（含尾跡柔光 filter、尾跡群組、飛機本體）。
// 由 ensureOverlay() 注入，setup.html / index.html 因此保持乾淨。
const OVERLAY_HTML =
  '<svg id="bg-plane-svg" xmlns="http://www.w3.org/2000/svg" ' +
  'viewBox="0 0 602 1024" preserveAspectRatio="xMidYMid slice" ' +
  'style="position:fixed;inset:0;width:100%;height:100%;' +
  'pointer-events:none;z-index:5;overflow:visible;opacity:0;">' +
  '<defs>' +
  '<filter id="plane-shadow" x="-40%" y="-40%" width="180%" height="180%">' +
  '<feDropShadow dx="3" dy="5" stdDeviation="0" ' +
  'flood-color="rgba(0,20,60,0.75)" flood-opacity="0.5"/></filter></defs>' +
  '<g id="plane-trail"></g>' +
  '<g id="plane-mover" transform="translate(310, 177)">' +
  '<g transform="translate(-310, -177)">' +
  '<path id="bg-plane" fill="#F6D350" filter="url(#plane-shadow)" ' +
  'opacity="0.35" d="M326.452 160.15C327.025 159.993 327.638 159.939 328.216 160.088C328.795 160.237 329.288 160.573 329.607 161.052C329.926 161.53 330.052 162.125 329.98 162.735C329.908 163.346 329.64 163.918 329.292 164.413C328.913 164.95 328.517 165.465 328.106 165.955C326.912 167.381 325.587 168.61 324.131 169.643C322.917 170.504 321.694 171.354 320.469 172.199L320.986 193.011L318.095 195L313.333 176.991C309.212 179.685 305.035 182.294 300.797 184.811C300.725 184.854 300.653 184.896 300.58 184.939C300.761 186.521 300.868 188.117 300.896 189.725C300.901 189.989 300.903 190.255 300.904 190.519C300.079 190.661 299.255 190.802 298.431 190.944C298.348 190.693 298.267 190.442 298.188 190.191C297.754 188.802 297.383 187.401 297.074 185.991C296.56 185.818 296.113 185.482 295.807 185.023C295.528 184.604 295.381 184.108 295.379 183.6C294.106 182.914 292.86 182.166 291.643 181.353C291.428 181.21 291.213 181.064 291 180.916C291.346 180.132 291.692 179.347 292.038 178.563C292.286 178.631 292.533 178.702 292.779 178.775C294.411 179.257 296.005 179.825 297.56 180.481C297.635 180.418 297.711 180.355 297.786 180.293C301.492 177.187 305.255 174.166 309.074 171.228L293.447 162.333L296.186 160.45L296.422 160.288L316.288 165.826C317.477 164.96 318.67 164.1 319.87 163.249C321.326 162.216 322.913 161.38 324.631 160.741C325.222 160.521 325.83 160.323 326.452 160.15Z"/>' +
  '</g></g></svg>';

// 確保 overlay 存在；不存在就注入到 <body> 最前面。
// 回傳是否為 setup 頁（有 AI 推薦按鈕）。
function ensureOverlay() {
  const isSetup = !!document.getElementById('ai-recommend-btn');
  if (!document.getElementById('bg-plane-svg')) {
    const tpl = document.createElement('div');
    tpl.innerHTML = OVERLAY_HTML;
    const svg = tpl.firstElementChild;
    document.body.insertBefore(svg, document.body.firstChild);
    // setup：停機飛機要看得見（機身本身用 opacity 0.35 偏暗）。
    // 其他頁：先隱藏，等俯衝 (flyInFromTop) 才顯示。
    svg.style.opacity = isSetup ? '1' : '0';
  }
  return isSetup;
}

// 共用彗星尾。把尾跡緩衝最近的 n 個點畫成 #plane-trail 群組內的一段段
// <line>，每段往尾端「透明度淡出」且「寬度收細」—— 任何路徑都成立。
// 線段物件池重用，不會每幀配置記憶體。
function hideTrail() {
  const segs = elTrail && elTrail.__segs;
  if (segs) for (const ln of segs) ln.setAttribute('stroke-opacity', '0');
}

// 把一個尾跡點寫進環狀緩衝（三種飛行模式共用，避免重複）。
function pushTrail(tx, ty) {
  trailX[trailHead] = tx;
  trailY[trailHead] = ty;
  trailHead = (trailHead + 1) % TRAIL_MAX;
  if (trailCount < TRAIL_MAX) trailCount++;
}

function renderTrail(n, baseWidth) {
  if (!elTrail || n < 2) { hideTrail(); return; }
  let segs = elTrail.__segs || (elTrail.__segs = []);
  const segCount = n - 1;
  while (segs.length < segCount) {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('stroke-linecap', 'round');
    elTrail.appendChild(ln);
    segs.push(ln);
  }
  for (let i = 0; i < segs.length; i++) {
    const ln = segs[i];
    if (i >= segCount) { ln.setAttribute('stroke-opacity', '0'); continue; }
    const a = ((trailHead - 1 - i) + TRAIL_MAX) % TRAIL_MAX; // 較新的一端
    const b = ((trailHead - 2 - i) + TRAIL_MAX) % TRAIL_MAX; // 較舊的一端
    const frac = i / segCount;                 // 0 = 機身處，1 = 尾端
    ln.setAttribute('x1', trailX[a].toFixed(1));
    ln.setAttribute('y1', trailY[a].toFixed(1));
    ln.setAttribute('x2', trailX[b].toFixed(1));
    ln.setAttribute('y2', trailY[b].toFixed(1));
    ln.setAttribute('stroke', '#FFFFFF');
    ln.setAttribute('stroke-width', (baseWidth * (1 - frac) + 1.2).toFixed(2));
    ln.setAttribute('stroke-opacity', Math.pow(1 - frac, 1.5).toFixed(3));
  }
}

function onPlaneTick() {
  const s = evalSpline(tProxy.t);
  const x = s.x, y = s.y;

  // 用解析切線取得行進方向（單位向量）
  let ux = s.tx, uy = s.ty;
  const len = Math.hypot(ux, uy) || 1;
  ux /= len; uy /= len;
  const travelDeg = Math.atan2(uy, ux) * (180 / Math.PI);

  // 尾跡錨點 = 機尾 = 機身中心往 -行進方向退 TAIL_OFFSET
  const tailX = x - ux * TAIL_OFFSET;
  const tailY = y - uy * TAIL_OFFSET;

  pushTrail(tailX, tailY);
  renderTrail(trailCount, 7);

  // 機頭跟著行進方向
  if (elMover) {
    const angle = travelDeg + PLANE_NOSE_OFFSET;
    elMover.setAttribute('transform',
      `translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
  }
}

// 螢幕座標 → 此 SVG 的使用者座標，會考慮 preserveAspectRatio="slice" 的縮放
function screenToSvg(clientX, clientY) {
  if (!elSvg || !elSvg.getScreenCTM) return null;
  const ctm = elSvg.getScreenCTM();
  if (!ctm) return null;
  const pt = elSvg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

// SVG 使用者座標 → 螢幕 px，screenToSvg 的反向。
function svgToScreen(x, y) {
  if (!elSvg || !elSvg.getScreenCTM) return null;
  const ctm = elSvg.getScreenCTM();
  if (!ctm) return null;
  const pt = elSvg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const p = pt.matrixTransform(ctm);
  return { x: p.x, y: p.y };
}

// 停機位置：任何螢幕下都置中於「抵達機場」選擇器上方。
function computeHome() {
  const group = document.querySelector('.container .form-group');
  if (group) {
    const r = group.getBoundingClientRect();
    const svgPt = screenToSvg(r.left + r.width / 2, r.top - HOME_GAP_PX);
    if (svgPt) return svgPt;
  }
  return { x: PLANE_CX, y: PLANE_CY };
}

function applyHome() {
  const home = computeHome();
  SPLINE_PTS[0].x = home.x;
  SPLINE_PTS[0].y = home.y;
  return home;
}

function resetTrail() {
  trailHead = 0;
  trailCount = 0;
  hideTrail();
  if (elMover) {
    const h = SPLINE_PTS[0];
    elMover.setAttribute('transform',
      `translate(${h.x},${h.y}) rotate(${headingAt(0).toFixed(1)})`);
  }
}

function onResize() {
  applyHome();
  // 閒置時讓停好的飛機持續待在選擇器上方
  if (!flightTimeline || flightTimeline.paused()) resetTrail();
}

function cacheEls() {
  elSvg = document.getElementById('bg-plane-svg');
  elTrail = document.getElementById('plane-trail');
  elMover = document.getElementById('plane-mover');
  elPlane = document.getElementById('bg-plane');
}

// 開頁時：把（偏暗的）飛機停在動畫起點，而不是 SVG 寫死的位置；
// 並在換螢幕尺寸時持續停在那裡。
function initPlaneRest() {
  cacheEls();
  applyHome();
  resetTrail();
  window.addEventListener('resize', onResize);
}

// 同一套渲染、兩個頁面。setup.html 停機/巡迴飛行（需要完整版面 + 字型
// → 等 load）；index.html 透過飛機交接進來，接續同一台飛機 + 尾跡俯衝
// 下來 —— DOM 一解析完就開始，避免圖片/地圖載入時整頁空白。
(function bootPlane() {
  const isSetup = ensureOverlay();
  const handedOff = sessionStorage.getItem('navigationType') === 'planeLead';

  if (isSetup) {
    if (document.readyState === 'complete') initPlaneRest();
    else window.addEventListener('load', initPlaneRest);
  } else if (handedOff) {
    flyInFromTop();
  }
})();

function startPlaneAnim() {
  cacheEls();
  applyHome();

  // 啟動時把飛機提亮
  if (elPlane) gsap.to(elPlane, { opacity: 1, duration: 0.6, ease: 'power2.out' });

  if (flightTimeline) {
    resetTrail();
    flightTimeline.play(0);
    return;
  }

  resetTrail();
  tProxy.t = 0;

  flightTimeline = gsap.to(tProxy, {
    t: SPLINE_PTS.length,
    duration: 12, // 一圈的時間
    ease: 'none',
    repeat: -1,
    onUpdate: onPlaneTick,
  });
}

function stopPlaneAnim() {
  if (elPlane) gsap.to(elPlane, { opacity: 0.35, duration: 1, ease: 'power2.in' });

  if (flightTimeline) flightTimeline.pause();

  gsap.to(tProxy, {
    t: 0,
    duration: 1.8,
    ease: 'power2.inOut',
    onUpdate: onPlaneTick,
    onComplete: resetTrail,
  });
}

// 交接給 index.html：飛機沿弧線爬升、加速飛出畫面上方（尾跡跟著），
// 完全離場後導向 index.html —— 由 index 接手讓飛機從上方俯衝下來、
// 內容跟在飛機後方滑入（見 index.html head 內的前置 script）。
function flyToIndex() {
  cacheEls();
  if (flightTimeline) flightTimeline.kill();

  // 離場期間把飛機 overlay 拉到所有圖層之上
  if (elSvg) elSvg.style.zIndex = '99999';

  // 離場期間擋住點擊，避免表單被重複送出
  const guard = document.createElement('div');
  guard.style.cssText =
    'position:fixed;inset:0;z-index:99980;pointer-events:auto;background:transparent;';
  document.body.appendChild(guard);

  // 目前飛機位置（SVG 座標）→ 螢幕上方中央外的一點
  const cur = evalSpline(tProxy.t);
  const topExit = screenToSvg(window.innerWidth / 2, -220) ||
    { x: PLANE_CX, y: -220 };

  const p = { x: cur.x, y: cur.y };
  let lastX = cur.x, lastY = cur.y;

  function drawPlane() {
    const dx = p.x - lastX, dy = p.y - lastY;
    let angle = headingAt(0);
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      angle = Math.atan2(dy, dx) * (180 / Math.PI) + PLANE_NOSE_OFFSET;
    }
    if (elMover) {
      elMover.setAttribute('transform',
        `translate(${p.x.toFixed(2)},${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
    }
    const len = Math.hypot(dx, dy) || 1;
    pushTrail(p.x - (dx / len) * TAIL_OFFSET, p.y - (dy / len) * TAIL_OFFSET);
    renderTrail(trailCount, 7);
    lastX = p.x; lastY = p.y;
  }

  // 爬升離場走二次貝茲：控制點放在飛機「當前航向」延伸處，所以起手
  // 不打折，再平滑彎成一個大鈍角弧線到上方 —— 不會有銳角。
  let tlen = Math.hypot(cur.tx, cur.ty) || 1;
  const ctrl = {
    x: cur.x + (cur.tx / tlen) * 240,
    y: cur.y + (cur.ty / tlen) * 240,
  };
  const bez = { u: 0 };

  // 放慢方便檢查 — 確認 OK 後再調回正常速度
  const EXIT_DUR = 1.8;

  // 表單不要「啪」一聲消失：跟著飛機一起被帶走 —— 淡出 + 上飄 + 微縮，
  // 在跳轉前就收乾淨。
  const formEl = document.querySelector('.container');

  const tl = gsap.timeline();
  tl.to(bez, {
    u: 1,
    duration: EXIT_DUR,
    ease: 'power2.in',
    onUpdate: () => {
      const u = bez.u, iu = 1 - u;
      p.x = iu * iu * cur.x + 2 * iu * u * ctrl.x + u * u * topExit.x;
      p.y = iu * iu * cur.y + 2 * iu * u * ctrl.y + u * u * topExit.y;
      drawPlane();
    },
  }, 0);

  if (formEl) {
    tl.to(formEl, {
      opacity: 0,
      y: -70,
      scale: 0.94,
      transformOrigin: '50% 30%',
      duration: EXIT_DUR * 0.7,
      ease: 'power2.in',
    }, 0);
  }

  tl.call(() => {
    sessionStorage.setItem('navigationType', 'planeLead');
    window.location.href = 'index.html';
  });
}

function testPlaneAnim() {
  if (flightTimeline && !flightTimeline.paused()) {
    flyToIndex();
  } else {
    startPlaneAnim();
  }
}

// index.html 進場 —— 用「同一套」飛機 + 尾跡渲染接續飛行：飛機從畫面
// 上方直直俯衝下來，內容鎖在飛機後方滑入（飛機永遠領先 LEAD px，內容
// 不可能超車）。與 flyToIndex 的爬升離場銜接。
function flyInFromTop() {
  cacheEls();

  // 保險：絕不讓頁面卡在畫面外
  function revealNow() {
    const st = document.getElementById('planeLeadInit');
    if (st) st.remove();
    document.body.style.transition = '';
    document.body.style.transform = '';
    sessionStorage.removeItem('navigationType');
  }
  if (!elSvg || !elMover || typeof gsap === 'undefined') {
    revealNow();
    return;
  }

  // 關鍵：<body> 一旦有 transform，它就會變成裡面 position:fixed 後代的
  // 容器 —— overlay SVG 會被滑動的內容一起拖走（飛機「消失」、尾跡跟
  // 畫面重疊）。把 SVG 移到 <html> 底下，它才是獨立的全螢幕前景層。
  if (elSvg.parentElement !== document.documentElement) {
    document.documentElement.appendChild(elSvg);
  }

  // 顯示 overlay 並蓋過所有頁面圖層；俯衝不要陰影。
  elSvg.style.opacity = '1';
  elSvg.style.zIndex = '2147483647';
  if (elPlane) {
    elPlane.setAttribute('opacity', '1');
    elPlane.setAttribute('filter', 'none');
  }

  trailHead = 0;
  trailCount = 0;
  hideTrail();

  const cx = window.innerWidth / 2;
  const vh = window.innerHeight;
  const LEAD = 90;        // 飛機領先內容下緣的距離（px）
  const DIVE_TRAIL = 26;  // 俯衝尾跡比巡迴短一些
  const DIVE_SCALE = 1.8; // 俯衝時飛機放大，更有氣勢

  // 內容用純進度數學驅動（一定會滑進來）。飛機再依目標螢幕 y 反推到
  // SVG 座標來領先它（沒有 CTM 時退化為線性對應）。
  function screenYToSvg(screenY) {
    const s = screenToSvg(cx, screenY);
    if (s) return s;
    return { x: PLANE_CX, y: (screenY / vh) * 1024 };
  }

  function frame(e) {
    // 飛機從畫面上方掃到下方
    const planeScreenY = -140 + (vh + 280) * e;
    // 內容下緣落後飛機 LEAD
    let bodyTY = (planeScreenY - LEAD) - vh;
    if (bodyTY < -vh) bodyTY = -vh;
    if (bodyTY > 0) bodyTY = 0;
    document.body.style.transform = `translateY(${bodyTY.toFixed(1)}px)`;

    // 垂直直線俯衝（不偏移）
    const sp = screenYToSvg(planeScreenY);
    const px = sp.x;
    const py = sp.y;

    // 俯衝是已知的「正下方」，機頭角度直接鎖固定值，不靠每幀位移
    // 反推（避免微小位移造成的角度抖動／歪掉）。
    elMover.setAttribute('transform',
      `translate(${px.toFixed(2)},${py.toFixed(2)}) ` +
      `rotate(${DIVE_NOSE_DEG}) scale(${DIVE_SCALE})`);

    // 尾跡錨點：機身正上方 TAIL_OFFSET（因為一路朝正下方飛）
    pushTrail(px, py - TAIL_OFFSET);
    renderTrail(Math.min(trailCount, DIVE_TRAIL), 14);
  }

  function cleanup() {
    if (elSvg) elSvg.style.opacity = '0';
    const initStyle = document.getElementById('planeLeadInit');
    if (initStyle) initStyle.remove();
    document.documentElement.style.background = ''; // 還原 index 自己的底色
    document.body.style.transition = '';
    document.body.style.transform = '';
    sessionStorage.removeItem('navigationType');
  }

  frame(0); // 第一幀前先把內容釘在畫面外

  const bez = { u: 0 };
  const DIVE_DUR = 1.8; // 放慢方便檢查

  gsap.to(bez, {
    u: 1,
    duration: DIVE_DUR,
    ease: 'power1.inOut', // 進場加速、結尾收住
    onUpdate: () => frame(bez.u),
    onComplete: cleanup,
  });
}
