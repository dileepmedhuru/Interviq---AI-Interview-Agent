/* ── report.js ── renders the interview evaluation report ────────────────── */
import { interviewApi } from './api.js';
import { requireAuth, showToast, $, buildScoreRing, scoreColor, scoreLabel, formatDate, formatDuration, initials } from './utils.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
    await requireAuth();

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        showToast('No interview ID provided', 'error');
        setTimeout(() => { window.location.href = '/pages/dashboard.html'; }, 1500);
        return;
    }

    try {
        const data = await interviewApi.get(id);
        const { interview } = data;

        if (!interview.report) {
            // Report not generated yet — trigger it
            showToast('Generating report, please wait…', 'info');
            await interviewApi.evaluate(id);
            // Re-fetch
            const fresh = await interviewApi.get(id);
            renderReport(fresh.interview);
        } else {
            renderReport(interview);
        }
    } catch (err) {
        showToast(err.message || 'Could not load report', 'error');
    }
})();

// ── Render ─────────────────────────────────────────────────────────────────────
function renderReport(interview) {
    const report = interview.report;

    // Hide loader, show body
    $('#loading-state').style.display  = 'none';
    $('#report-body').style.display    = 'block';

    // Header meta
    setText('#report-role-chip', `${interview.role} · ${interview.expLevel}`);
    setText('#report-meta', [
        formatDate(interview.createdAt),
        interview.duration ? `⏱ ${formatDuration(interview.duration)}` : null,
        `${interview.answers?.length ?? 0} answers`,
    ].filter(Boolean).join('  ·  '));

    // Overall ring
    const overall = report.scores?.overall ?? 0;
    $('#overall-ring').innerHTML = buildScoreRing(overall, 110, 9);

    // Animate the ring after paint
    setTimeout(() => {
        const circle = $('#overall-ring').querySelectorAll('circle')[1];
        if (circle) circle.style.strokeDashoffset = circle.style.strokeDashoffset; // trigger
    }, 100);

    // Summary
    setText('#report-summary', report.summary || 'No summary available.');

    // Score bars
    const barData = [
        { label: 'Overall',   key: 'overall'   },
        { label: 'Relevance', key: 'relevance' },
        { label: 'Clarity',   key: 'clarity'   },
        { label: 'Depth',     key: 'depth'     },
    ];
    const barsEl = $('#score-bars');
    if (barsEl) {
        barsEl.innerHTML = barData.map(b => {
            const score = report.scores?.[b.key] ?? 0;
            const color = scoreColor(score);
            const pct   = (score / 10) * 100;
            return `
            <div class="score-bar-row">
                <span class="score-bar-label">${b.label}</span>
                <div class="score-bar-track">
                    <div class="score-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <span class="score-bar-num" style="color:${color}">${score}</span>
            </div>`;
        }).join('');
    }

    // Strengths
    const strengthsEl = $('#strengths-list');
    if (strengthsEl && report.strengths?.length) {
        strengthsEl.innerHTML = report.strengths.map(s => `
            <li style="display:flex;gap:8px;font-size:0.875rem;color:var(--text-secondary)">
                <span style="color:var(--success);flex-shrink:0">✓</span>${escHtml(s)}
            </li>`).join('');
    }

    // Areas to improve
    const improveEl = $('#improve-list');
    if (improveEl && report.areasToImprove?.length) {
        improveEl.innerHTML = report.areasToImprove.map(a => `
            <li style="display:flex;gap:8px;font-size:0.875rem;color:var(--text-secondary)">
                <span style="color:var(--warning);flex-shrink:0">→</span>${escHtml(a)}
            </li>`).join('');
    }

    // Feedback
    const feedbackEl = $('#feedback-list');
    if (feedbackEl && report.feedback?.length) {
        feedbackEl.innerHTML = report.feedback.map(f => `
            <div class="feedback-item">
                <div class="feedback-dot feedback-dot-${f.type}"></div>
                <div class="feedback-text">${escHtml(f.text)}</div>
            </div>`).join('');
    }

    // Recommendations
    const recEl = $('#recommendations-list');
    if (recEl && report.recommendations?.length) {
        recEl.innerHTML = report.recommendations.map(r => `
            <li style="font-size:0.9rem;color:var(--text-secondary);line-height:1.65">${escHtml(r)}</li>`
        ).join('');
    }

    // Q&A list
    const qaEl = $('#qa-list');
    if (qaEl && interview.answers?.length) {
        qaEl.innerHTML = interview.answers.map((a, i) => `
            <div class="card" style="padding:1.25rem">
                <div class="text-xs text-muted font-semibold" style="letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">
                    Q${i + 1}
                </div>
                <div style="font-weight:600;color:var(--text-primary);margin-bottom:10px;font-size:0.95rem">
                    ${escHtml(a.question)}
                </div>
                <div style="font-size:0.875rem;color:var(--text-secondary);line-height:1.7;background:var(--surface-2);border-radius:var(--radius-md);padding:12px 14px;border-left:3px solid var(--border-strong)">
                    ${escHtml(a.answer)}
                </div>
            </div>`).join('');
    }

    // "Practice again" → dashboard with modal
    $('#new-interview-btn')?.addEventListener('click', () => {
        window.location.href = '/pages/dashboard.html';
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = val;
}

function escHtml(str = '') {
    return str.replace(/[&<>"']/g, c => (
        { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
    ));
}