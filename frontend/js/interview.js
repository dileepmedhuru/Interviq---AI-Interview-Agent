/* ── interview.js ── drives the live interview session ───────────────────── */
import { interviewApi } from './api.js';
import { requireAuth, showToast, $, hideEl, showEl, setLoading } from './utils.js';

// ── State ─────────────────────────────────────────────────────────────────────
let interview     = null;   // { id, role, expLevel, questions, skills }
let currentIndex  = 0;
let timerInterval = null;
let elapsedSecs   = 0;
let isSubmitting  = false;

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
        interview  = data.interview;

        // If already completed, go straight to report
        if (interview.status === 'completed' && interview.report) {
            window.location.href = `/pages/report.html?id=${interview._id}`;
            return;
        }

        initUI();
        startTimer();
        showQuestion(currentIndex);
    } catch (err) {
        showToast(err.message || 'Could not load interview', 'error');
    }
})();

// ── UI init ───────────────────────────────────────────────────────────────────
function initUI() {
    // Header
    setText('#header-role',  interview.role);
    setText('#header-level', interview.expLevel + ' level');

    // Hide loader, show chat + answer area
    hideEl($('#loading-state'));
    showEl($('#chat-area'));
    showEl($('#answer-area'));

    // Textarea events
    const textarea = $('#answer-input');
    const charCount = $('#char-count');
    const submitBtn = $('#submit-answer-btn');
    const clearBtn  = $('#clear-btn');

    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.textContent = len;
        submitBtn.disabled = len < 10;
    });

    clearBtn.addEventListener('click', () => {
        textarea.value = '';
        charCount.textContent = '0';
        submitBtn.disabled = true;
    });

    submitBtn.addEventListener('click', handleSubmit);

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!submitBtn.disabled && !isSubmitting) handleSubmit();
        }
    });

    // Report button
    $('#get-report-btn')?.addEventListener('click', handleEvaluate);
}

// ── Show question ─────────────────────────────────────────────────────────────
function showQuestion(index) {
    const q      = interview.questions[index];
    const total  = interview.questions.length;
    const pct    = Math.round((index / total) * 100);

    // Progress bar
    setText('#progress-text', `${index} / ${total}`);
    setStyle('#progress-fill', 'width', `${pct}%`);

    // AI bubble: either opening greeting (index 0) or the question itself
    const intro = index === 0
        ? `Hi! I'll be your interviewer today. We have ${total} questions covering ${interview.skills?.slice(0, 3).join(', ') || 'your experience'}. Let's begin!`
        : null;

    if (intro) appendBubble('ai', intro);
    appendQuestion(q, index + 1, total);

    // Reset textarea
    const textarea = $('#answer-input');
    if (textarea) { textarea.value = ''; textarea.focus(); }
    setText('#char-count', '0');
    const submitBtn = $('#submit-answer-btn');
    if (submitBtn) submitBtn.disabled = true;
}

// ── Submit answer ─────────────────────────────────────────────────────────────
async function handleSubmit() {
    if (isSubmitting) return;
    const textarea  = $('#answer-input');
    const submitBtn = $('#submit-answer-btn');
    const answer    = textarea.value.trim();

    if (answer.length < 10) {
        showToast('Please write a more complete answer', 'warning');
        return;
    }

    isSubmitting = true;
    setLoading(submitBtn, true, 'Sending…');

    // Show user bubble immediately
    appendBubble('user', answer);
    textarea.value = '';
    setText('#char-count', '0');

    // Typing indicator
    const typingId = appendTyping();

    try {
        const data = await interviewApi.answer(interview._id, {
            questionIndex: currentIndex,
            answer,
        });

        removeTyping(typingId);
        appendBubble('ai', data.aiResponse);

        if (data.isComplete) {
            currentIndex = interview.questions.length;
            setText('#progress-text', `${currentIndex} / ${interview.questions.length}`);
            setStyle('#progress-fill', 'width', '100%');
            stopTimer();
            hideEl($('#answer-area'));
            showEl($('#complete-splash'));
        } else {
            currentIndex = data.nextQuestionIndex;
            showQuestion(currentIndex);
        }
    } catch (err) {
        removeTyping(typingId);
        showToast(err.message || 'Could not submit answer', 'error');
    } finally {
        isSubmitting = false;
        setLoading(submitBtn, false, 'Submit answer →');
        submitBtn.disabled = true;
    }
}

// ── Evaluate (generate report) ────────────────────────────────────────────────
async function handleEvaluate() {
    const btn     = $('#get-report-btn');
    const spinner = $('#report-spinner');
    if (spinner) showEl(spinner);
    setLoading(btn, true, 'Generating report…');

    try {
        const data = await interviewApi.evaluate(interview._id);
        window.location.href = `/pages/report.html?id=${interview._id}`;
    } catch (err) {
        showToast(err.message || 'Could not generate report', 'error');
        if (spinner) hideEl(spinner);
        setLoading(btn, false, 'Get my report →');
    }
}

// ── Chat bubble helpers ───────────────────────────────────────────────────────
function appendBubble(role, text) {
    const area    = $('#chat-area');
    if (!area) return;
    const isAI    = role === 'ai';
    const row     = document.createElement('div');
    row.className = `chat-row ${isAI ? '' : 'chat-row-user'}`;
    row.innerHTML = `
        <div class="chat-avatar ${isAI ? 'chat-avatar-ai' : 'chat-avatar-user'}">
            ${isAI ? '🤖' : '👤'}
        </div>
        <div class="chat-content">
            <div class="chat-sender">${isAI ? 'Interviewer' : 'You'}</div>
            <div class="chat-bubble ${isAI ? 'chat-bubble-ai' : 'chat-bubble-user'}">${escHtml(text)}</div>
        </div>`;
    area.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function appendQuestion(q, num, total) {
    const area = $('#chat-area');
    if (!area) return;
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div class="question-num">Question ${num} of ${total}</div>
        <div class="question-text">${escHtml(q.text)}</div>
        <span class="question-type-chip">${q.type}</span>`;
    area.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function appendTyping() {
    const area = $('#chat-area');
    if (!area) return null;
    const id  = 'typing-' + Date.now();
    const row = document.createElement('div');
    row.id    = id;
    row.className = 'chat-row';
    row.innerHTML = `
        <div class="chat-avatar chat-avatar-ai">🤖</div>
        <div class="chat-content">
            <div class="chat-sender">Interviewer</div>
            <div class="chat-bubble chat-bubble-ai">
                <div class="typing-dots"><span></span><span></span><span></span></div>
            </div>
        </div>`;
    area.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return id;
}

function removeTyping(id) {
    if (id) document.getElementById(id)?.remove();
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        elapsedSecs++;
        const m = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const s = String(elapsedSecs % 60).padStart(2, '0');
        setText('#timer-display', `${m}:${s}`);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// ── Micro-helpers ─────────────────────────────────────────────────────────────
function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = val;
}

function setStyle(sel, prop, val) {
    const el = $(sel);
    if (el) el.style[prop] = val;
}

function escHtml(str = '') {
    return str.replace(/[&<>"']/g, c => (
        { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
    ));
}
// Add to interview.js
function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const voiceBtn = document.getElementById('voice-btn');
    const textarea = document.getElementById('answer-input');
    let isListening = false;

    voiceBtn?.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            voiceBtn.classList.remove('pulse-ring');
            voiceBtn.textContent = '🎙️';
        } else {
            recognition.start();
            voiceBtn.classList.add('pulse-ring');
            voiceBtn.textContent = '⏹️';
        }
        isListening = !isListening;
    });

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(r => r[0].transcript).join('');
        textarea.value = transcript;
        document.getElementById('char-count').textContent = transcript.length;
        document.getElementById('submit-answer-btn').disabled = transcript.length < 10;
    };

    recognition.onerror = () => {
        isListening = false;
        voiceBtn?.classList.remove('pulse-ring');
    };
}