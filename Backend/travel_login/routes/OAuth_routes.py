from flask import current_app, redirect, url_for, session, flash
from ..extensions import oauth
from ..repositories.user_repo import UserRepository
from ..services.OAuth_service import OAuthService

def register_oauth_routes(app):
    @app.get("/login/google")
    def google_login():
       redirect_uri = url_for("google_callback", _external=True)
       return oauth.google.authorize_redirect(redirect_uri)

    
    def google_callback():
        try:
            token = oauth.google.authorize_access_token()
            userinfo = token.get("userinfo")
            
            if not userinfo:
                userinfo = oauth.google.userinfo()
            
            google_id = userinfo.get("sub")
            email = userinfo.get("email")
            name = userinfo.get("name") or (email.split("@")[0] if email else "GoogleUser")
            picture = userinfo.get("picture")
            
            users = current_app.extensions["users_collection"]
            repo = UserRepository(users)
            svc = OAuthService(repo)
            
            user = svc.login_or_link_google_user(
                google_id = google_id,
                email = email,
                username = name,
                thumbnail = picture,
            )
            
            session["user_id"] = str(user["_id"])
            session["username"] = user.get("username", name)
            flash("Google 登入成功")
            return redirect(url_for("dash_board"))
        except Exception as e:
            flash("Google 登入失敗")
            print("OAuth error", e)
            return redirect(url_for("login"))
    app.add_url_rule("/auth/google/callback", endpoint = "google_callback", view_func = google_callback, methods = ["GET"])    