const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const agreementsRoutes = require('./routes/agreements');
const logsRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
