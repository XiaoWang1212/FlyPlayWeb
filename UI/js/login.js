const API_URL = "http://localhost:5001/api/auth/login"; // 如有反向代理請調整
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const fillDemoBtn = document.getElementById("fillDemo");

fillDemoBtn.addEventListener("click", () => {
  emailInput.value = "test@gmail.com";
  passwordInput.value = "password123";
  errorMsg.textContent = "";
  emailInput.focus();
});

async function onLoginSubmit(e) {
  e.preventDefault();
  errorMsg.style.color = "#e53935";
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
      // 登入成功
      localStorage.setItem("userId", data.data.user.user_id);
      localStorage.setItem("userToken", data.data.token || "");
      errorMsg.style.color = "#2193b0";
      errorMsg.textContent = "登入成功，正在跳轉...";
      setTimeout(() => {
        window.location.href = "index.html";
      }, 600);
    } else {
      errorMsg.textContent = data.message || data.error || "登入失敗";
    }
  } catch (err) {
    errorMsg.textContent = "伺服器連線失敗，請稍後再試";
    console.error(err);
  }
}

loginForm.addEventListener("submit", onLoginSubmit);

// 跟你原本一樣支援 Enter 快速送出
[passwordInput, emailInput].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      onLoginSubmit(new Event("submit", { cancelable: true }));
    }
  });
});
