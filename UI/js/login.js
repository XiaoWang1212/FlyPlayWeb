const API_URL = "http://localhost:5001/api/auth/login"; // 如有反向代理請調整

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const fillDemoBtn = document.getElementById("fillDemo");

// 一鍵填入測試帳號
fillDemoBtn.addEventListener("click", () => {
  emailInput.value = "test@gmail.com";
  passwordInput.value = "password123";
  errorMsg.textContent = "";
  emailInput.focus();
});

// 表單送出
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    errorMsg.textContent = "請輸入 Email 與密碼";
    return;
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.code === 200) {
      // 登入成功，導向首頁或 dashboard
      errorMsg.style.color = "#2193b0";
      errorMsg.textContent = "登入成功，正在跳轉...";
      setTimeout(() => {
        window.location.href = "setup.html";
      }, 800);
    } else {
      errorMsg.style.color = "#e53935";
      errorMsg.textContent = data.message || data.error || "登入失敗";
    }
  } catch (err) {
    errorMsg.style.color = "#e53935";
    errorMsg.textContent = "伺服器連線失敗，請稍後再試";
  }
});

// 支援 Enter 快速送出
[passwordInput, emailInput].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      loginForm.dispatchEvent(new Event("submit"));
    }
  });
});
