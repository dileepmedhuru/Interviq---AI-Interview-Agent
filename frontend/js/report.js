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
            showToast('Generating report, please wait…', 'info');
            await interviewApi.evaluate(id);
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

    $('#loading-state').style.display = 'none';
    $('#report-body').style.display = 'block';

    setText('#report-role-chip', `${interview.role} · ${interview.expLevel}`);
    setText('#report-meta', [
        formatDate(interview.createdAt),
        interview.duration ? `⏱ ${formatDuration(interview.duration)}` : null,
        `${interview.answers?.length ?? 0} answers`,
    ].filter(Boolean).join('  ·  '));

    const overall = report.earnedMarks !== undefined && report.grandTotal
        ? Math.round((report.earnedMarks / report.grandTotal) * 10 * 10) / 10
        : report.scores?.overall ?? 0;
    $('#overall-ring').innerHTML = buildScoreRing(overall, 110, 9);

    setTimeout(() => {
        const circle = $('#overall-ring').querySelectorAll('circle')[1];
        if (circle) circle.style.strokeDashoffset = circle.style.strokeDashoffset;
    }, 100);

    setText('#report-summary', report.summary || 'No summary available.');

    const mcqScore = report.sectionScores?.mcq ?? 0;
    const codingScore = report.sectionScores?.coding ?? 0;
    const videoScore = report.sectionScores?.video ?? 0;
    const recalcEarned = Math.round(((mcqScore * 16) + (codingScore * 20) + (videoScore * 24)) / 10);
    const displayMarks = (report.earnedMarks > 0 || recalcEarned === 0)
        ? report.earnedMarks
        : recalcEarned;

    if (report.earnedMarks !== undefined || report.sectionScores) {
        const grandTotal = report.grandTotal || 60;
        const marksEl = document.createElement('div');
        marksEl.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:12px';
        marksEl.innerHTML = `
            <div style="padding:8px 16px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${report.earnedMarks}<span style="font-size:0.85rem;color:var(--text-muted)">/${report.grandTotal}</span></div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Total marks</div>
            </div>
            <div style="padding:8px 16px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:1.4rem;font-weight:800;color:var(--success)">${report.sectionScores?.mcq ?? '—'}<span style="font-size:0.85rem;color:var(--text-muted)">/10</span></div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">📝 MCQ</div>
            </div>
            <div style="padding:8px 16px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:1.4rem;font-weight:800;color:var(--warning)">${report.sectionScores?.coding ?? '—'}<span style="font-size:0.85rem;color:var(--text-muted)">/10</span></div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">💻 Coding</div>
            </div>
            <div style="padding:8px 16px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${report.sectionScores?.video ?? '—'}<span style="font-size:0.85rem;color:var(--text-muted)">/10</span></div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">🎥 Video</div>
            </div>`;
        $('#summary-card').appendChild(marksEl);
    }

    // Score bars
    const barData = [
        { label: 'Overall',  value: overall },
        { label: 'MCQ',      value: report.sectionScores?.mcq    ?? report.scores?.relevance ?? 0 },
        { label: 'Coding',   value: report.sectionScores?.coding ?? report.scores?.depth     ?? 0 },
        { label: 'Video',    value: report.sectionScores?.video  ?? report.scores?.clarity   ?? 0 },
    ];
    const barsEl = $('#score-bars');
    if (barsEl) {
        barsEl.innerHTML = barData.map(b => {
            const score = b.value ?? 0;
            const color = scoreColor(score);
            const pct = (score / 10) * 100;
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

    // ── Per-section results ──────────────────────────────────────────────────
    const secEl = $('#section-results');
    if (secEl && interview.questions?.length) {
        const qs = interview.questions;
        const as = interview.answers || [];

        const sections = [
            { num: 1, label: 'Section 1 — Multiple Choice', icon: '📝', cat: 'mcq' },
            { num: 2, label: 'Section 2 — Coding Challenge', icon: '💻', cat: 'coding' },
            { num: 3, label: 'Section 3 — Video Interview',  icon: '🎥', cat: null },
        ];

        secEl.innerHTML = `<h3 style="margin-bottom:1.25rem;color:var(--text-primary)">Section Results</h3>
        <div style="display:flex;flex-direction:column;gap:1rem">` +
            sections.map(sec => {
                const secQs = qs.filter(q => Number(q.section) === sec.num);
                if (secQs.length === 0) return '';

                const secAs = secQs.map(q => {
                    const found = as.find(a => a.question === q.text);
                    return { q, a: found?.answer || '[Skipped]' };
                });

                const total    = secAs.length;
                const skipped  = secAs.filter(x => x.a === '[Skipped]').length;
                const answered = total - skipped;

                let statsHtml = '';

                if (sec.num === 1) {
                    const correct = secAs.filter(x => {
                        if (x.a === '[Skipped]') return false;
                        const letter = x.a.charAt(0);
                        const idx = ['A', 'B', 'C', 'D'].indexOf(letter);
                        return idx !== -1 && idx === x.q.correctAnswer;
                    }).length;
                    const pct = Math.round((correct / total) * 100);
                    const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
                    statsHtml = `
                    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:10px">
                        <div><span style="font-size:1.5rem;font-weight:800;color:${color}">${correct}/${total}</span>
                            <div style="font-size:0.75rem;color:var(--text-muted)">Correct</div></div>
                        <div><span style="font-size:1.5rem;font-weight:800;color:var(--warning)">${skipped}</span>
                            <div style="font-size:0.75rem;color:var(--text-muted)">Skipped</div></div>
                        <div><span style="font-size:1.5rem;font-weight:800;color:var(--accent)">${pct}%</span>
                            <div style="font-size:0.75rem;color:var(--text-muted)">Score</div></div>
                    </div>
                    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
                    ${secAs.map((x, i) => {
                        if (x.a === '[Skipped]') {
                            return `<div style="display:flex;gap:10px;align-items:center;font-size:0.82rem;padding:6px 10px;background:var(--surface-2);border-radius:8px">
                                <span style="color:var(--warning)">—</span>
                                <span style="color:var(--text-muted)">Q${i + 1}: ${escHtml(x.q.text.slice(0, 80))}${x.q.text.length > 80 ? '…' : ''}</span>
                                <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted)">Skipped</span>
                            </div>`;
                        }
                        const letter = x.a.charAt(0);
                        const idx = ['A', 'B', 'C', 'D'].indexOf(letter);
                        const isCorrect = idx !== -1 && idx === x.q.correctAnswer;
                        const correctLetter = ['A', 'B', 'C', 'D'][x.q.correctAnswer] || '?';
                        return `<div style="display:flex;gap:10px;align-items:center;font-size:0.82rem;padding:6px 10px;background:var(--surface-2);border-radius:8px;border-left:3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
                            <span>${isCorrect ? '✅' : '❌'}</span>
                            <span style="flex:1;color:var(--text-secondary)">${escHtml(x.q.text.slice(0, 70))}${x.q.text.length > 70 ? '…' : ''}</span>
                            <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap">
                                ${isCorrect ? `Correct (${letter})` : `You: ${letter || '?'} · Ans: ${correctLetter}`}
                            </span>
                        </div>`;
                    }).join('')}
                    </div>`;

                } else if (sec.num === 2) {
                    statsHtml = `
                    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:10px">
                        <div><span style="font-size:1.5rem;font-weight:800;color:var(--accent)">${answered}</span>
                            <div style="font-size:0.75rem;color:var(--text-muted)">Submitted</div></div>
                        <div><span style="font-size:1.5rem;font-weight:800;color:var(--warning)">${skipped}</span>
                            <div style="font-size:0.75rem;color:var(--text-muted)">Skipped</div></div>
                    </div>
                    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
                    ${secAs.map((x, i) => {
                        const skippedQ = x.a === '[Skipped]';
                        const langMatch = x.a.match(/^\[CODE:(\w+)\]/);
                        const lang = langMatch ? langMatch[1] : null;
                        const codeBody = lang ? x.a.replace(/^\[CODE:\w+\]\n?/, '').trim() : null;

                        // Detect stub code
                        const isStub = !codeBody ||
                            codeBody.length < 20 ||
                            /^\s*function\s+\w+\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*)?\s*\}\s*$/.test(codeBody) ||
                            /^\s*def\s+\w+\s*\([^)]*\)\s*:\s*\n?\s*pass\s*$/.test(codeBody);

                        // Try to evaluate JS code against test cases
                        let testResults = null;
                        if (!skippedQ && !isStub && lang === 'JAVASCRIPT' && codeBody && x.q.testCases?.length) {
                            testResults = evaluateCodeAnswer(codeBody, x.q);
                        }

                        // Determine status
                        let statusIcon, statusColor, statusText;

                        if (skippedQ) {
                            statusIcon  = '⏭';
                            statusColor = 'var(--warning)';
                            statusText  = 'Skipped';
                        } else if (isStub) {
                            statusIcon  = '❌';
                            statusColor = 'var(--danger)';
                            statusText  = 'Not implemented (starter code only)';
                        } else if (testResults) {
                            const allPass  = testResults.passed === testResults.total;
                            const somePass = testResults.passed > 0;
                            statusIcon  = allPass ? '✅' : somePass ? '⚠️' : '❌';
                            statusColor = allPass ? 'var(--success)' : somePass ? 'var(--warning)' : 'var(--danger)';
                            statusText  = `${testResults.passed}/${testResults.total} tests passed`;
                        } else if (lang === 'JAVASCRIPT') {
                            statusIcon  = '✅';
                            statusColor = 'var(--success)';
                            statusText  = 'Submitted';
                        } else if (lang === 'JAVA' || lang === 'CPP' || lang === 'GO' || lang === 'RUST' || lang === 'TYPESCRIPT') {
                            const isJavaStub = lang === 'JAVA' && (
                                /\/\/\s*your code here/i.test(codeBody) &&
                                !/\b(for|while|if|switch|return\s+[^;]{3,}|int\s+\w|String\s+\w|count\s*[+\-*]|sum\s*[+\-*])\b/.test(codeBody)
                            );
                            const isCppStub = lang === 'CPP' && (
                                /\/\/\s*your code here/i.test(codeBody) &&
                                !/\b(for|while|if|return\s+[^;]{3,}|vector|map|set)\b/.test(codeBody)
                            );
                            const isGoStub = lang === 'GO' &&
                                /return\s+nil/.test(codeBody) &&
                                !/\b(for|if|range|len)\b/.test(codeBody);
                            const isShortStub = codeBody.split('\n')
                                .filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('#'))
                                .length < 5;
                            const isLangStub = isJavaStub || isCppStub || isGoStub || isShortStub;
                            statusIcon  = isLangStub ? '❌' : '✅';
                            statusColor = isLangStub ? 'var(--danger)' : 'var(--success)';
                            statusText  = isLangStub ? 'Not implemented (stub)' : `${lang} — submitted`;
                        } else if (lang === 'PYTHON') {
                            const fnName = x.q.functionSignature || 'solution';
                            const hasFn     = codeBody.includes(`def ${fnName}`);
                            const hasReturn = /\breturn\b/.test(codeBody);
                            const hasLoop   = /\b(for|while)\b/.test(codeBody);
                            const meaningfulLines = codeBody.split('\n')
                                .map(l => l.trim())
                                .filter(l => l &&
                                    !l.startsWith('#') &&
                                    !l.startsWith('def ') &&
                                    l !== 'pass' &&
                                    l !== '...' &&
                                    !/^return\s+(None|0|""|''|\[\]|\{\})$/.test(l));
                            const looksComplete = hasFn && hasReturn && meaningfulLines.length >= 2;
                            statusIcon  = looksComplete ? '✅' : '❌';
                            statusColor = looksComplete ? 'var(--success)' : 'var(--danger)';
                            const checks = [];
                            if (hasFn)                    checks.push('✓ function defined');
                            if (hasReturn)                checks.push('✓ return present');
                            if (hasLoop)                  checks.push('✓ loop present');
                            if (!hasFn)                   checks.push('✗ function not found');
                            if (!looksComplete && hasFn)  checks.push('✗ no real logic');
                            statusText = looksComplete
                                ? (checks.slice(0, 2).join(' · ') || 'Submitted')
                                : (checks.join(' · ') || 'Not implemented');
                        } else {
                            statusIcon  = '📋';
                            statusColor = 'var(--accent)';
                            statusText  = `${lang} — submitted`;
                        }

                        return `<div style="padding:12px 14px;background:var(--surface-2);border-radius:10px;border-left:3px solid ${statusColor}">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:${codeBody ? '10px' : '0'}">
                                <span style="font-size:1.1rem">${statusIcon}</span>
                                <span style="font-weight:600;font-size:0.9rem;color:var(--text-primary);flex:1">
                                    ${escHtml((x.q.title || x.q.functionSignature || `Problem ${i + 1}`))}
                                </span>
                                ${lang ? `<span class="chip" style="font-size:0.68rem">${lang}</span>` : ''}
                                <span style="font-size:0.78rem;font-weight:600;color:${statusColor}">${statusText}</span>
                            </div>
                            ${codeBody ? `
                            <pre style="font-family:'JetBrains Mono',monospace;font-size:0.76rem;color:var(--text-secondary);
                                background:var(--surface);padding:10px 12px;border-radius:8px;
                                overflow-x:auto;white-space:pre;max-height:160px;overflow-y:auto;
                                border:1px solid var(--border)">${escHtml(codeBody)}</pre>` : ''}
                            ${testResults && testResults.details.length ? `
                            <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
                                ${testResults.details.map(d => `
                                <div style="display:flex;gap:8px;align-items:center;font-size:0.74rem;
                                    font-family:monospace;padding:5px 8px;border-radius:6px;
                                    background:${d.pass ? 'rgba(29,158,117,.08)' : 'rgba(226,75,74,.08)'};
                                    border:1px solid ${d.pass ? 'rgba(29,158,117,.2)' : 'rgba(226,75,74,.2)'}">
                                    <span>${d.pass ? '✓' : '✗'}</span>
                                    <span style="color:rgba(255,255,255,.5)">${escHtml(d.input)}</span>
                                    <span style="color:rgba(255,255,255,.3)">→</span>
                                    <span style="color:${d.pass ? '#1D9E75' : '#E24B4A'}">${escHtml(d.got)}</span>
                                    ${!d.pass ? `<span style="color:rgba(255,255,255,.3);margin-left:auto">expected: ${escHtml(d.expected)}</span>` : ''}
                                </div>`).join('')}
                            </div>` : ''}
                        </div>`;
                    }).join('')}
                    </div>`;
                }

                return `<div class="card">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                        <span style="font-size:1.25rem">${sec.icon}</span>
                        <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary)">${sec.label}</h3>
                        <span style="margin-left:auto;font-size:0.78rem;color:var(--text-muted)">${answered}/${total} answered</span>
                    </div>
                    ${statsHtml}
                </div>`;
            }).join('') + '</div>';
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
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function evaluateCodeAnswer(code, question) {
    const fnName = question.functionSignature;
    const testCases = (question.testCases || []).filter(tc => !tc.hidden);
    if (!fnName || testCases.length === 0) return null;

    const details = [];
    let passed = 0;
    let userFn = null;

    try {
        userFn = new Function(`${code}\nreturn typeof ${fnName} !== 'undefined' ? ${fnName} : null;`)();
    } catch (e) {
        return {
            passed: 0,
            total: testCases.length,
            details: testCases.map(tc => ({
                pass: false,
                input: tc.input,
                got: `Syntax error: ${e.message.slice(0, 50)}`,
                expected: tc.expectedDisplay,
            }))
        };
    }

    if (typeof userFn !== 'function') {
        return {
            passed: 0,
            total: testCases.length,
            details: testCases.map(tc => ({
                pass: false,
                input: tc.input,
                got: `"${fnName}" not found`,
                expected: tc.expectedDisplay,
            }))
        };
    }

    for (const tc of testCases) {
        try {
            let args = [];
            if (tc.inputCode && tc.inputCode !== '[]') {
                try {
                    const parsed = JSON.parse(tc.inputCode);
                    args = Array.isArray(parsed) ? parsed : [parsed];
                } catch (_) { args = []; }
            }

            const result   = userFn(...args);
            const expected = safeParseExp(tc.expected);
            const isPass   = deepEq(result, expected);
            const resultStr = result === undefined ? 'undefined'
                : result === null ? 'null'
                : JSON.stringify(result);

            details.push({ pass: isPass, input: tc.input, got: resultStr, expected: tc.expectedDisplay });
            if (isPass) passed++;
        } catch (e) {
            details.push({
                pass: false, input: tc.input,
                got: `error: ${e.message.slice(0, 50)}`,
                expected: tc.expectedDisplay,
            });
        }
    }

    return { passed, total: testCases.length, details };
}
function safeParseExp(s) {
    if (s === undefined || s === null) return null;
    try { return JSON.parse(String(s).trim()); } catch (_) { return String(s).trim(); }
}

function deepEq(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) {
        if (typeof a === 'boolean' && typeof b === 'string') return String(a) === b;
        if (typeof a === 'string'  && typeof b === 'boolean') return a === String(b);
        if (typeof a === 'number'  && typeof b === 'string') return String(a) === b;
        if (typeof a === 'string'  && typeof b === 'number') return a === String(b);
        return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        if (a.every((v, i) => deepEq(v, b[i]))) return true;
        const sa = [...a].sort(), sb = [...b].sort();
        return sa.every((v, i) => deepEq(v, sb[i]));
    }
    if (typeof a === 'object') {
        const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
        if (ka.join() !== kb.join()) return false;
        return ka.every(k => deepEq(a[k], b[k]));
    }
    return false;
}