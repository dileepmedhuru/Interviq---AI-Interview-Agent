/* ── report.js ── renders the interview evaluation report ────────────────── */
import { interviewApi } from './api.js';
import { requireAuth, showToast, $, buildScoreRing, scoreColor, scoreLabel, formatDate, formatDuration, initials } from './utils.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
    const isPublic = new URLSearchParams(window.location.search).get('public') === 'true';
    if (!isPublic) {
        await requireAuth();
    } else {
        // Adjust navigation and action buttons for public view
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            const dashboardLink = navActions.querySelector('a[href="dashboard.html"]');
            if (dashboardLink) {
                dashboardLink.href = 'index.html';
                dashboardLink.textContent = 'Try Interviq Free';
            }
        }
        const backBtn = document.querySelector('a[href="dashboard.html"].btn-secondary');
        if (backBtn) {
            backBtn.href = 'index.html';
            backBtn.textContent = 'Try Interviq Free';
        }
        const againBtn = document.getElementById('new-interview-btn');
        if (againBtn) {
            againBtn.style.display = 'none';
        }
    }

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        showToast('No interview ID provided', 'error');
        setTimeout(() => { window.location.href = isPublic ? 'index.html' : '/pages/dashboard.html'; }, 1500);
        return;
    }

    try {
        const data = isPublic ? await interviewApi.getPublic(id) : await interviewApi.get(id);
        const { interview } = data;

        if (!interview.report && !isPublic) {
            showToast('Generating report, please wait…', 'info');
            await interviewApi.evaluate(id);
            const fresh = await interviewApi.get(id);
            renderReport(fresh.interview);
        } else if (!interview.report && isPublic) {
            showToast('Report is still generating, please check back in a moment.', 'info');
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

    // ── Interactive Question Review ──────────────────────────────────────────
    const qs = interview.questions || [];
    const as = interview.answers || [];

    // Map questions to their answers and compute statuses
    const reviewData = qs.map((q, idx) => {
        const answerObj = as.find(a => a.question === q.text);
        const answerVal = answerObj?.answer || '[Skipped]';

        let status = 'skipped'; // correct, incorrect, skipped, submitted
        let statusText = 'Skipped';

        if (answerVal === '[Skipped]') {
            status = 'skipped';
            statusText = 'Skipped';
        } else if (Number(q.section) === 1) {
            // MCQ
            const letter = answerVal.charAt(0);
            const optIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
            const isCorrect = optIdx !== -1 && optIdx === q.correctAnswer;
            status = isCorrect ? 'correct' : 'incorrect';
            statusText = isCorrect ? 'Correct' : 'Incorrect';
        } else if (Number(q.section) === 2) {
            // Coding
            const isStdinCode = answerVal.startsWith('[STDIN_CODE:');
            const isPassed = answerVal.includes(':OK]');

            // Check if it's starter code/stub
            const langMatch = answerVal.match(/^\[(?:CODE|STDIN_CODE):(\w+)(?::OK)?\]/i);
            const lang = langMatch ? langMatch[1].toUpperCase() : null;
            const codeBody = lang ? answerVal.replace(/^\[(?:CODE|STDIN_CODE):\w+(?::OK)?\]\n?/i, '').trim() : '';

            const isStub = !codeBody ||
                codeBody.length < 20 ||
                /^\s*function\s+\w+\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*)?\s*\}\s*$/.test(codeBody) ||
                /^\s*def\s+\w+\s*\([^)]*\)\s*:\s*\n?\s*pass\s*$/.test(codeBody);

            if (isStub) {
                status = 'incorrect';
                statusText = 'Not implemented';
            } else if (isStdinCode) {
                status = isPassed ? 'correct' : 'incorrect';
                statusText = isPassed ? 'All tests passed' : 'Incorrect';
            } else {
                status = 'submitted';
                statusText = 'Submitted';
            }
        } else {
            // Video (Section 3)
            status = 'submitted';
            statusText = 'Submitted';
        }

        return {
            q,
            answerObj,
            answer: answerVal,
            status,
            statusText,
            originalIndex: idx + 1
        };
    });

    const navListEl = $('#navigator-list');
    const sectionFilterEl = $('#section-filter');

    function renderNavigator() {
        if (!navListEl) return;
        const selectedSec = sectionFilterEl?.value || 'all';
        const filtered = reviewData.filter(item => {
            if (selectedSec === 'all') return true;
            return String(item.q.section) === selectedSec;
        });

        if (filtered.length === 0) {
            navListEl.innerHTML = `<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem;">No questions found</p>`;
            return;
        }

        navListEl.innerHTML = filtered.map(item => {
            const isCoding = Number(item.q.section) === 2;
            const isMcq = Number(item.q.section) === 1;
            const typeLabel = isMcq ? 'MCQ' : isCoding ? 'Coding' : 'Video';

            return `
            <button class="nav-item ${item.status}" data-idx="${item.originalIndex}">
                <div class="nav-item-header">
                    <span class="nav-item-id">Q${item.originalIndex}</span>
                    <span class="nav-item-type">${typeLabel}</span>
                </div>
                <div class="nav-item-status ${item.status}">${item.statusText}</div>
            </button>`;
        }).join('');

        // Add click events
        navListEl.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all
                navListEl.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const idx = parseInt(btn.getAttribute('data-idx'));
                showQuestionDetail(idx);
            });
        });

        // Auto-select first item in filtered list if not already showing something
        const activeItem = navListEl.querySelector('.nav-item.active');
        if (!activeItem) {
            const firstBtn = navListEl.querySelector('.nav-item');
            if (firstBtn) {
                firstBtn.click();
            }
        }
    }

    function showQuestionDetail(idx) {
        const item = reviewData.find(d => d.originalIndex === idx);
        if (!item) return;

        const detailsEl = $('#details-pane');
        if (!detailsEl) return;

        const { q, answer, status, statusText, answerObj } = item;
        const isMcq = Number(q.section) === 1;
        const isCoding = Number(q.section) === 2;
        const isVideo = Number(q.section) === 3;

        // Badges & metadata
        const typeLabel = isMcq ? 'MCQ' : isCoding ? 'Coding' : 'Video Interview';
        const diffLabel = q.difficulty ? q.difficulty.toUpperCase() : 'MEDIUM';
        const langLabel = q.language ? q.language.toUpperCase() : (isCoding ? 'PYTHON' : '');

        let marksText = '—';
        if (isMcq) {
            marksText = status === 'correct' ? 'Marks: 1/1' : 'Marks: 0/1';
        } else if (isCoding) {
            marksText = status === 'correct' ? 'Marks: 10/10' : 'Marks: 0/10';
        } else if (isVideo) {
            marksText = answer !== '[Skipped]' ? 'Marks: Submitted' : 'Marks: 0/10';
        }

        let detailHtml = `
        <div class="detail-header">
            <div style="flex: 1; min-width: 0;">
                <h3 class="detail-title">Q${idx}: ${(isMcq || isVideo) ? escHtml(q.text) : escHtml(q.title || q.functionSignature || 'Coding Question')}</h3>
                <div class="detail-meta-badges">
                    <span class="chip chip-teal" style="font-size: 0.7rem;">${typeLabel}</span>
                    <span class="chip ${status === 'correct' ? 'chip-success' : status === 'skipped' ? 'chip-warning' : 'chip-danger'}" style="font-size: 0.7rem; color: #fff; background: ${status === 'correct' ? 'var(--success)' : status === 'skipped' ? 'var(--warning)' : 'var(--danger)'};">${statusText}</span>
                    <span class="chip" style="font-size: 0.7rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-secondary);">${diffLabel}</span>
                    ${langLabel ? `<span class="chip" style="font-size: 0.7rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-secondary);">${langLabel}</span>` : ''}
                </div>
            </div>
            <div class="detail-marks">${marksText}</div>
        </div>
        `;

        // Render content based on question type
        if (isMcq) {
            // MCQ options formatting
            const correctIdx = q.correctAnswer;
            const letter = answer.charAt(0);
            const userIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
            const skipped = answer === '[Skipped]';

            detailHtml += `
            <div style="margin-bottom: 1.5rem;">
                <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Choose the correct answer from the options below:</p>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            `;

            q.options.forEach((opt, oIdx) => {
                const optLetter = ['A', 'B', 'C', 'D'][oIdx];
                let optClass = '';

                if (oIdx === correctIdx) {
                    optClass = 'correct';
                }

                if (!skipped && oIdx === userIdx) {
                    if (oIdx === correctIdx) {
                        optClass = 'selected-correct';
                    } else {
                        optClass = 'selected-incorrect';
                    }
                }

                detailHtml += `
                <div class="review-option ${optClass}">
                    <div class="option-indicator">${optLetter}</div>
                    <div style="flex: 1;">${escHtml(opt)}</div>
                    ${oIdx === correctIdx ? `<span style="font-size: 0.72rem; font-weight: 700; color: var(--success); margin-left: auto;">Correct Answer</span>` : ''}
                    ${!skipped && oIdx === userIdx && oIdx !== correctIdx ? `<span style="font-size: 0.72rem; font-weight: 700; color: var(--danger); margin-left: auto;">Your Selection</span>` : ''}
                </div>
                `;
            });

            detailHtml += `
                </div>
            </div>
            `;

            if (q.explanation) {
                detailHtml += `
                <div class="card" style="background: var(--surface-2); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1rem;">
                    <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">💡 Explanation</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">${escHtml(q.explanation)}</p>
                </div>
                `;
            }
        } else if (isCoding) {
            // Coding details formatting
            const langMatch = answer.match(/^\[(?:CODE|STDIN_CODE):(\w+)(?::OK)?\]/i);
            const lang = langMatch ? langMatch[1].toLowerCase() : 'python';
            const codeBody = langMatch ? answer.replace(/^\[(?:CODE|STDIN_CODE):\w+(?::OK)?\]\n?/i, '').trim() : '';
            const skipped = answer === '[Skipped]';

            detailHtml += `
            <div style="display: flex; flex-direction: column; gap: 1.5rem; flex: 1;">
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Problem Description</h4>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7; background: var(--surface-2); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); white-space: pre-wrap;">${escHtml(q.text)}</div>
                </div>
            `;

            if (q.constraints && q.constraints.length) {
                detailHtml += `
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Constraints</h4>
                    <ul style="list-style-type: disc; padding-left: 1.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                        ${q.constraints.map(c => `<li style="margin-bottom: 4px;">${escHtml(c)}</li>`).join('')}
                    </ul>
                </div>
                `;
            }

            // Your Code Section
            detailHtml += `
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Your Code</h4>
            `;

            if (skipped) {
                detailHtml += `
                <div style="padding: 1.5rem; text-align: center; background: var(--surface-2); border-radius: var(--radius-md); border: 1px solid var(--border); color: var(--text-muted); font-size: 0.9rem;">
                    ⚠️ Question was skipped. No code was submitted.
                </div>
                `;
            } else {
                detailHtml += `
                <div class="code-review-header">
                    <span>Language: <strong>${lang.toUpperCase()}</strong></span>
                    <span>Status: <strong>${statusText}</strong></span>
                </div>
                <pre class="code-review-box">${escHtml(codeBody)}</pre>
                `;
            }

            detailHtml += `
                </div>
            `;

            // Test Cases section
            if (q.testCases && q.testCases.length) {
                const totalTests = q.testCases.length;
                const passedTests = status === 'correct' ? totalTests : 0;
                const failedTests = totalTests - passedTests;

                detailHtml += `
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">
                        Test Cases: <span style="color:var(--success);">${passedTests} Passed</span> · <span style="color:${failedTests > 0 ? 'var(--danger)' : 'var(--text-muted)'};">${failedTests} Failed</span>
                    </h4>
                    <div class="test-cases-review-list">
                `;

                q.testCases.forEach((tc, tcIdx) => {
                    const isPass = status === 'correct';
                    const displayInput = tc.input || tc.stdin || 'None';
                    const displayExpected = tc.expectedDisplay || tc.expected || 'None';

                    detailHtml += `
                    <div class="test-case-review-item ${isPass ? 'pass' : 'fail'}">
                        <span style="font-weight: bold; font-size: 1rem; margin-right: 4px;">${isPass ? '✓' : '✗'}</span>
                        <span style="font-weight: 600; min-width: 80px;">Test Case ${tcIdx + 1}:</span>
                        <span style="color: var(--text-secondary); margin-right: auto; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 250px;">Input: <code>${escHtml(displayInput)}</code></span>
                        <span style="color: var(--text-muted);">Expected Output: <code>${escHtml(displayExpected)}</code></span>
                    </div>
                    `;
                });

                detailHtml += `
                    </div>
                </div>
                `;
            }

            detailHtml += `
            </div>
            `;
        } else if (isVideo) {
            // Video response transcript formatting
            const skipped = answer === '[Skipped]';

            detailHtml += `
            <div style="display: flex; flex-direction: column; gap: 1.5rem; flex: 1;">
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Interview Prompt</h4>
                    <div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; background: var(--surface-2); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border);">
                        ${escHtml(q.text)}
                    </div>
                </div>

                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Transcribed Verbal Response</h4>
            `;

            if (skipped) {
                detailHtml += `
                <div style="padding: 1.5rem; text-align: center; background: var(--surface-2); border-radius: var(--radius-md); border: 1px solid var(--border); color: var(--text-muted); font-size: 0.9rem;">
                    ⚠️ Question was skipped. No audio response was submitted.
                </div>
                `;
            } else {
                detailHtml += `
                <div style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.75; background: var(--surface); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); border-left: 4px solid var(--accent); white-space: pre-wrap; font-style: italic;">
                    "${escHtml(answer)}"
                </div>
                `;
            }

            detailHtml += `
                </div>
            `;

            // Display Agent Decision Logs if available
            if (answerObj && answerObj.grade !== undefined && answerObj.grade !== null) {
                detailHtml += `
                <div style="border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; margin-top: 0.5rem;">
                    <div style="padding: 10px 14px; background: rgba(168, 85, 247, 0.08); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.1rem;">🤖</span>
                        <strong style="font-size: 0.82rem; color: #a855f7; text-transform: uppercase; letter-spacing: 0.5px;">Grading Agent Evaluation</strong>
                        <span class="chip" style="margin-left: auto; font-size: 0.72rem; background: #a855f7; color: #fff; border: none; padding: 2px 8px; border-radius: 12px; font-weight: 700;">Score: ${answerObj.grade}/10</span>
                    </div>
                    <div style="padding: 14px; background: var(--surface-2); font-size: 0.85rem; line-height: 1.65; color: var(--text-secondary);">
                        <p><strong>Feedback:</strong> ${escHtml(answerObj.feedback)}</p>
                    </div>
                </div>

                <div style="border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden;">
                    <div style="padding: 10px 14px; background: rgba(13, 148, 136, 0.08); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.1rem;">⚙️</span>
                        <strong style="font-size: 0.82rem; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px;">Planning Agent Decisions & Reasoning</strong>
                    </div>
                    <div style="padding: 14px; background: var(--surface-2); font-size: 0.85rem; line-height: 1.65; color: var(--text-secondary);">
                        <p><strong>Decision Logic:</strong> ${escHtml(answerObj.planningReasoning)}</p>
                    </div>
                </div>
                `;
            }

            detailHtml += `
            </div>
            `;
        }

        detailsEl.innerHTML = detailHtml;

        // Auto-scroll to details pane on small screens
        if (window.innerWidth <= 820) {
            detailsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Filter selection event
    sectionFilterEl?.addEventListener('change', () => {
        renderNavigator();
    });

    // Run initial rendering
    renderNavigator();
    renderPrintOnlyReport();

    $('#new-interview-btn')?.addEventListener('click', () => {
        window.location.href = '/pages/dashboard.html';
    });

    $('#download-pdf-btn')?.addEventListener('click', () => {
        window.print();
    });

    function renderPrintOnlyReport() {
        const printOnlyEl = $('#print-only-review');
        if (!printOnlyEl) return;
        
        let printHtml = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; color: var(--text-primary);">Detailed Question & Answer Review</h2>
        `;
        
        reviewData.forEach((item, index) => {
            const { q, answer, status, statusText } = item;
            const idx = index + 1;
            const isMcq = Number(q.section) === 1;
            const isCoding = Number(q.section) === 2;
            const isVideo = Number(q.section) === 3;
            const typeLabel = isMcq ? 'MCQ' : isCoding ? 'Coding' : 'Video Interview';
            const diffLabel = q.difficulty ? q.difficulty.toUpperCase() : 'MEDIUM';
            const langLabel = q.language ? q.language.toUpperCase() : (isCoding ? 'PYTHON' : '');
            
            let marksText = '—';
            if (isMcq) {
                marksText = status === 'correct' ? 'Marks: 1/1' : 'Marks: 0/1';
            } else if (isCoding) {
                marksText = status === 'correct' ? 'Marks: 10/10' : 'Marks: 0/10';
            } else if (isVideo) {
                marksText = answer !== '[Skipped]' ? 'Marks: Submitted' : 'Marks: 0/10';
            }
            
            printHtml += `
            <div class="card" style="page-break-inside: avoid; border: 1px solid var(--border); margin-bottom: 1.5rem; padding: 1.5rem; background: var(--surface);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); line-height: 1.4;">Q${idx}: ${(isMcq || isVideo) ? escHtml(q.text) : escHtml(q.title || q.functionSignature || 'Coding Question')}</h3>
                        <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                            <span class="chip chip-teal" style="font-size: 0.65rem; padding: 2px 6px;">${typeLabel}</span>
                            <span class="chip" style="font-size: 0.65rem; padding: 2px 6px; background: ${status === 'correct' ? 'var(--success)' : status === 'skipped' ? 'var(--warning)' : 'var(--danger)'}; color: #fff; border: none;">${statusText}</span>
                            <span class="chip" style="font-size: 0.65rem; padding: 2px 6px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-secondary);">${diffLabel}</span>
                            ${langLabel ? `<span class="chip" style="font-size: 0.65rem; padding: 2px 6px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-secondary);">${langLabel}</span>` : ''}
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent); padding: 4px 8px; background: var(--surface-2); border-radius: 4px; border: 1px solid var(--border); white-space: nowrap;">${marksText}</div>
                </div>
            `;
            
            if (isMcq) {
                const correctIdx = q.correctAnswer;
                const letter = answer.charAt(0);
                const userIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
                const skipped = answer === '[Skipped]';
                
                printHtml += `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                `;
                
                (q.options || []).forEach((opt, optIdx) => {
                    const isUserSelected = !skipped && optIdx === userIdx;
                    const isOptCorrect = optIdx === correctIdx;
                    let optClass = '';
                    let indicatorBg = '';
                    let indicatorColor = '';
                    
                    if (isOptCorrect) {
                        optClass = 'correct';
                        indicatorBg = 'var(--success)';
                        indicatorColor = '#fff';
                    } else if (isUserSelected) {
                        optClass = 'selected-incorrect';
                        indicatorBg = 'var(--danger)';
                        indicatorColor = '#fff';
                    }
                    
                    printHtml += `
                    <div class="review-option ${optClass}" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2); font-size: 0.85rem;">
                        <span style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${indicatorBg || 'var(--border)'}; color: ${indicatorColor || 'var(--text-secondary)'}; font-weight: bold; font-size: 0.7rem;">${['A', 'B', 'C', 'D'][optIdx]}</span>
                        <span>${escHtml(opt)}</span>
                        ${isUserSelected ? `<span style="margin-left: auto; font-size: 0.7rem; font-weight: 600; color: ${isOptCorrect ? 'var(--success)' : 'var(--danger)'};">${isOptCorrect ? '✓ Your Answer' : '✗ Your Answer'}</span>` : ''}
                        ${!isUserSelected && isOptCorrect ? `<span style="margin-left: auto; font-size: 0.7rem; font-weight: 600; color: var(--success);">✓ Correct Answer</span>` : ''}
                    </div>
                    `;
                });
                
                printHtml += `</div>`;
            } else if (isCoding) {
                const isPassed = answer.includes(':OK]');
                const langMatch = answer.match(/^\[(?:CODE|STDIN_CODE):(\w+)(?::OK)?\]\n?/i);
                const lang = langMatch ? langMatch[1].toUpperCase() : 'PYTHON';
                const codeBody = langMatch ? answer.replace(/^\[(?:CODE|STDIN_CODE):\w+(?::OK)?\]\n?/i, '').trim() : answer;
                
                printHtml += `
                <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">Submitted Code:</h4>
                        <pre style="font-family: var(--font-mono); font-size: 0.75rem; background: #1e1e2e; color: #cdd6f4; padding: 0.75rem; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; margin: 0; border: 1px solid rgba(255,255,255,0.1); line-height: 1.4;">${escHtml(codeBody)}</pre>
                    </div>
                `;
                
                if (q.testCases && q.testCases.length) {
                    const totalTests = q.testCases.length;
                    const passedTests = isPassed ? totalTests : 0;
                    const failedTests = totalTests - passedTests;
                    
                    printHtml += `
                    <div>
                        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; color: var(--text-primary);">Test Cases: ${passedTests} Passed · ${failedTests} Failed</h4>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                    `;
                    
                    q.testCases.forEach((tc, tcIdx) => {
                        const isPass = isPassed;
                        printHtml += `
                        <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 0.7rem; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border); background: ${isPass ? 'rgba(29, 158, 117, 0.05)' : 'rgba(226, 75, 74, 0.05)'}; color: ${isPass ? 'var(--success)' : 'var(--danger)'};">
                            <span style="font-weight: bold;">${isPass ? '✓' : '✗'}</span>
                            <span style="font-weight: 600;">Test Case ${tcIdx + 1}:</span>
                            <span style="color: var(--text-secondary); margin-right: auto;">Input: <code>${escHtml(tc.input || tc.stdin || 'None')}</code></span>
                            <span style="color: var(--text-muted);">Expected: <code>${escHtml(tc.expectedDisplay || tc.expected || 'None')}</code></span>
                        </div>
                        `;
                    });
                    
                    printHtml += `</div></div>`;
                }
                printHtml += `</div>`;
            } else if (isVideo) {
                const answerObj = as.find(a => a.question === q.text);
                
                printHtml += `
                <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">Transcribed Verbal Response:</h4>
                        <div style="font-size: 0.85rem; font-style: italic; line-height: 1.6; background: var(--surface-2); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border); color: var(--text-primary);">
                            "${escHtml(answer)}"
                        </div>
                    </div>
                `;
                
                if (answerObj && answerObj.grade !== undefined && answerObj.grade !== null) {
                    printHtml += `
                    <div style="border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-top: 0.5rem;">
                        <div style="padding: 6px 12px; background: rgba(168, 85, 247, 0.05); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
                            <strong style="font-size: 0.75rem; color: #a855f7; text-transform: uppercase;">Grading Agent Evaluation</strong>
                            <span class="chip" style="font-size: 0.72rem; background: #a855f7; color: #fff; border: none; padding: 2px 8px; border-radius: 12px; font-weight: 700;">Score: ${answerObj.grade}/10</span>
                        </div>
                        <div style="padding: 10px 12px; background: var(--surface-2); font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                            <p style="margin: 0;"><strong>Feedback:</strong> ${escHtml(answerObj.feedback)}</p>
                        </div>
                    </div>
                    `;
                }
                printHtml += `</div>`;
            }
            
            printHtml += `</div>`;
        });
        
        printOnlyEl.innerHTML = printHtml;
    }
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
    // Browser-side eval is blocked by CSP — return null so the report
    // falls back to the server-side pass/fail stored in the report data.
    return null;
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