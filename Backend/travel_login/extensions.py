from pymongo import MongoClient, ASCENDING
from flask import Flask
from authlib.integrations.flask_client import OAuth

oauth = OAuth()

def init_mongo(app: Flask) -> None:
    client = MongoClient(app.config["MONGODB_URI"], serverSelectionTimeoutMS=5000)
    db = client[app.config["MONGODB_NAME"]]
    users = db["users"]
    users.create_index([("email", ASCENDING)], unique=True)

    app.extensions["mongo_client"] = client
    app.extensions["mongo_db"] = db
    app.extensions["users_collection"] = users
    
def init_oauth(app: Flask) -> None:
    oauth.init_app(app)
    
    oauth.register(
        name = "google",
        client_id = app.config["GOOGLE_CLIENT_ID"],
        client_secret = app.config["GOOGLE_CLIENT_SECRET"],
        server_metadata_url = "https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs = {"scope": "openid email profile"},
    )
