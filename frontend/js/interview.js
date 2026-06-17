/* frontend/js/interview.js
   Full interview logic: Section 1 MCQ → Section 2 Coding → Section 3 Video
   Used by: frontend/pages/interview.html
   Replace the inline <script type="module"> block with:
       <script type="module" src="../js/interview.js"></script>
*/

import { interviewApi } from './api.js';
import { requireAuth, showToast, $, hideEl, showEl, setLoading } from './utils.js';

// ═══════════════════════ STATE ═══════════════════════
let interview      = null;
let currentSection = 1;
let timerInterval  = null;
let elapsedSecs    = 0;
let isSubmitting   = false;

// Section 1 (MCQ)
let mcqIndex    = 0;
let mcqSelected = null;
let mcqAnswered = false;
let mcqResults  = [];

// Section 2 (Coding)
let codeIndex = 0;
let isRunning = false;

// Section 3 (Video)
let viIndex     = 0;
let mediaStream = null;
let recognition = null;
let isMicOn     = false;
let isCamOn     = true;

// Collected answers (submitted at the end)
let localAnswers = [];

// ─── Normalise questions: guarantee section + category are always set ──────────
function normaliseQuestions(questions) {
    if (!questions) return [];
    return questions.map((q, i) => {
        let section = Number(q.section);
        if (!section || isNaN(section)) {
            if (i < 5)      section = 1;
            else if (i < 7) section = 2;
            else            section = 3;
        }
        let category = q.category;
        if (!category) {
            if (section === 1)            category = 'mcq';
            else if (section === 2)       category = 'coding';
            else if (q.type === 'behavioral') category = 'behavioral';
            else                          category = 'technical';
        }
        return { ...q, section, category };
    });
}

const getSection1Qs = () => (interview?.questions || []).filter(q => Number(q.section) === 1);
const getSection2Qs = () => (interview?.questions || []).filter(q => Number(q.section) === 2);
const getSection3Qs = () => (interview?.questions || []).filter(q => Number(q.section) === 3);

// ═══════════════════════ BOOTSTRAP ═══════════════════════
(async () => {
    await requireAuth();
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        showToast('No interview ID', 'error');
        setTimeout(() => location.href = '/pages/dashboard.html', 1500);
        return;
    }
    try {
        const data = await interviewApi.get(id);
        interview  = data.interview;
        interview.questions = normaliseQuestions(interview.questions); // ← KEY FIX

        if (interview.status === 'completed' && interview.report) {
            location.href = `/pages/report.html?id=${interview._id}`;
            return;
        }

        // Session recovery: Populate localAnswers from database
        localAnswers = (interview.answers || []).map(a => ({
            question: a.question,
            answer: a.answer,
            answeredAt: a.answeredAt
        }));

        const s1Qs = getSection1Qs();
        const s2Qs = getSection2Qs();
        const s3Qs = getSection3Qs();

        // Populate mcqResults from recovered localAnswers
        s1Qs.forEach((q, idx) => {
            const matchedAns = localAnswers.find(a => a.question === q.text);
            if (matchedAns) {
                if (matchedAns.answer === '[Skipped]') {
                    mcqResults[idx] = null;
                } else {
                    const prefix = matchedAns.answer.substring(0, 2); // e.g. "A:"
                    const correctLetter = ['A', 'B', 'C', 'D'][q.correctAnswer];
                    mcqResults[idx] = prefix.startsWith(correctLetter);
                }
            }
        });

        const s1UnansweredIdx = s1Qs.findIndex(q => !localAnswers.some(a => a.question === q.text));
        const s2UnansweredIdx = s2Qs.findIndex(q => !localAnswers.some(a => a.question === q.text));
        const s3UnansweredIdx = s3Qs.findIndex(q => !localAnswers.some(a => a.question === q.text));

        setText('#header-role',  interview.role);
        setText('#header-level', interview.expLevel + ' level');
        hideEl($('#loading-state'));
        startTimer();

        if (s1UnansweredIdx !== -1) {
            mcqIndex = s1UnansweredIdx;
            showSectionOverlay(1, () => startSection1(mcqIndex));
        } else if (s2UnansweredIdx !== -1) {
            codeIndex = s2UnansweredIdx;
            showSectionOverlay(2, () => startSection2(codeIndex));
        } else if (s3UnansweredIdx !== -1) {
            viIndex = s3UnansweredIdx;
            showSectionOverlay(3, () => startSection3(viIndex));
        } else {
            // All answered, go straight to summary wrap
            showSectionOverlay(3, () => {
                startSection3();
                endSection3();
            });
        }
    } catch (err) {
        showToast(err.message || 'Could not load interview', 'error');
    }
})();

// ═══════════════════════ SECTION OVERLAY ═══════════════════════
const sectionMeta = {
    1: {
        badge: '📝',
        title: 'Section 1 — Multiple Choice',
        desc:  '5 MCQ questions to test your conceptual knowledge. Select the best answer, or skip if unsure.',
    },
    2: {
        badge: '💻',
        title: 'Section 2 — Coding Challenge',
        desc:  '2 hands-on coding problems. Write your solution, run it to check output, then submit.',
    },
    3: {
        badge: '🎥',
        title: 'Section 3 — Video Interview',
        desc:  '7 questions with AI interviewer Alex: 5 technical + 2 behavioral. Speak or type your answers.',
    },
};

function showSectionOverlay(section, onStart) {
    const meta = sectionMeta[section];
    setText('#ov-badge', meta.badge);
    setText('#ov-title', meta.title);
    setText('#ov-desc',  meta.desc);
    
    const startBtn = $('#ov-start-btn');
    if (startBtn) {
        startBtn.textContent = localAnswers.length > 0 ? "Resume Interview →" : "Let's Go →";
    }

    const overlay = $('#section-overlay');
    overlay.classList.add('visible');
    $('#ov-start-btn').onclick = () => {
        overlay.classList.remove('visible');
        onStart();
    };
}

function updatePills(active) {
    for (let i = 1; i <= 3; i++) {
        const pill = $(`#pill-${i}`);
        pill.classList.remove('active', 'done');
        if (i < active)      pill.classList.add('done');
        else if (i === active) pill.classList.add('active');
    }
}

// ═══════════════════════ TIMER ═══════════════════════
function startTimer() {
    timerInterval = setInterval(() => {
        elapsedSecs++;
        const m = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const s = String(elapsedSecs % 60).padStart(2, '0');
        setText('#timer-display', `${m}:${s}`);
    }, 1000);
}

// ═══════════════════════ SECTION 1 — MCQ ═══════════════════════
function startSection1(startIdx = 0) {
    currentSection = 1;
    mcqIndex = startIdx;
    updatePills(1);

    if (getSection1Qs().length === 0) {
        showToast('Could not load MCQ questions. Please start a new interview.', 'error');
        return;
    }

    showEl($('#section1-wrap'));
    buildMcqDots();
    showMcqQuestion(startIdx);

    $('#mcq-submit-btn').addEventListener('click', handleMcqSubmit);
    $('#mcq-next-btn').addEventListener('click', handleMcqNext);
    $('#mcq-skip-btn').addEventListener('click', handleMcqSkip);
}

function buildMcqDots() {
    const qs  = getSection1Qs();
    const bar = $('#mcq-score-dots');
    bar.innerHTML = qs.map((q, i) => {
        let cls = "score-dot";
        let text = i + 1;
        if (mcqResults[i] === true) {
            cls += " correct";
            text = "✓";
        } else if (mcqResults[i] === false) {
            cls += " wrong";
            text = "✕";
        } else if (mcqResults[i] === null && localAnswers.some(a => a.question === q.text)) {
            cls += " skipped";
            text = "—";
        }
        return `<div class="${cls}" id="sd-${i}">${text}</div>`;
    }).join('');
}

function showMcqQuestion(idx) {
    const qs = getSection1Qs();
    if (idx >= qs.length) { endSection1(); return; }

    mcqIndex = idx; mcqSelected = null; mcqAnswered = false;
    const q = qs[idx];

    setText('#mcq-q-num',  `Question ${idx + 1} of ${qs.length}`);
    setText('#mcq-q-text', q.text);
    setText('#progress-label', `Q ${idx + 1} / ${qs.length}`);

    qs.forEach((_, i) => {
        const dot = $(`#sd-${i}`);
        if (!dot) return;
        dot.classList.remove('active');
        if (i === idx) dot.classList.add('active');
    });

    const letters = ['A', 'B', 'C', 'D'];
    const opts = $('#mcq-opts');
    opts.innerHTML = (q.options || []).map((opt, i) => `
        <div class="mcq-opt" data-index="${i}">
            <div class="mcq-letter">${letters[i]}</div>
            <span>${escHtml(opt)}</span>
        </div>`).join('');

    opts.querySelectorAll('.mcq-opt').forEach(el => {
        el.addEventListener('click', () => {
            if (mcqAnswered) return;
            opts.querySelectorAll('.mcq-opt').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            mcqSelected = parseInt(el.dataset.index);
            $('#mcq-submit-btn').disabled = false;
        });
    });

    $('#mcq-submit-btn').disabled = true;
    hideEl($('#mcq-next-btn'));
    showEl($('#mcq-submit-btn'));
    showEl($('#mcq-skip-btn'));
    hideEl($('#mcq-explanation'));
}

function handleMcqSubmit() {
    if (mcqSelected === null || mcqAnswered) return;
    mcqAnswered = true;

    const qs        = getSection1Qs();
    const q         = qs[mcqIndex];
    const isCorrect = mcqSelected === q.correctAnswer;
    mcqResults[mcqIndex] = isCorrect;

    $('#mcq-opts').querySelectorAll('.mcq-opt').forEach((el, i) => {
        if (i === q.correctAnswer)              el.classList.add('correct');
        else if (i === mcqSelected && !isCorrect) el.classList.add('wrong');
    });

    const dot = $(`#sd-${mcqIndex}`);
    if (dot) {
        dot.classList.remove('active');
        dot.classList.add(isCorrect ? 'correct' : 'wrong');
        dot.textContent = isCorrect ? '✓' : '✕';
    }

    if (q.explanation) {
        const expEl = $('#mcq-explanation');
        expEl.innerHTML = `<strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${escHtml(q.explanation)}`;
        showEl(expEl);
    }

    const answerVal = `${['A','B','C','D'][mcqSelected]}: ${q.options[mcqSelected]}`;
    saveAnswer(q.text, answerVal);

    // Sync to backend in background
    const originalIdx = interview.questions.findIndex(item => item.text === q.text);
    if (originalIdx !== -1) {
        interviewApi.answer(interview._id, {
            questionIndex: originalIdx,
            answer: answerVal
        }).catch(err => console.error("Failed to sync MCQ answer:", err));
    }

    hideEl($('#mcq-submit-btn'));
    hideEl($('#mcq-skip-btn'));
    showEl($('#mcq-next-btn'));
    $('#mcq-next-btn').textContent =
        mcqIndex < qs.length - 1 ? 'Next Question →' : 'Go to Coding Section →';
}

function handleMcqNext() {
    const qs = getSection1Qs();
    if (mcqIndex < qs.length - 1) showMcqQuestion(mcqIndex + 1);
    else endSection1();
}

function handleMcqSkip() {
    const qs  = getSection1Qs();
    const q   = qs[mcqIndex];
    const dot = $(`#sd-${mcqIndex}`);
    if (dot) { dot.classList.remove('active'); dot.classList.add('skipped'); dot.textContent = '—'; }
    mcqResults[mcqIndex] = null;
    saveAnswer(q?.text || '', '[Skipped]');

    // Sync to backend in background
    if (q) {
        const originalIdx = interview.questions.findIndex(item => item.text === q.text);
        if (originalIdx !== -1) {
            interviewApi.answer(interview._id, {
                questionIndex: originalIdx,
                answer: '[Skipped]'
            }).catch(err => console.error("Failed to sync skipped MCQ:", err));
        }
    }

    if (mcqIndex < qs.length - 1) showMcqQuestion(mcqIndex + 1);
    else endSection1();
}

function endSection1() {
    const correct = mcqResults.filter(r => r === true).length;
    const total   = getSection1Qs().length;
    hideEl($('#section1-wrap'));
    updatePills(2);
    showToast(`MCQ done! Score: ${correct}/${total} ✅`, 'success', 4000);
    showSectionOverlay(2, () => startSection2());
}

// ═══════════════════════ SECTION 2 — CODING ═══════════════════════
const getS1 = () => (interview?.questions || []).filter(q => Number(q.section) === 1);
const getS2 = () => (interview?.questions || []).filter(q => Number(q.section) === 2);
const getS3 = () => (interview?.questions || []).filter(q => Number(q.section) === 3);

function getLang() { return ($('#code-lang')?.value || 'javascript').toLowerCase(); }

const LANG_BADGE = {
    javascript: 'JS', python: 'PY', java: 'JAVA',
    cpp: 'C++', c: 'C', typescript: 'TS', go: 'GO', rust: 'RS',
};

function getStarterForLang(lang, q) {
    if (q.starterCode && typeof q.starterCode === 'object') {
        return q.starterCode[lang] || q.starterCode['python'] ||
            `# Read your input and print your output\n`;
    }
    if (q.starterCode && typeof q.starterCode === 'string') {
        return q.starterCode;
    }
    return `# Read your input and print your output\n`;
}

function parseDescription(text) {
    let desc = '';
    let inputFormat = '';
    let outputFormat = '';

    const lowerText = text.toLowerCase();
    
    const inputIdx = lowerText.indexOf('input format:');
    if (inputIdx !== -1) {
        desc = text.substring(0, inputIdx).trim();
        
        const outputIdx = lowerText.indexOf('output format:', inputIdx);
        if (outputIdx !== -1) {
            inputFormat = text.substring(inputIdx + 'input format:'.length, outputIdx).trim();
            
            let exampleIdx = lowerText.indexOf('example', outputIdx);
            if (exampleIdx === -1) {
                exampleIdx = lowerText.indexOf('sample', outputIdx);
            }
            if (exampleIdx !== -1) {
                outputFormat = text.substring(outputIdx + 'output format:'.length, exampleIdx).trim();
            } else {
                outputFormat = text.substring(outputIdx + 'output format:'.length).trim();
            }
        } else {
            inputFormat = text.substring(inputIdx + 'input format:'.length).trim();
        }
    } else {
        desc = text.trim();
    }

    return { desc, inputFormat, outputFormat };
}

function startSection2(idx = 0) {
    currentSection = 2; codeIndex = idx; updatePills(2);
    showEl($('#section2-wrap'));
    buildCodeDots();
    showCodeQuestion(idx);

    if (!startSection2.bound) {
        // Language switcher
        $('#code-lang').addEventListener('change', () => {
            const lang = getLang();
            setText('#lang-badge', LANG_BADGE[lang] || lang.toUpperCase());
            // Only replace if user hasn't edited
            if ($('#code-textarea').dataset.isStarter === 'true') {
                const q = getS2()[codeIndex];
                $('#code-textarea').value = getStarterForLang(lang, q);
            }
            updateLangNote(lang);
        });

        // Mark as edited once user types
        $('#code-textarea').addEventListener('input', () => {
            $('#code-textarea').dataset.isStarter = 'false';
        });

        $('#run-btn').addEventListener('click', runCode);
        $('#code-submit-btn').addEventListener('click', handleCodeSubmit);
        $('#code-skip-btn').addEventListener('click', handleCodeSkip);
        $('#reset-starter-btn').addEventListener('click', resetToStarter);

        // Keyboard shortcuts
        $('#code-textarea').addEventListener('keydown', e => {
            // Ctrl+Enter → run code
            if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); runCode(); return; }

            // Tab → 4-space indent
            if (e.key === 'Tab') {
                e.preventDefault();
                const ta = e.target, s = ta.selectionStart, en = ta.selectionEnd;
                if (s === en) {
                    document.execCommand('insertText', false, '    ');
                } else {
                    const ls = ta.value.lastIndexOf('\n', s - 1) + 1;
                    const le = ta.value.indexOf('\n', en - 1);
                    const block = ta.value.substring(ls, le === -1 ? ta.value.length : le);
                    const ind = block.split('\n').map(l => '    ' + l).join('\n');
                    ta.setSelectionRange(ls, le === -1 ? ta.value.length : le);
                    document.execCommand('insertText', false, ind);
                    ta.setSelectionRange(ls, ls + ind.length);
                }
                return;
            }

            // Enter → auto-indent (with Python colon detection)
            if (e.key === 'Enter') {
                e.preventDefault();
                const ta = e.target, s = ta.selectionStart, en = ta.selectionEnd;
                const lines = ta.value.substring(0, s).split('\n');
                const currentLine = lines[lines.length - 1];
                const indent = currentLine.match(/^(\s*)/)[1];
                const extra = (lang === 'python' && currentLine.trimEnd().endsWith(':')) ? '    ' : '';
                const insertion = '\n' + indent + extra;
                // Use direct value manipulation for reliable Enter key behavior
                const before = ta.value.substring(0, s);
                const after = ta.value.substring(en);
                ta.value = before + insertion + after;
                const newPos = s + insertion.length;
                ta.selectionStart = ta.selectionEnd = newPos;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        startSection2.bound = true;
    }
}

function updateLangNote(lang) {
    const el = $('#lang-compiled-note');
    if (el) el.style.display = 'none';
}

function buildCodeDots() {
    const s2 = getS2();
    $('#code-progress-dots').innerHTML = s2.map((q, i) => {
        let cls = 'qd';
        const ansObj = localAnswers.find(a => a.question === q.text);
        if (ansObj) {
            cls += ansObj.answer === '[Skipped]' ? ' skipped' : ' done';
        }
        return `<div class="${cls}" id="cd-${i}"></div>`;
    }).join('');
}

function showCodeQuestion(idx) {
    const qs = getS2();
    if (idx >= qs.length) { endSection2(); return; }
    codeIndex = idx;
    let lastRunPassed = 0;
    const q = qs[idx];

    setText('#code-q-num', `Coding ${idx + 1} of ${qs.length}`);
    setText('#progress-label', `Coding ${idx + 1} / ${qs.length}`);

    // Difficulty chip
    const diff = (q.difficulty || 'medium').toLowerCase();
    const diffEl = $('#difficulty-chip');
    if (diffEl) {
        diffEl.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
        diffEl.className = `difficulty-chip ${diff}`;
    }

    // Parse and render problem details
    const parsedText = parseDescription(q.text || '');

    // Problem description
    setText('#prob-title', q.title || `Problem ${idx + 1}`);
    const descEl = $('#prob-desc');
    if (descEl) {
        descEl.innerHTML = parsedText.desc
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    // Input Format
    const inputTitleEl = $('#prob-input-format-title');
    const inputValEl = $('#prob-input-format');
    if (parsedText.inputFormat) {
        showEl(inputTitleEl);
        showEl(inputValEl);
        if (inputValEl) {
            inputValEl.innerHTML = parsedText.inputFormat
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/`([^`]+)`/g, '<code>$1</code>');
        }
    } else {
        hideEl(inputTitleEl);
        hideEl(inputValEl);
    }

    // Output Format
    const outputTitleEl = $('#prob-output-format-title');
    const outputValEl = $('#prob-output-format');
    if (parsedText.outputFormat) {
        showEl(outputTitleEl);
        showEl(outputValEl);
        if (outputValEl) {
            outputValEl.innerHTML = parsedText.outputFormat
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/`([^`]+)`/g, '<code>$1</code>');
        }
    } else {
        hideEl(outputTitleEl);
        hideEl(outputValEl);
    }

    // Examples / Samples
    const exEl = $('#prob-examples');
    const richEx = Array.isArray(q.examples) && q.examples.length ? q.examples : null;
    if (exEl) {
        if (richEx) {
            exEl.innerHTML = richEx.map((ex, exIdx) => `
        <div class="example-card">
            <div style="font-size: .7rem; font-weight: 700; color: var(--accent-light); margin-bottom: 10px; text-transform: uppercase; letter-spacing: .05em;">Sample Case ${exIdx}</div>
            <div class="sample-label">Sample Input</div>
            <pre class="sample-box">${escHtml(ex.input || '')}</pre>
            <div class="sample-label">Sample Output</div>
            <pre class="sample-box">${escHtml(ex.output || ex.expected || '')}</pre>
            ${ex.explanation ? `<div class="ex-explanation"><strong>Explanation:</strong> ${escHtml(ex.explanation)}</div>` : ''}
        </div>`).join('');
        } else {
            exEl.innerHTML = `<div style="font-size:.8rem;color:rgba(255,255,255,.3);font-style:italic">See test results below.</div>`;
        }
    }

    // Constraints
    const cWrap = $('#prob-constraints-wrap');
    const cons = Array.isArray(q.constraints) && q.constraints.length ? q.constraints : null;
    if (cons) {
        showEl(cWrap);
        const consEl = $('#prob-constraints');
        if (consEl) {
            consEl.innerHTML = cons.map(c =>
                `<div class="constraint-row">${escHtml(c)}</div>`).join('');
        }
    } else {
        hideEl(cWrap);
    }

    // Hint
    const hintEl = $('#prob-hint-content');
    if (hintEl) {
        hintEl.innerHTML = q.explanation
            ? `<strong>💡 Hint</strong><br/>${escHtml(q.explanation)}`
            : `<strong>💡 Tips</strong><br/>Think about time complexity. Check the constraints for clues on the expected approach.`;
    }

    // Code editor — start with saved answer if present, otherwise default template starter
    const lang = 'python';
    $('#code-lang').value = lang;
    setText('#lang-badge', 'PY');

    const ta = $('#code-textarea');
    if (ta) {
        const matchedAns = localAnswers.find(a => a.question === q.text);
        if (matchedAns && matchedAns.answer && matchedAns.answer !== '[Skipped]') {
            // Check if it's formatted code e.g. [CODE:PYTHON]\n... or [STDIN_CODE:PYTHON:OK]\n...
            const answerVal = matchedAns.answer;
            const prefixRegex = /^\[(?:CODE|STDIN_CODE):\w+(?::OK)?\]\n/i;
            if (prefixRegex.test(answerVal)) {
                ta.value = answerVal.replace(prefixRegex, '');
            } else {
                ta.value = answerVal;
            }
            ta.dataset.isStarter = 'false';
        } else {
            ta.value = getStarterForLang(lang, q);
            ta.dataset.isStarter = 'true';
        }
    }

    // Progress dots
    getS2().forEach((item, i) => {
        const d = $(`#cd-${i}`); if (!d) return;
        d.className = 'qd'; // Reset classes
        const matchedAns = localAnswers.find(a => a.question === item.text);
        if (i < idx) {
            if (matchedAns && matchedAns.answer === '[Skipped]') {
                d.classList.add('skipped');
            } else {
                d.classList.add('done');
            }
        } else if (i === idx) {
            d.classList.add('active');
        } else {
            if (matchedAns) {
                if (matchedAns.answer === '[Skipped]') d.classList.add('skipped');
                else d.classList.add('done');
            }
        }
    });

    // Reset test panel + disable submit
    resetTestPanel(q);
    $('#code-submit-btn').disabled = true;
    $('#code-submit-btn').title = 'Run your code and pass all test cases first';

    // Switch to description tab
    document.querySelectorAll('.problem-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.problem-tab[data-tab="description"]')?.classList.add('active');
    showEl($('#prob-description-tab'));
    hideEl($('#prob-hint-tab'));
}

function resetToStarter() {
    const q = getS2()[codeIndex];
    const ta = $('#code-textarea');
    if (ta) {
        ta.value = getStarterForLang(getLang(), q);
        ta.dataset.isStarter = 'true';
    }
    resetTestPanel(q);
    $('#code-submit-btn').disabled = true;
    showToast('Editor reset to starter code', 'info', 2000);
}

function resetTestPanel(q) {
    const visibleTCs = (q?.testCases || []).filter(tc => !tc.hidden);
    const summaryEl = $('#test-summary-badge');
    if (summaryEl) {
        summaryEl.className = 'test-summary-badge idle';
        summaryEl.textContent = visibleTCs.length
            ? `${visibleTCs.length} test case${visibleTCs.length > 1 ? 's' : ''} ready`
            : 'No test cases';
    }
    setText('#run-time-display', '');
    const tableEl = $('#test-table-wrap');
    if (tableEl) {
        tableEl.innerHTML = `
    <div class="test-idle-placeholder">
        Press <kbd style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);
        color:rgba(255,255,255,.65);padding:1px 6px;border-radius:4px;font-size:.7rem">▶ Run Code</kbd>
        &nbsp; to see test results
    </div>`;
    }
}

function renderSkeleton(count) {
    let rows = '';
    for (let i = 0; i < count; i++) {
        rows += `<tr>
    <td class="tc-idx">${i + 1}</td>
    <td><span class="status-run"><span class="run-spinner"></span> Running…</span></td>
    <td><span class="mono-val">—</span></td>
    <td><span class="mono-val">—</span></td>
    <td><span class="mono-val">—</span></td>
</tr>`;
    }
    const tableEl = $('#test-table-wrap');
    if (tableEl) {
        tableEl.innerHTML = `
    <table class="results-table">
        <thead><tr>
            <th>#</th><th>Status</th><th>Input</th><th>Expected</th><th>Your Output</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
    }
}

function renderResultsTable(results) {
    const wrap = $('#test-table-wrap');
    if (!wrap) return;

    // Full compile error — show message block, no table
    if (results.length && results[0].isCompileError) {
        wrap.innerHTML = `<div class="test-special ce">⚠️ Compilation Error\n\n${escHtml(results[0].error || '')}</div>`;
        return;
    }

    let rows = '';
    results.forEach((r, i) => {
        const isTLE = r.error === 'Time Limit Exceeded — your code is too slow' || r.error === 'Time Limit Exceeded -- your code is too slow';
        const isBlocked = r.error === 'Blocked by compilation error';
        const isRtError = !r.passed && r.actual === null && !r.isCompileError;

        let statusCell, outputCell;

        if (r.isCompileError || isBlocked) {
            statusCell = `<span class="status-err">⚠️ CE</span>`;
            outputCell = `<span class="mono-val err">${isBlocked ? 'Blocked' : 'Compile Error'}</span>`;
        } else if (isTLE) {
            statusCell = `<span class="status-err">⏳ TLE</span>`;
            outputCell = `<span class="mono-val err">Time Limit Exceeded</span>`;
        } else if (isRtError) {
            statusCell = `<span class="status-err">❌ Error</span>`;
            outputCell = `<span class="mono-val err" title="${escHtml(r.error || '')}">${escHtml((r.error || 'Runtime Error').slice(0, 120))}</span>`;
        } else if (r.passed) {
            statusCell = `<span class="status-pass">✓ Pass</span>`;
            outputCell = `<span class="mono-val pass">${escHtml(String(r.actual ?? ''))}</span>`;
        } else {
            statusCell = `<span class="status-fail">❌ Fail</span>`;
            outputCell = `<span class="mono-val fail">${escHtml(String(r.actual ?? '(no output)'))}</span>`;
        }

        rows += `<tr>
    <td class="tc-idx">${i + 1}</td>
    <td>${statusCell}</td>
    <td><span class="mono-val">${escHtml(String(r.input || ''))}</span></td>
    <td><span class="mono-val">${escHtml(String(r.expected || ''))}</span></td>
    <td>${outputCell}</td>
</tr>`;
    });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const allPass = passed === total;
    const color = allPass ? '#1D9E75' : '#E24B4A';

    wrap.innerHTML = `
<table class="results-table">
    <thead><tr>
        <th>#</th><th>Status</th><th>Input</th><th>Expected</th><th>Your Output</th>
    </tr></thead>
    <tbody>${rows}</tbody>
</table>
<div class="test-summary-row">
    Passed: <strong style="color:${color}">${passed}/${total}</strong>
    &nbsp;•&nbsp;
    Result: <strong style="color:${color}">${allPass ? '✅ All Tests Passed!' : '❌ Wrong Answer'}</strong>
</div>`;
}

async function runCode() {
    if (isRunning) return;

    const code = ($('#code-textarea').value || '').trim();
    const lang = getLang();
    const q = getS2()[codeIndex];

    if (!code || code.length < 3) {
        showToast('Write some code first!', 'warning');
        return;
    }

    // Only run visible (non-hidden) test cases
    const visibleTCs = (q.testCases || []).filter(tc => !tc.hidden);
    if (!visibleTCs.length) {
        showToast('No test cases available for this problem', 'warning');
        return;
    }

    isRunning = true;
    const btn = $('#run-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="run-spinner"></span> Running…';
    }
    $('#code-submit-btn').disabled = true;

    const summaryEl = $('#test-summary-badge');
    if (summaryEl) {
        summaryEl.className = 'test-summary-badge running';
        summaryEl.textContent = `Running ${visibleTCs.length} test${visibleTCs.length > 1 ? 's' : ''}…`;
    }
    setText('#run-time-display', '');

    // Show skeleton immediately so user sees progress
    renderSkeleton(visibleTCs.length);

    const t0 = performance.now();

    try {
        const token = sessionStorage.getItem('accessToken');
        const resp = await fetch('/api/interview/run-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({
                code,
                language: lang,
                testCases: visibleTCs,
            }),
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.message || `Server error ${resp.status}`);
        }

        const data = await resp.json();

        if (!data.success) throw new Error(data.message || 'Execution failed');

        const elapsed = Math.round(performance.now() - t0);
        setText('#run-time-display', `${elapsed} ms`);

        const results = data.results || [];
        const passed = data.passed ?? results.filter(r => r.passed).length;
        const total = data.total ?? results.length;

        // Update summary badge
        const hasCompile = results.some(r => r.isCompileError);
        const hasError = results.some(r => !r.passed && r.actual === null && !r.isCompileError);

        if (summaryEl) {
            if (hasCompile) {
                summaryEl.className = 'test-summary-badge error';
                summaryEl.textContent = '⚠️ Compilation Error';
            } else if (passed === total && total > 0) {
                summaryEl.className = 'test-summary-badge accepted';
                summaryEl.textContent = `✓ Accepted  ${passed}/${total} passed`;
            } else if (hasError) {
                summaryEl.className = 'test-summary-badge error';
                summaryEl.textContent = `❌ Error  ${passed}/${total} passed`;
            } else {
                summaryEl.className = 'test-summary-badge wrong';
                summaryEl.textContent = `❌ Wrong Answer  ${passed}/${total} passed`;
            }
        }

        renderResultsTable(results);

        // Enable submit ONLY when ALL tests pass
        if (!hasCompile && passed === total && total > 0) {
            $('#code-submit-btn').disabled = false;
            $('#code-submit-btn').title = 'All tests passed — click to submit';
            showToast(`All ${total} tests passed! ✅ You can now submit.`, 'success', 4000);
        } else {
            $('#code-submit-btn').disabled = true;
            if (!hasCompile) {
                showToast(
                    `${passed}/${total} tests passed`,
                    passed > 0 ? 'warning' : 'error',
                    3000
                );
            }
        }

    } catch (err) {
        if (summaryEl) {
            summaryEl.className = 'test-summary-badge error';
            summaryEl.textContent = '❌ Error';
        }
        const tableEl = $('#test-table-wrap');
        if (tableEl) {
            tableEl.innerHTML = `
        <div class="test-special ce">⚠️ ${escHtml(err.message || 'Unknown error — check your connection and try again')}</div>`;
        }
        showToast('Execution error: ' + (err.message || 'unknown'), 'error', 4000);
    } finally {
        isRunning = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '▶ Run Code';
        }
    }
}

function handleCodeSubmit() {
    const code = ($('#code-textarea').value || '').trim();
    const lang = getLang();

    if (!code || code.length < 3) {
        showToast('Write some code before submitting', 'warning');
        return;
    }
    if ($('#code-submit-btn').disabled) {
        showToast('Run your code and pass all test cases first', 'warning');
        return;
    }

    const qs = getS2();
    const q  = qs[codeIndex];
    const answerVal = `[STDIN_CODE:${lang.toUpperCase()}:OK]\n${code}`;
    saveAnswer(q?.text || '', answerVal);

    const d = $(`#cd-${codeIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('done'); }
    showToast('Code submitted! ✅', 'success');

    // Sync to backend in background
    if (q) {
        const originalIdx = interview.questions.findIndex(item => item.text === q.text);
        if (originalIdx !== -1) {
            interviewApi.answer(interview._id, {
                questionIndex: originalIdx,
                answer: answerVal
            }).catch(err => console.error("Failed to sync code answer:", err));
        }
    }

    if (codeIndex < qs.length - 1) showCodeQuestion(codeIndex + 1);
    else endSection2();
}

function handleCodeSkip() {
    const qs = getS2();
    const q  = qs[codeIndex];
    const d  = $(`#cd-${codeIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('skipped'); }
    saveAnswer(q?.text || '', '[Skipped]');

    // Sync to backend in background
    if (q) {
        const originalIdx = interview.questions.findIndex(item => item.text === q.text);
        if (originalIdx !== -1) {
            interviewApi.answer(interview._id, {
                questionIndex: originalIdx,
                answer: '[Skipped]'
            }).catch(err => console.error("Failed to sync skipped code:", err));
        }
    }

    if (codeIndex < qs.length - 1) showCodeQuestion(codeIndex + 1);
    else endSection2();
}

function endSection2() {
    hideEl($('#section2-wrap'));
    updatePills(3);
    showSectionOverlay(3, () => startSection3());
}

// ═══════════════════════ SECTION 3 — VIDEO ═══════════════════════
async function startSection3(startIdx = 0) {
    currentSection = 3;
    viIndex = startIdx;
    document.body.classList.add('video-mode');
    showEl($('#section3-wrap'));
    buildViDots();
    await initCamera();
    initSpeech();
    await showViQuestion(startIdx);

    $('#vi-submit-btn').addEventListener('click', handleViSubmit);
    $('#vi-skip-btn').addEventListener('click', handleViSkip);
    $('#vi-mic-btn').addEventListener('click', toggleMic);
    $('#vi-cam-btn').addEventListener('click', toggleCam);
    $('#vi-answer').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleViSubmit(); }
    });
}

function buildViDots() {
    const qs   = getSection3Qs();
    const dots = $('#vi-progress-dots');
    dots.innerHTML = qs.map((q, i) => {
        let cls = "qd";
        const matchedAns = localAnswers.find(a => a.question === q.text);
        if (matchedAns) {
            if (matchedAns.answer === '[Skipped]') {
                cls += " skipped";
            } else {
                cls += " done";
            }
        }
        return `<div class="${cls}" id="vd-${i}" title="${q.category === 'behavioral' ? '🧠 Behavioral' : '⚙️ Technical'}"></div>`;
    }).join('') + `<span style="font-size:.72rem;color:rgba(255,255,255,.4);margin-left:6px">Video Interview</span>`;
}

async function showViQuestion(idx, transitionText = null) {
    const qs = getSection3Qs();
    if (idx >= qs.length) { endSection3(); return; }
    viIndex = idx;
    const q = qs[idx];

    $('#vi-q-text').innerHTML = '<div class="vi-typing-dots"><span></span><span></span><span></span></div>';
    $('#vi-answer').value = '';

    qs.forEach((item, i) => {
        const d = $(`#vd-${i}`); if (!d) return;
        d.className = 'qd'; // Reset classes
        const matchedAns = localAnswers.find(a => a.question === item.text);
        if (i < idx) {
            if (matchedAns && matchedAns.answer === '[Skipped]') {
                d.classList.add('skipped');
            } else {
                d.classList.add('done');
            }
        } else if (i === idx) {
            d.classList.add('active');
        } else {
            // Future questions
            if (matchedAns) {
                if (matchedAns.answer === '[Skipped]') d.classList.add('skipped');
                else d.classList.add('done');
            }
        }
    });
    setText('#progress-label', `Video ${idx + 1} / ${qs.length}`);

    await sleep(1000);

    let speechText = "";
    if (transitionText) {
        speechText = transitionText;
    } else {
        speechText = idx === 0
            ? `Hi! I'm Alex, your interviewer. Let's begin the adaptive verbal section. Based on your profile, here is the first question: ${q.text}`
            : q.text;
    }

    const typeBadge = q.category === 'behavioral'
        ? `<div class="vi-q-type-badge vi-q-type-behavioral">🧠 Behavioral</div>`
        : `<div class="vi-q-type-badge vi-q-type-technical">⚙️ Technical</div>`;
    $('#vi-q-text').innerHTML = typeBadge + '<div>' + escHtml(q.text) + '</div>';

    await speakText(speechText);
}

async function handleViSubmit() {
    if (isSubmitting) return;
    const answer = $('#vi-answer').value.trim();
    if (!answer || answer.length < 5) { showToast('Please give a more complete answer', 'warning'); return; }

    isSubmitting = true;
    if (isMicOn) { recognition?.stop(); isMicOn = false; updateMicBtn(); $('#rec-dot').classList.add('hidden'); }

    const btn = $('#vi-submit-btn');
    btn.disabled = true; btn.textContent = '⏳';

    const qs = getSection3Qs();
    const currentQ = qs[viIndex];
    saveAnswer(currentQ.text || '', answer);

    const qTextEl = $('#vi-q-text');
    const prevQText = qTextEl.innerHTML;
    qTextEl.innerHTML = `
        <div class="agent-thinking-state" style="font-size: 0.85rem; color: #a855f7; padding: 10px 14px; background: rgba(168, 85, 247, 0.08); border-radius: 8px; border-left: 3px solid #a855f7; margin-bottom: 12px; font-weight: 500;">
            🤖 <strong>Grading Agent</strong> evaluating response depth...
        </div>
        <div class="agent-thinking-state" id="planning-loader" style="font-size: 0.85rem; color: rgba(255,255,255,0.4); padding: 10px 14px; margin-bottom: 12px; font-weight: 500;">
            ⚙️ <strong>Planning Agent</strong> determining follow-up action...
        </div>
    `;

    setTimeout(() => {
        const planLoader = document.getElementById('planning-loader');
        if (planLoader) {
            planLoader.style.color = '#0d9488';
            planLoader.style.background = 'rgba(13, 148, 136, 0.08)';
            planLoader.style.borderLeft = '3px solid #0d9488';
            planLoader.style.borderRadius = '8px';
            planLoader.innerHTML = '⚙️ <strong>Planning Agent</strong> generating adaptive follow-up...';
        }
    }, 1200);

    try {
        const originalIdx = interview.questions.findIndex(q => q.text === currentQ.text);
        const res = await interviewApi.answer(interview._id, {
            questionIndex: originalIdx,
            answer: answer
        });

        const d = $(`#vd-${viIndex}`);
        if (d) { d.classList.remove('active'); d.classList.add('done'); }

        if (res.isComplete) {
            if (res.aiResponse) {
                qTextEl.innerHTML = `<div class="vi-q-type-badge vi-q-type-technical" style="background:var(--success)">🏁 Interview Complete</div><div>${escHtml(res.aiResponse)}</div>`;
                await speakText(res.aiResponse);
            }
            isSubmitting = false;
            btn.disabled = false; btn.textContent = '➤';
            endSection3();
        } else {
            if (res.nextQuestion) {
                interview.questions.push(res.nextQuestion);
                buildViDots();
            }
            isSubmitting = false;
            btn.disabled = false; btn.textContent = '➤';

            viIndex++;
            await showViQuestion(viIndex, res.aiResponse);
        }
    } catch (err) {
        showToast(err.message || 'Error communicating with AI agents', 'error');
        qTextEl.innerHTML = prevQText;
        isSubmitting = false;
        btn.disabled = false; btn.textContent = '➤';
    }
}

function handleViSkip() {
    if (isSubmitting) return;
    const qs = getSection3Qs();
    const currentQ = qs[viIndex];
    saveAnswer(currentQ.text || '', '[Skipped]');

    const d  = $(`#vd-${viIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('skipped'); }

    isSubmitting = true;
    const originalIdx = interview.questions.findIndex(q => q.text === currentQ.text);
    interviewApi.answer(interview._id, {
        questionIndex: originalIdx,
        answer: '[Skipped]'
    }).then(res => {
        if (res.nextQuestion) {
            interview.questions.push(res.nextQuestion);
            buildViDots();
        }
        isSubmitting = false;
        if (res.isComplete) {
            endSection3();
        } else {
            viIndex++;
            showViQuestion(viIndex, res.aiResponse);
        }
    }).catch(err => {
        isSubmitting = false;
        showToast('Skip failed', 'error');
    });
}

function endSection3() {
    if (isMicOn) { recognition?.stop(); isMicOn = false; }
    window.speechSynthesis?.cancel();
    mediaStream?.getTracks().forEach(t => t.stop());
    document.body.classList.remove('video-mode');
    hideEl($('#section3-wrap'));
    clearInterval(timerInterval);
    showEl($('#complete-wrap'));
    $('#get-report-btn').addEventListener('click', handleEvaluate);
}

async function initCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const v = $('#user-video');
        if (v) v.srcObject = mediaStream;
        isCamOn = true;
    } catch (_) {
        isCamOn = false;
        showEl($('#cam-off'));
        hideEl($('#user-video'));
    }
}

function toggleCam() {
    isCamOn = !isCamOn;
    const v = $('#user-video'), off = $('#cam-off'), btn = $('#vi-cam-btn');
    if (isCamOn) {
        showEl(v); hideEl(off); btn.classList.remove('off'); initCamera();
    } else {
        hideEl(v); showEl(off); btn.classList.add('off');
        mediaStream?.getTracks().forEach(t => t.stop());
    }
}

function initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';
    recognition.onresult = e => {
        const t = Array.from(e.results).map(r => r[0].transcript).join('');
        $('#vi-answer').value = t;
        const wrap = $('#transcript-content');
        if (wrap) wrap.innerHTML = `<div class="transcript-line">${escHtml(t)}</div>`;
    };
    recognition.onerror = () => {
        isMicOn = false; updateMicBtn(); $('#rec-dot').classList.add('hidden');
    };
}

function toggleMic() {
    if (!recognition) { showToast('Speech recognition not supported in this browser', 'warning'); return; }
    isMicOn = !isMicOn;
    if (isMicOn) { recognition.start(); $('#rec-dot').classList.remove('hidden'); }
    else          { recognition.stop();  $('#rec-dot').classList.add('hidden'); }
    updateMicBtn();
}

function updateMicBtn() {
    const btn = $('#vi-mic-btn');
    if (!btn) return;
    if (isMicOn) btn.classList.add('recording');
    else         btn.classList.remove('recording');
}

function speakText(text) {
    return new Promise(resolve => {
        if (!window.speechSynthesis) { resolve(); return; }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9; u.pitch = 1.0; u.volume = 1.0;
        const vs = window.speechSynthesis.getVoices();
        const v  = vs.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
                || vs.find(v => v.lang.startsWith('en'))
                || vs[0];
        if (v) u.voice = v;
        u.onstart = () => {
            $('#ai-avatar')?.classList.add('speaking');
            $('#soundwave')?.classList.add('active');
        };
        u.onend = () => {
            $('#ai-avatar')?.classList.remove('speaking');
            $('#soundwave')?.classList.remove('active');
            resolve();
        };
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
    });
}

// ═══════════════════════ ANSWERS + EVALUATE ═══════════════════════
function saveAnswer(question, answer) {
    localAnswers.push({ question, answer, answeredAt: new Date().toISOString() });
}

async function handleEvaluate() {
    const btn     = $('#get-report-btn');
    const spinner = $('#report-spinner');
    showEl(spinner);
    setLoading(btn, true, 'Generating report…');

    try {
        // Find correct questionIndex for each localAnswer by matching question text
        for (let i = 0; i < localAnswers.length; i++) {
            const ans = localAnswers[i];
            const originalIdx = interview.questions.findIndex(q => q.text === ans.question);
            if (originalIdx !== -1) {
                try {
                    await interviewApi.answer(interview._id, {
                        questionIndex: originalIdx,
                        answer:        ans.answer,
                    });
                } catch (_) { /* keep going even if one save fails */ }
            }
        }
        await interviewApi.evaluate(interview._id);
        location.href = `/pages/report.html?id=${interview._id}`;
    } catch (err) {
        showToast(err.message || 'Could not generate report', 'error');
        hideEl(spinner);
        setLoading(btn, false, 'Get My Report →');
    }
}

// ═══════════════════════ TINY HELPERS ═══════════════════════
function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = val;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function escHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}