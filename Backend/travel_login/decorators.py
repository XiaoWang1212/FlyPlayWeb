from functools import wraps
from flask import session, flash, redirect, url_for

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            flash("請先登入")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapped
