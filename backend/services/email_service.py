import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def _send_email(to_email: str, subject: str, html_content: str):
    email_host = os.getenv("EMAIL_HOST")
    email_port = os.getenv("EMAIL_PORT")
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASS")

    if not email_host or not email_user or not email_pass:
        print("⚠️ Email configuration missing. Skipping email dispatch.")
        return

    # Normalize port
    try:
        email_port = int(email_port)
    except (ValueError, TypeError):
        email_port = 587

    msg = MIMEMultipart("alternative")
    msg["From"] = f'"Interview Agent" <{email_user}>'
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(html_content, "html"))

    try:
        # Check if port is typically SSL (465) or STARTTLS (587/25)
        if email_port == 465:
            server = smtplib.SMTP_SSL(email_host, email_port, timeout=10)
        else:
            server = smtplib.SMTP(email_host, email_port, timeout=10)
            server.ehlo()
            if server.has_extn("STARTTLS"):
                server.starttls()
                server.ehlo()
        
        server.login(email_user, email_pass)
        server.sendmail(email_user, to_email, msg.as_string())
        server.close()
        print(f"📧 Email sent successfully to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")

def send_verification_email(email: str, name: str, token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5000")
    url = f"{frontend_url}/pages/verify.html?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Welcome, {name}!</h2>
        <p>Click below to verify your account:</p>
        <a href="{url}" style="display:inline-block;padding:12px 24px;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none">Verify email</a>
        <p style="color:#888;font-size:12px;margin-top:24px">Link expires in 24 hours.</p>
    </div>
    """
    _send_email(email, "Verify your account", html)

def send_password_reset_email(email: str, name: str, token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5000")
    url = f"{frontend_url}/pages/reset_password.html?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi {name},</h2>
        <p>Click below to reset your password:</p>
        <a href="{url}" style="display:inline-block;padding:12px 24px;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none">Reset password</a>
        <p style="color:#888;font-size:12px;margin-top:24px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
    """
    _send_email(email, "Reset your password", html)

def send_report_email(email: str, name: str, report: dict, role: str, exp_level: str, report_url: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
        <div style="background:linear-gradient(135deg, #534AB7, #7c3aed);padding:24px;text-align:center;color:white">
            <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em">🎯 Interview Report Ready</h1>
            <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9">{role} ({exp_level} level)</p>
        </div>
        <div style="padding:24px;background:#ffffff;color:#1e293b;line-height:1.6">
            <p style="margin-top:0;font-size:16px">Hello <strong>{name}</strong>,</p>
            <p>Congratulations on completing your interview! Our AI agents have completed evaluating your response transcript, coding output, and MCQ answers.</p>
            
            <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;text-align:center">
                <div style="font-size:36px;font-weight:800;color:#534AB7;line-height:1">{report.get("earnedMarks", 0)}<span style="font-size:18px;color:#64748b;font-weight:600">/{report.get("grandTotal", 60)}</span></div>
                <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px">Earned Marks</div>
                
                <table style="width:100%;margin-top:20px;border-collapse:collapse;font-size:13px">
                    <tr>
                        <td style="padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;font-weight:600;color:#64748b">📝 MCQ Score</td>
                        <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:700;color:#10b981">{report.get("sectionScores", {}).get("mcq", 0)}/10</td>
                    </tr>
                    <tr>
                        <td style="padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;font-weight:600;color:#64748b">💻 Coding Score</td>
                        <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:700;color:#f59e0b">{report.get("sectionScores", {}).get("coding", 0)}/10</td>
                    </tr>
                    <tr>
                        <td style="padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;font-weight:600;color:#64748b">🎥 Video/Verbal Score</td>
                        <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:700;color:#8b5cf6">{report.get("sectionScores", {}).get("video", 0)}/10</td>
                    </tr>
                </table>
            </div>

            <h3 style="font-size:15px;font-weight:700;margin-bottom:8px;color:#0f172a">Evaluation Summary</h3>
            <p style="font-size:14px;color:#334155;margin-bottom:24px;background:#f8fafc;padding:12px;border-radius:8px;border-left:4px solid #534AB7">
                {report.get("summary", "No summary available.")}
            </p>

            <div style="text-align:center;margin:30px 0">
                <a href="{report_url}" style="display:inline-block;padding:14px 28px;background:#534AB7;color:white;font-weight:700;border-radius:8px;text-decoration:none;box-shadow:0 4px 6px -1px rgba(83, 74, 183, 0.2)">View Full Interactive Report →</a>
            </div>
            
            <p style="color:#64748b;font-size:13px;text-align:center;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
                Thank you for using Interviq!
            </p>
        </div>
    </div>
    """
    _send_email(email, "Your AI Interview Report is Ready!", html)
