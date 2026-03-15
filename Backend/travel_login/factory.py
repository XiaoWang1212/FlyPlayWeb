import os
from flask import Flask
from dotenv import load_dotenv

from .extensions import init_storage, init_oauth
from .routes.main_routes import register_main_routes
from .routes.auth_routes import register_auth_routes
from .routes.OAuth_routes import register_oauth_routes

def create_app() -> Flask:
    backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(backend_env_path)

    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_secret_key") or os.getenv("SECRET_KEY")

    # Config
    default_auth_db_path = os.path.abspath(os.path.join(app.root_path, "..", "data", "auth_users.db"))
    app.config["AUTH_DB_PATH"] = os.getenv("AUTH_DB_PATH", default_auth_db_path)
    app.config["GMAIL_USER"] = os.getenv("GMAIL_USER", "")
    app.config["GMAIL_APP_PASSWORD"] = os.getenv("GMAIL_APP_PASSWORD", "")
    app.config["GOOGLE_CLIENT_ID"] = os.getenv("GOOGLE_CLIENT_ID", "") or os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
    app.config["GOOGLE_CLIENT_SECRET"] = os.getenv("GOOGLE_CLIENT_SECRET", "") or os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
    

    # Extensions
    init_storage(app)
    init_oauth(app)

    # Routes
    register_main_routes(app)
    register_auth_routes(app)
    register_oauth_routes(app)

    return app
