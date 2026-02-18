const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const agreementsRoutes = require('./routes/agreements');
const logsRoutes = require('./routes/logs');
const { securityCheck, apiLimiter, logUnauthorizedAccess } = require('./middleware/security');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make io available globally for routes
app.set('io', io);

const PORT = process.env.PORT || 3000;

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for inline scripts
    crossOriginEmbedderPolicy: false
}));

// CORS - restrict in production
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://agreement-signing-system.onrender.com']
    : ['http://localhost:2000', 'http://localhost:3000', 'http://127.0.0.1:2000'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Allow for now, but log
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security logging and checks
app.use(logUnauthorizedAccess);
app.use('/api', apiLimiter);
app.use('/api', securityCheck);

// Serve static files - disable cache for template images
app.use('/assets/images/templates', express.static(path.join(__dirname, '../public/assets/images/templates'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/agreements', agreementsRoutes);
app.use('/api/logs', logsRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/agreement/bmatek', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/agreement-bmatek.html'));
});

app.get('/agreement/bagda', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/agreement-bagda.html'));
});

app.get('/client/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/client-view.html'));
});

app.get('/view/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/client-view.html'));
});

app.get('/sign/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/client-signature.html'));
});

app.get('/logs', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/logs.html'));
});

app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/editor.html'));
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'שגיאת שרת פנימית',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'הדף לא נמצא'
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.IO enabled for real-time updates`);
});

module.exports = { app, io };
