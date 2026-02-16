const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const agreementsRoutes = require('./routes/agreements');
const logsRoutes = require('./routes/logs');

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

// OAuth2 setup routes (temporary - remove after getting refresh token)
const { google } = require('googleapis');
const OAUTH_CLIENT_ID = '1040161889673-t3pm2dod9esa0286h7gd6qk5aj1ovj9q.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';

app.get('/setup-drive', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const oauth2Client = new google.auth.OAuth2(
        OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET,
        `${baseUrl}/oauth2callback`
    );
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent'
    });
    res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('No code provided');
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const oauth2Client = new google.auth.OAuth2(
        OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET,
        `${baseUrl}/oauth2callback`
    );
    try {
        const { tokens } = await oauth2Client.getToken(code);
        res.send(`
            <html dir="rtl">
            <head><title>Refresh Token</title></head>
            <body style="font-family: Arial; padding: 50px; direction: rtl;">
                <h1 style="color: green;">הצלחה!</h1>
                <p>העתק את ה-Refresh Token הזה והוסף אותו ב-Render:</p>
                <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; word-break: break-all;">
                    <strong>GOOGLE_REFRESH_TOKEN=</strong><br>
                    <code style="color: blue;">${tokens.refresh_token}</code>
                </div>
                <br>
                <p>Environment Variables להוספה ב-Render:</p>
                <pre style="background: #333; color: #0f0; padding: 20px; border-radius: 10px;">
GOOGLE_CLIENT_ID=${OAUTH_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}
                </pre>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
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
