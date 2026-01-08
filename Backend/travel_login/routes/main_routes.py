from flask import render_template, session
from ..decorators import login_required

def register_main_routes(app):
    def home():
        return render_template("home.html", user=session.get("username"))
    app.add_url_rule("/", endpoint="home", view_func=home, methods=["GET"])

    @login_required
    def dash_board():
        return render_template("dash_board.html", user=session.get("username"))
    app.add_url_rule("/dash_board", endpoint="dash_board", view_func=dash_board, methods=["GET"])

    def respond():
        return render_template("response.html")
    app.add_url_rule("/response", endpoint="respond", view_func=respond, methods=["GET"])
