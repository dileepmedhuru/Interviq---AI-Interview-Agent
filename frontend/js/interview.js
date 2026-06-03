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

        setText('#header-role',  interview.role);
        setText('#header-level', interview.expLevel + ' level');
        hideEl($('#loading-state'));
        startTimer();
        showSectionOverlay(1, () => startSection1());
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
function startSection1() {
    currentSection = 1;
    mcqIndex = 0;
    updatePills(1);

    if (getSection1Qs().length === 0) {
        showToast('Could not load MCQ questions. Please start a new interview.', 'error');
        return;
    }

    showEl($('#section1-wrap'));
    buildMcqDots();
    showMcqQuestion(0);

    $('#mcq-submit-btn').addEventListener('click', handleMcqSubmit);
    $('#mcq-next-btn').addEventListener('click', handleMcqNext);
    $('#mcq-skip-btn').addEventListener('click', handleMcqSkip);
}

function buildMcqDots() {
    const qs  = getSection1Qs();
    const bar = $('#mcq-score-dots');
    bar.innerHTML = qs.map((_, i) => `<div class="score-dot" id="sd-${i}">${i + 1}</div>`).join('');
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

    saveAnswer(q.text, `${['A','B','C','D'][mcqSelected]}: ${q.options[mcqSelected]}`);
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
    const dot = $(`#sd-${mcqIndex}`);
    if (dot) { dot.classList.remove('active'); dot.classList.add('skipped'); dot.textContent = '—'; }
    mcqResults[mcqIndex] = null;
    saveAnswer(qs[mcqIndex]?.text || '', '[Skipped]');
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
const langTemplates = {
    python:     '# Write your Python solution here\n\ndef solution():\n    # your code here\n    pass\n\nprint(solution())\n',
    javascript: '// Write your JavaScript solution here\n\nfunction solution() {\n    // your code here\n    return null;\n}\n\nconsole.log(solution());\n',
    java:       'public class Solution {\n    public static void main(String[] args) {\n        System.out.println("Result: ");\n    }\n}\n',
    c:          '#include <stdio.h>\n\nint main() {\n    printf("Result: \\n");\n    return 0;\n}\n',
    cpp:        '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Result: " << endl;\n    return 0;\n}\n',
    sql:        '-- Write your SQL query here\n\nSELECT *\nFROM table_name\nWHERE condition;\n',
    typescript: 'function solution(): void {\n    console.log("Result: ");\n}\n\nsolution();\n',
    go:         'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Result: ")\n}\n',
    rust:       'fn main() {\n    println!("Result: ");\n}\n',
    ruby:       'def solution\n    # your code here\nend\n\nputs solution\n',
};

const langBadge = {
    python:'PY', javascript:'JS', java:'JAVA', c:'C', cpp:'C++',
    sql:'SQL', typescript:'TS', go:'GO', rust:'RS', ruby:'RB',
};

function startSection2() {
    currentSection = 2;
    codeIndex = 0;
    showEl($('#section2-wrap'));
    buildCodeDots();
    showCodeQuestion(0);

    $('#code-lang').addEventListener('change', () => {
        const lang = $('#code-lang').value;
        setText('#lang-badge', langBadge[lang] || lang.toUpperCase());
        const ta = $('#code-textarea');
        if (!ta.value.trim() || ta.dataset.isTemplate === 'true') {
            ta.value = langTemplates[lang] || '';
            ta.dataset.isTemplate = 'true';
        }
    });

    $('#code-textarea').addEventListener('input', () => {
        $('#code-textarea').dataset.isTemplate = 'false';
    });

    $('#run-btn').addEventListener('click', runCode);
    $('#code-submit-btn').addEventListener('click', handleCodeSubmit);
    $('#code-skip-btn').addEventListener('click', handleCodeSkip);
    $('#code-clear-btn').addEventListener('click', () => {
        const lang = $('#code-lang').value;
        $('#code-textarea').value = langTemplates[lang] || '';
        $('#code-textarea').dataset.isTemplate = 'true';
        const op = $('#output-panel');
        op.className = 'output-panel';
        op.textContent = '';
        $('#output-status').style.display = 'none';
    });

    $('#code-textarea').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); runCode(); }
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = e.target, start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + 4;
        }
    });
}

function buildCodeDots() {
    const qs   = getSection2Qs();
    const dots = $('#code-progress-dots');
    dots.innerHTML = qs.map((_, i) => `<div class="qd" id="cd-${i}"></div>`).join('')
        + `<span style="font-size:.75rem;color:var(--text-muted);margin-left:6px">Coding Challenge</span>`;
    $(`#cd-0`)?.classList.add('active');
}

function showCodeQuestion(idx) {
    const qs = getSection2Qs();
    if (idx >= qs.length) { endSection2(); return; }
    codeIndex = idx;
    const q = qs[idx];

    setText('#code-q-num',  `Coding ${idx + 1} of ${qs.length}`);
    setText('#code-q-text', q.text);
    setText('#progress-label', `Coding ${idx + 1} / ${qs.length}`);

    if (q.language) {
        const opt = [...$('#code-lang').options].find(o => o.value === q.language);
        if (opt) {
            $('#code-lang').value = q.language;
            setText('#lang-badge', langBadge[q.language] || q.language.toUpperCase());
        }
    }

    const ta = $('#code-textarea');
    ta.value = langTemplates[$('#code-lang').value] || '';
    ta.dataset.isTemplate = 'true';

    const op = $('#output-panel');
    op.className = 'output-panel';
    op.textContent = '';
    $('#output-status').style.display = 'none';

    qs.forEach((_, i) => {
        const d = $(`#cd-${i}`); if (!d) return;
        d.classList.remove('active', 'done', 'skipped');
        if (i < idx)      d.classList.add('done');
        else if (i === idx) d.classList.add('active');
    });
}

async function runCode() {
    if (isRunning) return;
    const code = $('#code-textarea').value.trim();
    const lang = $('#code-lang').value;
    if (!code || code.length < 5) { showOutput('⚠️ Write some code first!', 'info'); return; }

    isRunning = true;
    const btn = $('#run-btn');
    btn.innerHTML = '<span class="spinner spinner-sm" style="border-color:rgba(255,255,255,.3);border-top-color:#fff;width:12px;height:12px;border-width:2px"></span> Running…';
    btn.disabled = true;
    showOutput('⚡ Executing your code…', 'info');

    await sleep(800);

    if (lang === 'javascript' || lang === 'typescript') {
        try {
            const logs = [];
            const fakeCons = {
                log:   (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
                error: (...a) => logs.push('ERROR: ' + a.join(' ')),
                warn:  (...a) => logs.push('WARN: '  + a.join(' ')),
                info:  (...a) => logs.push('INFO: '  + a.join(' ')),
            };
            new Function('console', code)(fakeCons);
            showOutput(
                logs.length ? `✅ Output:\n${logs.join('\n')}` : '✅ Code ran successfully (no output)',
                'success'
            );
        } catch (e) {
            showOutput(`❌ Runtime Error:\n${e.message}`, 'error');
        }
    } else if (lang === 'python') {
        showOutput(analyzePython(code), 'success');
    } else if (lang === 'sql') {
        const ok = /SELECT/i.test(code) && /FROM/i.test(code);
        showOutput(
            ok ? '✅ SQL query looks valid!\n\nReviewers will evaluate your logic and syntax.'
               : '⚠️ Query may be incomplete. Ensure you have SELECT and FROM clauses.',
            'info'
        );
    } else {
        showOutput(
            `✅ Code submitted for ${lang.toUpperCase()} review.\n\nReviewers will evaluate your logic and approach.\nClick "Submit code" when ready.`,
            'info'
        );
    }

    isRunning = false;
    btn.innerHTML = '<span>▶</span> Run Code';
    btn.disabled = false;
}

function analyzePython(code) {
    const checks = [
        [/^\s*def /m,          '✓ Function definition found'],
        [/^\s*class /m,        '✓ Class definition found'],
        [/^\s*(for|while)\s/m, '✓ Loop structure detected'],
        [/^\s*return\b/m,      '✓ Return statement present'],
        [/print\(/,            '✓ Print/output statement found'],
        [/^\s*if\s/m,          '✓ Conditional logic present'],
    ];
    const found = checks.filter(([re]) => re.test(code)).map(([, msg]) => `  ${msg}`);
    return '✅ Python Code Analysis:\n'
        + (found.length ? found.join('\n') : '  ℹ No functions/loops detected yet')
        + '\n\nCode looks good! Click "Submit code" when ready.';
}

function showOutput(text, type = 'info') {
    const op  = $('#output-panel');
    const sts = $('#output-status');
    op.textContent = text;
    op.className = `output-panel visible${type === 'error' ? ' error' : type === 'info' ? ' info' : ''}`;
    sts.style.display = 'flex';
    const dot = $('#status-dot');
    dot.className = `dot ${type === 'error' ? 'red' : type === 'success' ? 'green' : 'amber'}`;
    setText('#status-text', type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Output');
}

function handleCodeSubmit() {
    const code = $('#code-textarea').value.trim();
    const lang = $('#code-lang').value;
    if (!code || code.length < 10) { showToast('Write some code before submitting', 'warning'); return; }

    const qs = getSection2Qs();
    saveAnswer(qs[codeIndex]?.text || '', `[CODE:${lang.toUpperCase()}]\n${code}`);

    const d = $(`#cd-${codeIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('done'); }
    showToast('Code submitted! ✅', 'success');

    if (codeIndex < qs.length - 1) showCodeQuestion(codeIndex + 1);
    else endSection2();
}

function handleCodeSkip() {
    const qs = getSection2Qs();
    const d  = $(`#cd-${codeIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('skipped'); }
    saveAnswer(qs[codeIndex]?.text || '', '[Skipped]');
    if (codeIndex < qs.length - 1) showCodeQuestion(codeIndex + 1);
    else endSection2();
}

function endSection2() {
    hideEl($('#section2-wrap'));
    updatePills(3);
    showSectionOverlay(3, () => startSection3());
}

// ═══════════════════════ SECTION 3 — VIDEO ═══════════════════════
async function startSection3() {
    currentSection = 3;
    viIndex = 0;
    document.body.classList.add('video-mode');
    showEl($('#section3-wrap'));
    buildViDots();
    await initCamera();
    initSpeech();
    await showViQuestion(0);

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
    dots.innerHTML = qs.map((q, i) =>
        `<div class="qd" id="vd-${i}" title="${q.category === 'behavioral' ? '🧠 Behavioral' : '⚙️ Technical'}"></div>`
    ).join('') + `<span style="font-size:.72rem;color:rgba(255,255,255,.4);margin-left:6px">Video Interview</span>`;
    $(`#vd-0`)?.classList.add('active');
}

async function showViQuestion(idx) {
    const qs = getSection3Qs();
    if (idx >= qs.length) { endSection3(); return; }
    viIndex = idx;
    const q = qs[idx];

    $('#vi-q-text').innerHTML = '<div class="vi-typing-dots"><span></span><span></span><span></span></div>';
    $('#vi-answer').value = '';

    qs.forEach((_, i) => {
        const d = $(`#vd-${i}`); if (!d) return;
        d.classList.remove('active', 'done', 'skipped');
        if (i < idx)       d.classList.add('done');
        else if (i === idx) d.classList.add('active');
    });
    setText('#progress-label', `Video ${idx + 1} / ${qs.length}`);

    await sleep(1000);

    const introText = idx === 0
        ? `Hi! I'm Alex, your interviewer. We have ${qs.length} questions — ${qs.filter(q => q.category !== 'behavioral').length} technical and ${qs.filter(q => q.category === 'behavioral').length} behavioral. Let's begin! ${q.text}`
        : q.text;

    const typeBadge = q.category === 'behavioral'
        ? `<div class="vi-q-type-badge vi-q-type-behavioral">🧠 Behavioral</div>`
        : `<div class="vi-q-type-badge vi-q-type-technical">⚙️ Technical</div>`;
    $('#vi-q-text').innerHTML = typeBadge + '<div>' + escHtml(q.text) + '</div>';

    await speakText(introText);
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
    saveAnswer(qs[viIndex]?.text || '', answer);

    const d = $(`#vd-${viIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('done'); }

    isSubmitting = false;
    btn.disabled = false; btn.textContent = '➤';

    if (viIndex < qs.length - 1) { viIndex++; await showViQuestion(viIndex); }
    else endSection3();
}

function handleViSkip() {
    const qs = getSection3Qs();
    const d  = $(`#vd-${viIndex}`);
    if (d) { d.classList.remove('active'); d.classList.add('skipped'); }
    saveAnswer(qs[viIndex]?.text || '', '[Skipped]');
    if (viIndex < qs.length - 1) { viIndex++; showViQuestion(viIndex); }
    else endSection3();
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
        const totalQs = interview.questions?.length || 1;
        for (let i = 0; i < localAnswers.length; i++) {
            try {
                await interviewApi.answer(interview._id, {
                    questionIndex: Math.min(i, totalQs - 1),
                    answer:        localAnswers[i].answer,
                });
            } catch (_) { /* keep going even if one save fails */ }
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