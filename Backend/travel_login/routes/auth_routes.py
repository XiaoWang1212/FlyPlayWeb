from flask import render_template, request, redirect, url_for, session, flash, current_app

from ..repositories.user_repo import UserRepository
from ..services.token_service import TokenService
from ..services.email_service import EmailService
from ..services.auth_service import AuthService

def _build_auth_service():
    users = current_app.extensions["users_collection"]
    repo = UserRepository(users)
    token_svc = TokenService(current_app.secret_key)
    email_svc = EmailService(
        gmail_user=current_app.config.get("GMAIL_USER", ""),
        gmail_app_password=current_app.config.get("GMAIL_APP_PASSWORD", ""),
    )
    return AuthService(repo, token_svc, email_svc, url_for)

def register_auth_routes(app):
    def register_page():
        return render_template("register.html")
    app.add_url_rule("/resgister", endpoint="register_page", view_func=register_page, methods=["GET"])

    def register_submit():
        email = request.form.get("email", "").strip()
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if not email or not username or not password:
            flash("請填寫所有欄位")
            return redirect(url_for("register_page"))

        try:
            _build_auth_service().register(email=email, username=username, password=password)
            flash("註冊成功，請先驗證信箱")
            return redirect(url_for("login"))
        except Exception as e:
            msg = str(e)
            if "E11000" in msg and "email" in msg:
                flash("此Eail已被註冊")
            else:
                flash(msg)
            return redirect(url_for("register_page"))
    app.add_url_rule("/register", endpoint="register_submit", view_func=register_submit, methods=["POST"])

    def verify_email(token):
        try:
            _build_auth_service().verify_email(token)
            flash("信箱驗證成功，請登入")
            return redirect(url_for("login"))
        except Exception as e:
            print("驗證錯誤" + str(e))
            flash("驗證連結無效或已過期")
            return redirect(url_for("register_page"))
    app.add_url_rule("/verify_email/<token>", endpoint="verify_email", view_func=verify_email, methods=["GET"])

    def login():
        return render_template("login.html")
    app.add_url_rule("/login", endpoint="login", view_func=login, methods=["GET"])

    def login_submit():
        account = request.form.get("account", "").strip()
        password = request.form.get("password", "").strip()

        ok, msg, user = _build_auth_service().login(account=account, password=password)
        flash(msg)
        if not ok:
            return redirect(url_for("login"))

        session["user_id"] = str(user["_id"])
        session["username"] = user["username"]
        return redirect(url_for("dash_board"))
    app.add_url_rule("/login", endpoint="login_submit", view_func=login_submit, methods=["POST"])

    def logout():
        session.clear()
        flash("已登出")
        return redirect(url_for("home"))
    app.add_url_rule("/logout", endpoint="logout", view_func=logout, methods=["GET"])

    def forgot_page():
        return render_template("forgot_password.html")
    app.add_url_rule("/forgot_password", endpoint="forgot_page", view_func=forgot_page, methods=["GET"])

    def forgot_password_submit():
        email = request.form.get("email", "").strip()
        ok, msg = _build_auth_service().request_password_reset(email)
        flash(msg)
        if not ok:
            return redirect(url_for("login"))
        return redirect(url_for("login"))
    app.add_url_rule("/forgot_password", endpoint="forgot_password_submit", view_func=forgot_password_submit, methods=["POST"])

    def reset_password(token):
        return render_template("reset.html", token=token)
    app.add_url_rule("/reset/<token>", endpoint="reset_password", view_func=reset_password, methods=["GET"])

    def reset_password_submit(token):
        new_pwd = request.form.get("password", "")
        ok, msg, reason = _build_auth_service().reset_password(token=token, new_password=new_pwd)
        flash(msg)
        if ok:
            return redirect(url_for("login"))
        if reason == "expired":
            # 原本 app.py 會 redirect 到 forgot_password_submit(POST)；這裡改成導回忘記密碼頁(GET)比較合理
            return redirect(url_for("forgot_page"))
        return redirect(url_for("login"))
    app.add_url_rule("/reset/<token>", endpoint="reset_password_submit", view_func=reset_password_submit, methods=["POST"])
