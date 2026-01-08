import ssl
import smtplib
from email.message import EmailMessage

class EmailService:
    def __init__(self, gmail_user: str, gmail_app_password: str):
        self.gmail_user = gmail_user
        self.gmail_app_password = gmail_app_password

    def send_text_email(self, *, to_email: str, subject: str, body: str) -> None:
        if not self.gmail_user or not self.gmail_app_password:
            # Fail fast with a clear message (better than silent)
            raise RuntimeError("GMAIL_USER / GMAIL_APP_PASSWORD 未設定 (.env)")

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.gmail_user
        msg["To"] = to_email
        msg.set_content(body)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
            smtp.login(self.gmail_user, self.gmail_app_password)
            smtp.send_message(msg)
