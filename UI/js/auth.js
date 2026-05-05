// ===== 登入驗證 =====

const userId = Number(localStorage.getItem("userId"));
const token = localStorage.getItem("userToken");

// 未登入直接導向登入頁
if (!userId || !token) window.location.href = "login.html";

let isRedirectingToLogin = false;

// 收到 401 時清除 session 並跳轉登入頁（防止重複觸發）
function redirectToLoginIfUnauthorized(status, body) {
	if (isRedirectingToLogin) return true;
	if (status === 401 || body?.code === 401) {
		isRedirectingToLogin = true;
		localStorage.removeItem("userToken");
		localStorage.removeItem("userId");
		sessionStorage.clear();
		alert("登入已過期，請重新登入");
		window.location.href = "login.html";
		return true;
	}
	return false;
}
