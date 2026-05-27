/* ── dashboard.js ─────────────────────────────────────────────────────────── */
import { userApi, resumeApi, interviewApi } from './api.js';
import { requireAuth, showToast, $, $$, formatDate, formatDuration, scoreColor, scoreLabel, initials, buildScoreRing, setLoading, hideEl, showEl } from './utils.js';

let currentUser = null;

(async () => {
    currentUser = await requireAuth();
    if (!currentUser) return;

    renderNav();
    await Promise.all([loadStats(), loadRecentInterviews()]);
    setupNewInterviewForm();
    setupLogout();
    setupResumeUpload();
})();

// ── Nav ───────────────────────────────────────────────────────────────────────
function renderNav() {
    const avatarEl = $('#nav-avatar');
    const nameEl   = $('#nav-name');
    if (avatarEl) avatarEl.textContent = initials(currentUser.name);
    if (nameEl)   nameEl.textContent   = currentUser.name;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const { stats } = await userApi.getStats();

        setText('#stat-total',     stats.total ?? 0);
        setText('#stat-completed', stats.completed ?? 0);
        setText('#stat-avg',       stats.avgScore ? `${stats.avgScore}/10` : '—');
        setText('#stat-best',      stats.best ? `${stats.best}/10` : '—');

        renderTrend(stats.trend || []);
    } catch (_) {
        showToast('Could not load stats', 'error');
    }
}

function renderTrend(trend) {
    const wrap = $('#trend-chart');
    if (!wrap || trend.length < 2) return;

    const max = 10, h = 60, w = wrap.clientWidth || 260;
    const step = w / (trend.length - 1);

    const points = trend.map((t, i) => {
        const x = i * step;
        const y = h - (t.score / max) * h;
        return `${x},${y}`;
    }).join(' ');

    wrap.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:60px">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${trend.map((t, i) => {
          const x = i * step, y = h - (t.score / max) * h;
          return `<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)"/>`;
      }).join('')}
    </svg>`;
}

// ── Recent Interviews ─────────────────────────────────────────────────────────
async function loadRecentInterviews() {
    const list = $('#interview-list');
    const empty = $('#no-interviews');
    if (!list) return;

    try {
        const { interviews } = await interviewApi.history(1, 5);

        if (!interviews.length) {
            showEl(empty);
            return;
        }
        hideEl(empty);

        list.innerHTML = interviews.map(iv => {
            const score = iv.report?.scores?.overall;
            const dot   = score ? `<span class="chip" style="background:none;color:${scoreColor(score)};border-color:${scoreColor(score)}">${score}/10</span>` : '';
            const badge = `<span class="chip chip-${statusChip(iv.status)}">${iv.status}</span>`;
            return `
            <a href="/pages/report.html?id=${iv._id}" class="interview-row card card-hover">
              <div class="interview-row-left">
                <div class="avatar avatar-sm">${initials(iv.role)}</div>
                <div>
                  <div class="font-semibold">${escHtml(iv.role)}</div>
                  <div class="text-xs text-muted">${iv.expLevel} · ${formatDate(iv.createdAt)}</div>
                </div>
              </div>
              <div class="interview-row-right">
                ${dot}
                ${badge}
              </div>
            </a>`;
        }).join('');
    } catch (_) {
        showToast('Could not load interviews', 'error');
    }
}

function statusChip(s) {
    return { completed: 'teal', in_progress: 'amber', abandoned: '' }[s] || '';
}

// ── New Interview Form ────────────────────────────────────────────────────────
function setupNewInterviewForm() {
    const form     = $('#new-interview-form');
    const btn      = $('#start-btn');
    const modal    = $('#new-interview-modal');
    const openBtn  = $('#open-modal-btn');
    const closeBtn = $('#close-modal-btn');

    openBtn?.addEventListener('click',  () => modal?.classList.remove('hidden'));
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const role       = $('#role').value.trim();
        const expLevel   = $('#exp-level').value;
        const resumeText = $('#resume-text')?.value?.trim();

        if (!role)       { showToast('Please enter a target role', 'warning'); return; }
        if (!resumeText) { showToast('Please paste your resume text', 'warning'); return; }

        setLoading(btn, true, 'Setting up interview…');
        try {
            const { interview } = await interviewApi.setup({ role, expLevel, resumeText });
            window.location.href = `/pages/interview.html?id=${interview.id}`;
        } catch (err) {
            showToast(err.message || 'Could not start interview', 'error');
            setLoading(btn, false, 'Start interview');
        }
    });
}

// ── Resume upload ─────────────────────────────────────────────────────────────
function setupResumeUpload() {
    const fileInput = $('#resume-file');
    const label     = $('#resume-file-label');

    fileInput?.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (label) label.textContent = file.name;
        try {
            await resumeApi.uploadFile(file);
            showToast('Resume saved', 'success');
        } catch (err) {
            showToast(err.message || 'Upload failed', 'error');
        }
    });
}

// ── Logout ────────────────────────────────────────────────────────────────────
function setupLogout() {
    $$('[data-action="logout"]').forEach(el => {
        el.addEventListener('click', async () => {
            try { await import('./api.js').then(m => m.authApi.logout()); } catch (_) {}
            sessionStorage.clear();
            window.location.href = '/pages/login.html';
        });
    });
}

// ── Micro-helpers ─────────────────────────────────────────────────────────────
function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = val;
}

function escHtml(str = '') {
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}