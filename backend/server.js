require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const path         = require('path');

const connectDB      = require('./config/db');
const corsMiddleware = require('./config/cors');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const interviewRoutes = require('./routes/interview.routes');
const resumeRoutes    = require('./routes/resume.routes');

// ── Connect DB ─────────────────────────────────────────────────────────────────
connectDB();

// ── App ────────────────────────────────────────────────────────────────────────
const app = express();

// ── Security ───────────────────────────────────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc:  ["'self'", "'unsafe-inline'"],
                styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
                connectSrc: ["'self'"],
                imgSrc:     ["'self'", 'data:', 'blob:'],
            },
        },
    })
);
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api',           apiLimiter);
app.use('/api/auth',      authRoutes);
app.use('/api/user',      userRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume',    resumeRoutes);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', env: process.env.NODE_ENV, ts: Date.now() })
);

// ── Serve static frontend ──────────────────────────────────────────────────────
const FRONTEND = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));

// SPA catch-all – anything that isn't /api goes to index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND, 'pages', 'index.html'));
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀  Server → http://localhost:${PORT}  [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;