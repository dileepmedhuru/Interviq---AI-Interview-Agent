const corsOptions = {
    origin: function (origin, callback) {
        const allowed = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
        ];
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;