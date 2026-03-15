import sqlite3
from pathlib import Path
from flask import Flask
from authlib.integrations.flask_client import OAuth

oauth = OAuth()

def init_storage(app: Flask) -> None:
    db_path = Path(app.config["AUTH_DB_PATH"])
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 0,
            verify_token TEXT,
            google_id TEXT UNIQUE,
            thumbnail TEXT
        )
        """
    )
    conn.commit()

    app.extensions["users_collection"] = conn
    app.extensions["db_conn"] = conn
    
def init_oauth(app: Flask) -> None:
    oauth.init_app(app)

    client_id = app.config.get("GOOGLE_CLIENT_ID", "")
    client_secret = app.config.get("GOOGLE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        app.config["GOOGLE_OAUTH_ENABLED"] = False
        return

    app.config["GOOGLE_OAUTH_ENABLED"] = True
    
    oauth.register(
        name = "google",
        client_id = client_id,
        client_secret = client_secret,
        server_metadata_url = "https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs = {"scope": "openid email profile"},
    )
