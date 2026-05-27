/* ── utils.js ── shared helpers ───────────────────────────────────────────── */

// ── Toast notifications ──────────────────────────────────────────────────────
function ensureToastContainer() {
    let el = document.getElementById('toast-container');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
    }
    return el;
}

export function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

// ── API wrapper ───────────────────────────────────────────────────────────────
const BASE = '/api';

async function request(method, path, body = null, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        ...opts,
    });

    // Token expired – try silent refresh then retry once
    if (res.status === 401 && path !== '/auth/refresh') {
        const refreshed = await silentRefresh();
        if (refreshed) return request(method, path, body, opts);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
    return data;
}

export const api = {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    delete: (path)         => request('DELETE', path),
};

// ── Auth token helpers ────────────────────────────────────────────────────────
export function getAccessToken() {
    return sessionStorage.getItem('accessToken');
}

export function setAccessToken(token) {
    sessionStorage.setItem('accessToken', token);
}

export function clearAccessToken() {
    sessionStorage.removeItem('accessToken');
}

async function silentRefresh() {
    try {
        const data = await request('POST', '/auth/refresh');
        if (data.accessToken) { setAccessToken(data.accessToken); return true; }
    } catch (_) {}
    return false;
}

// ── Auth state ────────────────────────────────────────────────────────────────
export async function requireAuth() {
    try {
        const data = await api.get('/auth/me');
        return data.user;
    } catch (_) {
        window.location.href = '/pages/login.html';
        return null;
    }
}

export function redirectIfAuthed(dest = '/pages/dashboard.html') {
    api.get('/auth/me').then(() => { window.location.href = dest; }).catch(() => {});
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
export function $(selector, root = document) { return root.querySelector(selector); }
export function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }

export function setLoading(btn, loading, text = 'Loading…') {
    if (loading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner spinner-sm"></span> ${text}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || text;
    }
}

export function showEl(el)  { el?.classList.remove('hidden'); }
export function hideEl(el)  { el?.classList.add('hidden'); }
export function toggleEl(el) { el?.classList.toggle('hidden'); }

// ── Format helpers ────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDuration(seconds) {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

export function scoreColor(score) {
    if (score >= 8) return 'var(--success)';
    if (score >= 5) return 'var(--warning)';
    return 'var(--danger)';
}

export function scoreLabel(score) {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Work';
}

// ── Avatar initials ───────────────────────────────────────────────────────────
export function initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Score ring SVG ────────────────────────────────────────────────────────────
export function buildScoreRing(score, size = 120, stroke = 8) {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 10) * circ;
    const color = scoreColor(score);
    return `
    <div class="score-ring-wrap" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border-strong)" stroke-width="${stroke}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
          style="transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)"/>
      </svg>
      <span class="score-ring-value">${score}</span>
    </div>`;
}

// ── Debounce ──────────────────────────────────────────────────────────────────
export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ── Password strength ─────────────────────────────────────────────────────────
export function passwordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
        { label: 'Too short',  width: '10%',  color: 'var(--danger)' },
        { label: 'Weak',       width: '25%',  color: 'var(--danger)' },
        { label: 'Fair',       width: '50%',  color: 'var(--warning)' },
        { label: 'Good',       width: '75%',  color: 'var(--warning)' },
        { label: 'Strong',     width: '90%',  color: 'var(--success)' },
        { label: 'Very strong',width: '100%', color: 'var(--success)' },
    ];
    return levels[Math.min(score, 5)];
}