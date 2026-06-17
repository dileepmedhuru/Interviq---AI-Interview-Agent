const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(email, name, token) {
    const url = `${process.env.FRONTEND_URL}/pages/verify.html?token=${token}`;
    await transporter.sendMail({
        from: `"Interview Agent" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your account',
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Welcome, ${name}!</h2>
        <p>Click below to verify your account:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none">Verify email</a>
        <p style="color:#888;font-size:12px;margin-top:24px">Link expires in 24 hours.</p>
      </div>`,
    });
}

async function sendPasswordResetEmail(email, name, token) {
    const url = `${process.env.FRONTEND_URL}/pages/reset_password.html?token=${token}`;
    await transporter.sendMail({
        from: `"Interviq" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset your password',
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Hi ${name},</h2>
        <p>Click below to reset your password:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none">Reset password</a>
        <p style="color:#888;font-size:12px;margin-top:24px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>`,
    });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };