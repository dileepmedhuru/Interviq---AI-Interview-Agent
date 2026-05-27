/* ── auth.js ── handles login, signup, forgot/reset password pages ─────────── */
import { authApi } from './api.js';
import { showToast, setLoading, $, setAccessToken, redirectIfAuthed, passwordStrength } from './utils.js';

// ── Redirect already-authed users away from auth pages ───────────────────────
redirectIfAuthed('/pages/dashboard.html');

// ── Determine which page we're on ─────────────────────────────────────────────
const page = document.body.dataset.page; // set via data-page attr on <body>

if (page === 'login')          initLogin();
else if (page === 'signup')    initSignup();
else if (page === 'forgot')    initForgot();
else if (page === 'reset')     initReset();
else if (page === 'verify')    initVerify();

// ────────────────────────────────────────────────────────────────────────────
// LOGIN
// ────────────────────────────────────────────────────────────────────────────
function initLogin() {
    const form    = $('#login-form');
    const emailEl = $('#email');
    const passEl  = $('#password');
    const btn     = $('#submit-btn');
    const errEl   = $('#form-error');

    if (!form) return;

    // Toggle password visibility
    $('#toggle-password')?.addEventListener('click', () => {
        passEl.type = passEl.type === 'password' ? 'text' : 'password';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl?.classList.add('hidden');

        const email    = emailEl.value.trim();
        const password = passEl.value;

        if (!email || !password) { showError(errEl, 'Please fill in all fields.'); return; }

        setLoading(btn, true, 'Signing in…');
        try {
            const data = await authApi.login({ email, password });
            if (data.accessToken) setAccessToken(data.accessToken);
            window.location.href = '/pages/dashboard.html';
        } catch (err) {
            showError(errEl, err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(btn, false, 'Sign in');
        }
    });
}

// ────────────────────────────────────────────────────────────────────────────
// SIGNUP
// ────────────────────────────────────────────────────────────────────────────
function initSignup() {
    const form     = $('#signup-form');
    const passEl   = $('#password');
    const strengthFill  = $('#strength-fill');
    const strengthLabel = $('#strength-label');
    const btn      = $('#submit-btn');
    const errEl    = $('#form-error');

    if (!form) return;

    // Live password strength
    passEl?.addEventListener('input', () => {
        const s = passwordStrength(passEl.value);
        if (strengthFill)  { strengthFill.style.width = s.width; strengthFill.style.background = s.color; }
        if (strengthLabel) { strengthLabel.textContent = s.label; strengthLabel.style.color = s.color; }
    });

    $('#toggle-password')?.addEventListener('click', () => {
        passEl.type = passEl.type === 'password' ? 'text' : 'password';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl?.classList.add('hidden');

        const name     = $('#name').value.trim();
        const email    = $('#email').value.trim();
        const password = passEl.value;
        const confirm  = $('#confirm-password')?.value;

        if (!name || !email || !password) { showError(errEl, 'Please fill in all fields.'); return; }
        if (password.length < 8)          { showError(errEl, 'Password must be at least 8 characters.'); return; }
        if (confirm !== undefined && password !== confirm) { showError(errEl, 'Passwords do not match.'); return; }

        setLoading(btn, true, 'Creating account…');
        try {
            const data = await authApi.register({ name, email, password });
            if (data.accessToken) setAccessToken(data.accessToken);
            window.location.href = '/pages/dashboard.html';
        } catch (err) {
            showError(errEl, err.message || 'Registration failed.');
        } finally {
            setLoading(btn, false, 'Create account');
        }
    });
}

// ────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ────────────────────────────────────────────────────────────────────────────
function initForgot() {
    const form  = $('#forgot-form');
    const btn   = $('#submit-btn');
    const errEl = $('#form-error');
    const ok    = $('#success-msg');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl?.classList.add('hidden');

        const email = $('#email').value.trim();
        if (!email) { showError(errEl, 'Please enter your email.'); return; }

        setLoading(btn, true, 'Sending…');
        try {
            await authApi.forgotPassword(email);
            ok?.classList.remove('hidden');
            form.classList.add('hidden');
        } catch (err) {
            showError(errEl, err.message || 'Something went wrong.');
        } finally {
            setLoading(btn, false, 'Send reset link');
        }
    });
}

// ────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ────────────────────────────────────────────────────────────────────────────
function initReset() {
    const form  = $('#reset-form');
    const btn   = $('#submit-btn');
    const errEl = $('#form-error');
    const ok    = $('#success-msg');

    if (!form) return;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { showError(errEl, 'Invalid or missing reset token.'); return; }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = $('#password').value;
        const confirm  = $('#confirm-password').value;

        if (password.length < 8)    { showError(errEl, 'Password must be at least 8 characters.'); return; }
        if (password !== confirm)   { showError(errEl, 'Passwords do not match.'); return; }

        setLoading(btn, true, 'Resetting…');
        try {
            await authApi.resetPassword({ token, password });
            ok?.classList.remove('hidden');
            form.classList.add('hidden');
            setTimeout(() => { window.location.href = '/pages/login.html'; }, 2500);
        } catch (err) {
            showError(errEl, err.message || 'Reset failed.');
        } finally {
            setLoading(btn, false, 'Reset password');
        }
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFY
// ────────────────────────────────────────────────────────────────────────────
async function initVerify() {
    const token = new URLSearchParams(window.location.search).get('token');
    const statusEl = $('#verify-status');
    if (!statusEl) return;

    if (!token) {
        statusEl.textContent = 'Invalid verification link.';
        statusEl.className = 'alert alert-error';
        return;
    }

    try {
        await authApi.verifyEmail(token);
        statusEl.textContent = 'Email verified! Redirecting to login…';
        statusEl.className = 'alert alert-success';
        setTimeout(() => { window.location.href = '/pages/login.html'; }, 2500);
    } catch (err) {
        statusEl.textContent = err.message || 'Verification failed.';
        statusEl.className = 'alert alert-error';
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showError(el, message) {
    if (!el) { showToast(message, 'error'); return; }
    el.textContent = message;
    el.classList.remove('hidden');
}