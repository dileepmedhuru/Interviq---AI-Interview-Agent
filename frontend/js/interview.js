/* ── interview.js ── drives the live interview session ── */
import { interviewApi } from './api.js';
import { requireAuth, showToast, $, hideEl, showEl, setLoading } from './utils.js';

let interview     = null;
let currentIndex  = 0;
let timerInterval = null;
let elapsedSecs   = 0;
let isSubmitting  = false;
let selectedMcq   = null;
let recognition   = null;
let isMicOn       = false;

// ── Bootstrap ─────────────────────────────────────────────
(async () => {
    await requireAuth();
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { showToast('No interview ID', 'error'); setTimeout(() => location.href='/pages/dashboard.html', 1500); return; }

    try {
        const data = await interviewApi.get(id);
        interview  = data.interview;
        if (interview.status === 'completed' && interview.report) {
            location.href = `/pages/report.html?id=${interview._id}`; return;
        }
        initUI();
        startTimer();
        showQuestion(currentIndex);
    } catch (err) {
        showToast(err.message || 'Could not load interview', 'error');
    }
})();

// ── UI init ───────────────────────────────────────────────
function initUI() {
    setText('#header-role',  interview.role);
    setText('#header-level', interview.expLevel + ' level');
    hideEl($('#loading-state'));

    // Text answer events
    const textarea   = $('#answer-input');
    const charCount  = $('#char-count');
    const submitBtn  = $('#submit-answer-btn');

    textarea?.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.textContent = len;
        submitBtn.disabled = len < 5;
    });
    $('#clear-btn')?.addEventListener('click', () => {
        textarea.value = ''; charCount.textContent = '0'; submitBtn.disabled = true;
    });
    submitBtn?.addEventListener('click', () => handleSubmit('text'));
    textarea?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!submitBtn.disabled && !isSubmitting) handleSubmit('text'); }
    });

    // MCQ submit
    $('#mcq-submit-btn')?.addEventListener('click', () => handleSubmit('mcq'));

    // Code submit
    $('#code-submit-btn')?.addEventListener('click', () => handleSubmit('code'));

    // Code run (simulated)
    $('#code-run-btn')?.addEventListener('click', runCode);

    // Code lang change → update placeholder
    $('#code-lang')?.addEventListener('change', updateCodePlaceholder);

    // Voice
    initVoice();
    $('#voice-btn')?.addEventListener('click', toggleVoice);

    // Report btn
    $('#get-report-btn')?.addEventListener('click', handleEvaluate);
}

// ── Show question ─────────────────────────────────────────
function showQuestion(index) {
    const q     = interview.questions[index];
    const total = interview.questions.length;
    const pct   = Math.round((index / total) * 100);

    setText('#progress-text', `${index} / ${total}`);
    setStyle('#progress-fill', 'width', `${pct}%`);

    // Show chat area
    showEl($('#chat-area'));

    // Opening greeting
    if (index === 0) {
        const skills = interview.skills?.slice(0, 3).join(', ') || 'your experience';
        appendBubble('ai', `Hi! I'll be your interviewer today. We have ${total} questions covering ${skills}. Let's begin!`);
    }

    // Append question card
    appendQuestionCard(q, index + 1, total);

    // Show correct input area
    hideEl($('#answer-area'));
    hideEl($('#mcq-area'));
    hideEl($('#code-area'));

    selectedMcq = null;

    if (q.category === 'mcq') {
        showMcqArea(q);
    } else if (q.category === 'coding') {
        showCodeArea(q);
    } else {
        showEl($('#answer-area'));
        const textarea = $('#answer-input');
        if (textarea) { textarea.value = ''; textarea.focus(); }
        setText('#char-count', '0');
        const submitBtn = $('#submit-answer-btn');
        if (submitBtn) submitBtn.disabled = true;
    }
}

// ── MCQ area ──────────────────────────────────────────────
function showMcqArea(q) {
    const wrap = $('#mcq-options');
    const btn  = $('#mcq-submit-btn');
    if (!wrap) return;

    const letters = ['A','B','C','D'];
    wrap.innerHTML = (q.options || []).map((opt, i) => `
        <div class="mcq-option" data-index="${i}">
            <div class="mcq-letter">${letters[i]}</div>
            <span>${escHtml(opt)}</span>
        </div>`).join('');

    // Click handlers
    wrap.querySelectorAll('.mcq-option').forEach(el => {
        el.addEventListener('click', () => {
            wrap.querySelectorAll('.mcq-option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            selectedMcq = parseInt(el.dataset.index);
            if (btn) btn.style.display = 'inline-flex';
        });
    });

    if (btn) btn.style.display = 'none';
    showEl($('#mcq-area'));
}

// ── Code editor area ──────────────────────────────────────
function showCodeArea(q) {
    // Set language from question hint
    const langEl = $('#code-lang');
    if (langEl && q.language) langEl.value = q.language;
    updateCodePlaceholder();

    const codeInput = $('#code-input');
    if (codeInput) { codeInput.value = ''; codeInput.focus(); }

    // Hide previous output
    const out = $('#code-output');
    if (out) { out.textContent = ''; out.className = 'code-output'; }

    showEl($('#code-area'));
}

function updateCodePlaceholder() {
    const lang = $('#code-lang')?.value || 'python';
    const hints = {
        python:     '# Write your Python code here\n\ndef solution():\n    pass\n',
        javascript: '// Write your JavaScript code here\n\nfunction solution() {\n    \n}\n',
        java:       '// Write your Java code here\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
        c:          '// Write your C code here\n\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
        cpp:        '// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
        sql:        '-- Write your SQL query here\n\nSELECT * FROM table_name\nWHERE condition;\n',
    };
    const codeInput = $('#code-input');
    const hintEl    = $('#code-hint');
    if (codeInput && !codeInput.value) codeInput.placeholder = hints[lang] || '// Write your code here';
    if (hintEl) hintEl.textContent = lang.toUpperCase();
}

// ── Simulated code run ─────────────────────────────────────
function runCode() {
    const code   = $('#code-input')?.value?.trim();
    const outEl  = $('#code-output');
    if (!outEl) return;

    if (!code) {
        outEl.textContent = 'No code to run.';
        outEl.className   = 'code-output error visible';
        return;
    }

    outEl.className   = 'code-output visible';
    outEl.textContent = '⚡ Running…';

    setTimeout(() => {
        // Simple simulation — real execution needs a backend sandbox
        outEl.textContent = '✓ Code looks good! Submit your answer when ready.\n\n(Note: Live execution coming soon — reviewers will evaluate your logic)';
        outEl.className   = 'code-output visible';
    }, 800);
}

// ── Submit answer ─────────────────────────────────────────
async function handleSubmit(type) {
    if (isSubmitting) return;

    let answer = '';

    if (type === 'mcq') {
        if (selectedMcq === null) { showToast('Please select an option', 'warning'); return; }
        const q = interview.questions[currentIndex];
        const letters = ['A','B','C','D'];
        answer = `${letters[selectedMcq]}: ${q.options[selectedMcq]}`;

        // Show correct/wrong visually
        const options = $('#mcq-options')?.querySelectorAll('.mcq-option');
        options?.forEach((el, i) => {
            if (i === q.correctAnswer) el.classList.add('correct');
            else if (i === selectedMcq && i !== q.correctAnswer) el.classList.add('wrong');
        });
        hideEl($('#mcq-submit-btn'));
        await sleep(900);

    } else if (type === 'code') {
        answer = $('#code-input')?.value?.trim();
        if (!answer || answer.length < 5) { showToast('Please write some code', 'warning'); return; }
        answer = `[CODE - ${($('#code-lang')?.value || 'unknown').toUpperCase()}]\n${answer}`;

    } else {
        answer = $('#answer-input')?.value?.trim();
        if (!answer || answer.length < 5) { showToast('Please write a more complete answer', 'warning'); return; }
    }

    isSubmitting = true;

    // Stop mic
    if (isMicOn) { recognition?.stop(); isMicOn = false; updateVoiceBtn(); }

    // Show user bubble
    appendBubble('user', answer.startsWith('[CODE') ? '✅ Code submitted' : answer);

    // Hide input areas
    hideEl($('#answer-area')); hideEl($('#mcq-area')); hideEl($('#code-area'));

    const typingId = appendTyping();

    try {
        const data = await interviewApi.answer(interview._id, { questionIndex: currentIndex, answer });
        removeTyping(typingId);
        appendBubble('ai', data.aiResponse);

        if (data.isComplete) {
            currentIndex = interview.questions.length;
            setText('#progress-text', `${currentIndex} / ${interview.questions.length}`);
            setStyle('#progress-fill', 'width', '100%');
            stopTimer();
            showEl($('#complete-splash'));
        } else {
            currentIndex = data.nextQuestionIndex;
            await sleep(400);
            showQuestion(currentIndex);
        }
    } catch (err) {
        removeTyping(typingId);
        showToast(err.message || 'Could not submit', 'error');
        showQuestion(currentIndex);
    } finally {
        isSubmitting = false;
    }
}

// ── Evaluate ──────────────────────────────────────────────
async function handleEvaluate() {
    const btn     = $('#get-report-btn');
    const spinner = $('#report-spinner');
    showEl(spinner);
    setLoading(btn, true, 'Generating report…');
    try {
        await interviewApi.evaluate(interview._id);
        location.href = `/pages/report.html?id=${interview._id}`;
    } catch (err) {
        showToast(err.message || 'Could not generate report', 'error');
        hideEl(spinner);
        setLoading(btn, false, 'Get my report →');
    }
}

// ── Chat bubble helpers ───────────────────────────────────
function appendBubble(role, text) {
    const area = $('#chat-area');
    if (!area) return;
    const isAI = role === 'ai';
    const row  = document.createElement('div');
    row.className = `chat-row ${isAI ? '' : 'chat-row-user'}`;
    row.innerHTML = `
        <div class="chat-avatar ${isAI ? 'chat-avatar-ai' : 'chat-avatar-user'}">${isAI ? '🤖' : '👤'}</div>
        <div class="chat-content">
            <div class="chat-sender">${isAI ? 'Interviewer' : 'You'}</div>
            <div class="chat-bubble ${isAI ? 'chat-bubble-ai' : 'chat-bubble-user'}">${escHtml(text)}</div>
        </div>`;
    area.appendChild(row);
    row.scrollIntoView({ behavior:'smooth', block:'end' });
}

function appendQuestionCard(q, num, total) {
    const area = $('#chat-area');
    if (!area) return;

    const typeLabel = { mcq:'MCQ', coding:'Coding Challenge', open:'Open Question', behavioral:'Behavioral', technical:'Technical' };
    const typeClass = { mcq:'q-type-mcq', coding:'q-type-coding', behavioral:'q-type-behavioral' };
    const badge = typeClass[q.category] || 'q-type-open';

    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div class="question-num">Question ${num} of ${total}</div>
        <div class="q-type-badge ${badge}">${typeLabel[q.category] || q.type}</div>
        <div class="question-text">${escHtml(q.text)}</div>`;
    area.appendChild(card);
    card.scrollIntoView({ behavior:'smooth', block:'end' });
}

function appendTyping() {
    const area = $('#chat-area');
    if (!area) return null;
    const id  = 'typing-' + Date.now();
    const row = document.createElement('div');
    row.id = id; row.className = 'chat-row';
    row.innerHTML = `
        <div class="chat-avatar chat-avatar-ai">🤖</div>
        <div class="chat-content">
            <div class="chat-sender">Interviewer</div>
            <div class="chat-bubble chat-bubble-ai">
                <div class="typing-dots"><span></span><span></span><span></span></div>
            </div>
        </div>`;
    area.appendChild(row);
    row.scrollIntoView({ behavior:'smooth', block:'end' });
    return id;
}

function removeTyping(id) { if (id) document.getElementById(id)?.remove(); }

// ── Voice input ───────────────────────────────────────────
function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';
    recognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        const textarea   = $('#answer-input');
        if (textarea) {
            textarea.value = transcript;
            $('#char-count').textContent = transcript.length;
            $('#submit-answer-btn').disabled = transcript.length < 5;
        }
    };
    recognition.onerror = () => { isMicOn = false; updateVoiceBtn(); };
}

function toggleVoice() {
    if (!recognition) { showToast('Voice not supported in this browser', 'warning'); return; }
    isMicOn = !isMicOn;
    if (isMicOn) recognition.start(); else recognition.stop();
    updateVoiceBtn();
}

function updateVoiceBtn() {
    const btn = $('#voice-btn');
    if (!btn) return;
    if (isMicOn) { btn.textContent = '⏹️'; btn.classList.add('pulse-ring'); }
    else         { btn.textContent = '🎤'; btn.classList.remove('pulse-ring'); }
}

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        elapsedSecs++;
        const m = String(Math.floor(elapsedSecs / 60)).padStart(2,'0');
        const s = String(elapsedSecs % 60).padStart(2,'0');
        setText('#timer-display', `${m}:${s}`);
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }

// ── Helpers ───────────────────────────────────────────────
function setText(sel, val) { const el=$(sel); if(el) el.textContent=val; }
function setStyle(sel,prop,val) { const el=$(sel); if(el) el.style[prop]=val; }
function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
function escHtml(str='') {
    return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}