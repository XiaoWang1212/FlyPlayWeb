from typing import Callable, Tuple, Optional
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import BadSignature, SignatureExpired

class AuthService:
    def __init__(self, user_repo, token_svc, email_svc, url_builder: Callable[..., str]):
        self.user_repo = user_repo
        self.token_svc = token_svc
        self.email_svc = email_svc
        self.url_builder = url_builder  # usually flask.url_for

    def register(self, *, email: str, username: str, password: str) -> None:
        password_hash = generate_password_hash(password)
        token = self.token_svc.make_email_confirm_token(email)
        self.user_repo.create_user(
            email=email,
            username=username,
            password_hash=password_hash,
            verify_token=token,
        )

        verify_url = self.url_builder("verify_email", token=token, _external=True)
        self.email_svc.send_text_email(
            to_email=email,
            subject="請驗證您的帳號",
            body=f"請點擊以下連結驗證您的信箱：\n{verify_url}",
        )

    def verify_email(self, token: str, *, max_age: int = 3600) -> str:
        email = self.token_svc.load_email_confirm_token(token, max_age=max_age)
        self.user_repo.mark_verified(email)
        return email

    def login(self, *, account: str, password: str) -> Tuple[bool, str, Optional[dict]]:
        user = self.user_repo.find_by_email(account)
        if (not user) or (not check_password_hash(user["password"], password)):
            return False, "帳號或密碼錯誤", None
        if not user.get("verified", False):
            return False, "請先驗證信箱", None
        return True, "登入成功", user

    def request_password_reset(self, email: str) -> Tuple[bool, str]:
        user = self.user_repo.find_by_email(email)
        if not user or user.get("verified") is False:
            return False, "無此帳號"

        token = self.token_svc.make_reset_token({"uid": str(user["_id"]), "email": email})
        reset_url = self.url_builder("reset_password", token=token, _external=True)

        self.email_svc.send_text_email(
            to_email=email,
            subject="密碼重設通知",
            body=f"請點擊以下連結重設您的密碼：\n{reset_url}",
        )
        return True, "重設密碼信件已寄出，請檢查您的信箱"

    def reset_password(self, *, token: str, new_password: str, max_age: int = 3600) -> Tuple[bool, str, Optional[str]]:
        if not new_password or len(new_password) < 8:
            return False, "密碼長度不足", None

        try:
            data = self.token_svc.load_reset_token(token, max_age=max_age)
        except SignatureExpired:
            return False, "密碼連結已過期請重試", "expired"
        except BadSignature:
            return False, "連結不正確", "invalid"

        self.user_repo.update_password_hash(
            data["email"],
            generate_password_hash(new_password)
        )
        return True, "密碼已更新，請用新密碼登入。", None
