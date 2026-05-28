/* ── video-interview.js ── video call style interview ── */
import { interviewApi } from './api.js';
import { requireAuth, showToast, $ } from './utils.js';

// ── State ─────────────────────────────────────────────
let interview    = null;
let currentIndex = 0;
let isSubmitting = false;
let timerInterval = null;
let elapsedSecs  = 0;
let mediaStream  = null;
let recognition  = null;
let isMicOn      = false;
let isCamOn      = true;
let isSpeaking   = false;

// ── Boot ──────────────────────────────────────────────
(async () => {
    await requireAuth();
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { window.location.href = '/pages/dashboard.html'; return; }

    try {
        setLoadingText('Loading your interview...');
        const data = await interviewApi.get(id);
        interview  = data.interview;

        if (interview.status === 'completed' && interview.report) {
            window.location.href = `/pages/report.html?id=${interview._id}`;
            return;
        }

        setLoadingText('Starting camera...');
        await initCamera();

        setLoadingText('Ready!');
        await sleep(600);

        hideLoading();
        initUI();
        startTimer();
        await showQuestion(0);

    } catch (err) {
        showToast(err.message || 'Could not load interview', 'error');
        setTimeout(() => { window.location.href = '/pages/dashboard.html'; }, 2000);
    }
})();

// ── Camera ────────────────────────────────────────────
async function initCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, audio: false 
        });
        const video = $('#user-video');
        if (video) video.srcObject = mediaStream;
    } catch (_) {
        isCamOn = false;
        showCamOff();
    }
}

// ── UI init ───────────────────────────────────────────
function initUI() {
    // Header
    setText('#vi-role', `${interview.role} · ${interview.expLevel}`);

    // Progress dots
    buildProgressDots();

    // User label
    setText('#user-label', 'You');

    // Buttons
    $('#cam-btn')?.addEventListener('click', toggleCam);
    $('#mic-btn')?.addEventListener('click', toggleMic);
    $('#submit-btn')?.addEventListener('click', handleSubmit);
    $('#end-btn')?.addEventListener('click', handleEnd);
    $('#get-report-btn')?.addEventListener('click', handleReport);

    // Ctrl+Enter to submit
    $('#vi-answer')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
        }
    });

    // Init speech recognition
    initSpeech();
}

// ── Progress dots ─────────────────────────────────────
function buildProgressDots() {
    const wrap = $('#progress-dots');
    if (!wrap) return;
    const total = interview.questions.length;
    wrap.innerHTML = Array.from({ length: total }, (_, i) =>
        `<div class="vi-dot" id="dot-${i}"></div>`
    ).join('');
    updateProgress(0);
}

function updateProgress(index) {
    const total = interview.questions.length;
    setText('#vi-progress-text', `${index}/${total}`);
    for (let i = 0; i < total; i++) {
        const dot = $(`#dot-${i}`);
        if (!dot) continue;
        dot.className = 'vi-dot';
        if (i < index) dot.classList.add('done');
        else if (i === index) dot.classList.add('active');
    }
}

// ── Show question with TTS ────────────────────────────
async function showQuestion(index) {
    const q     = interview.questions[index];
    const total = interview.questions.length;

    updateProgress(index);

    // Show typing animation first
    const qEl = $('#vi-question-text');
    if (qEl) {
        qEl.innerHTML = `<div class="vi-typing-dots"><span></span><span></span><span></span></div>`;
    }

    await sleep(1200);

    // Build question text
    let questionText = q.text;
    if (index === 0) {
        questionText = `Hi! I'm Alex, your interviewer today. We have ${total} questions. Let's start — ${q.text}`;
    }

    if (qEl) qEl.textContent = questionText;

    // Speak the question
    await speakText(questionText);

    // Clear answer
    const answerEl = $('#vi-answer');
    if (answerEl) { answerEl.value = ''; answerEl.focus(); }
}

// ── Text to Speech ────────────────────────────────────
function speakText(text) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) { resolve(); return; }

        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate  = 0.9;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        // Pick a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
            v.name.includes('Google') && v.lang.startsWith('en')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferred) utter.voice = preferred;

        utter.onstart = () => {
            isSpeaking = true;
            $('#vi-avatar')?.classList.add('speaking');
            $('#soundwave')?.classList.add('active');
        };

        utter.onend = () => {
            isSpeaking = false;
            $('#vi-avatar')?.classList.remove('speaking');
            $('#soundwave')?.classList.remove('active');
            resolve();
        };

        utter.onerror = () => resolve();

        window.speechSynthesis.speak(utter);
    });
}

// ── Speech Recognition ────────────────────────────────
function initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
            .map(r => r[0].transcript).join('');

        const answerEl = $('#vi-answer');
        if (answerEl) answerEl.value = transcript;

        // Live transcript
        addTranscript(transcript);
    };

    recognition.onerror = () => {
        isMicOn = false;
        updateMicBtn();
        $('#rec-dot').style.display = 'none';
    };
}

function toggleMic() {
    if (!recognition) {
        showToast('Speech recognition not supported in this browser', 'warning');
        return;
    }

    isMicOn = !isMicOn;

    if (isMicOn) {
        recognition.start();
        $('#rec-dot').style.display = 'block';
    } else {
        recognition.stop();
        $('#rec-dot').style.display = 'none';
    }

    updateMicBtn();
}

function updateMicBtn() {
    const btn = $('#mic-btn');
    if (!btn) return;
    if (isMicOn) {
        btn.classList.add('active');
        btn.textContent = '🎤';
    } else {
        btn.classList.remove('active');
        btn.textContent = '🎤';
    }
}

// ── Camera toggle ─────────────────────────────────────
function toggleCam() {
    isCamOn = !isCamOn;
    const video  = $('#user-video');
    const camOff = $('#cam-off');
    const btn    = $('#cam-btn');

    if (isCamOn) {
        video?.classList.remove('hidden');
        camOff?.classList.add('hidden');
        btn?.classList.remove('off');
        btn.textContent = '📷';
        // Restart camera
        initCamera();
    } else {
        video?.classList.add('hidden');
        camOff?.classList.remove('hidden');
        btn?.classList.add('off');
        btn.textContent = '📷';
        // Stop tracks
        mediaStream?.getTracks().forEach(t => t.stop());
    }
}

function showCamOff() {
    $('#user-video')?.classList.add('hidden');
    $('#cam-off')?.classList.remove('hidden');
    $('#cam-btn')?.classList.add('off');
}

// ── Transcript ────────────────────────────────────────
function addTranscript(text) {
    const wrap = $('#transcript-content');
    if (!wrap) return;
    wrap.innerHTML = `<div class="vi-transcript-line">${text}</div>`;
}

// ── Submit answer ─────────────────────────────────────
async function handleSubmit() {
    if (isSubmitting) return;

    const answerEl = $('#vi-answer');
    const answer   = answerEl?.value?.trim();

    if (!answer || answer.length < 5) {
        showToast('Please give a more complete answer', 'warning');
        return;
    }

    // Stop mic if on
    if (isMicOn) {
        recognition?.stop();
        isMicOn = false;
        updateMicBtn();
        $('#rec-dot').style.display = 'none';
    }

    isSubmitting = true;
    const submitBtn = $('#submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳'; }

    try {
        const data = await interviewApi.answer(interview._id, {
            questionIndex: currentIndex,
            answer,
        });

        if (data.isComplete) {
            // Speak closing
            await speakText(data.aiResponse);
            stopTimer();
            showComplete();
        } else {
            // Speak transition then next question
            await speakText(data.aiResponse);
            currentIndex = data.nextQuestionIndex;
            await showQuestion(currentIndex);
        }

    } catch (err) {
        showToast(err.message || 'Could not submit', 'error');
    } finally {
        isSubmitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '➤'; }
    }
}

// ── End interview ─────────────────────────────────────
function handleEnd() {
    if (confirm('End interview early?')) {
        stopTimer();
        window.speechSynthesis?.cancel();
        mediaStream?.getTracks().forEach(t => t.stop());
        window.location.href = '/pages/dashboard.html';
    }
}

// ── Complete ──────────────────────────────────────────
function showComplete() {
    window.speechSynthesis?.cancel();
    mediaStream?.getTracks().forEach(t => t.stop());
    const overlay = $('#vi-complete');
    if (overlay) overlay.style.display = 'flex';
}

async function handleReport() {
    const btn = $('#get-report-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    try {
        await interviewApi.evaluate(interview._id);
        window.location.href = `/pages/report.html?id=${interview._id}`;
    } catch (err) {
        showToast(err.message || 'Could not generate report', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'View my report →'; }
    }
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        elapsedSecs++;
        const m = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const s = String(elapsedSecs % 60).padStart(2, '0');
        setText('#vi-timer', `⏱ ${m}:${s}`);
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }

// ── Loading ───────────────────────────────────────────
function setLoadingText(text) {
    const el = $('#loading-text');
    if (el) el.textContent = text;
}

function hideLoading() {
    const el = $('#vi-loading');
    if (el) el.style.display = 'none';
}

// ── Helpers ───────────────────────────────────────────
function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = val;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}