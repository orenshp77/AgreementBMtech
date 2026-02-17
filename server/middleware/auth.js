const jwt = require('jsonwebtoken');
const { Users, Logs } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { sendErrorNotification } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Create log entry
async function createLog(type, userId, action, details = {}, req = null) {
    const timestamp = new Date().toISOString();
    const log = {
        id: uuidv4(),
        timestamp,
        type,
        userId,
        action,
        details,
        platform: req?.headers['user-agent'] || 'unknown',
        ip: req?.ip || req?.connection?.remoteAddress || 'unknown'
    };
    await Logs.create(log);

    // Send email notification for errors
    if (type === 'ERROR') {
        sendErrorNotification({
            error: details.error || action,
            stack: details.stack || null,
            action,
            details,
            endpoint: req?.originalUrl || req?.path,
            method: req?.method,
            userId,
            timestamp,
            ip: log.ip,
            userAgent: log.platform
        }).catch(err => {
            console.error('Failed to send error notification:', err);
        });
    }

    return log;
}

// Verify JWT token
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await createLog('AUTH', null, 'Unauthorized access attempt', { path: req.path }, req);
        return res.status(401).json({
            success: false,
            message: 'נדרשת התחברות למערכת'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await Users.getById(decoded.id);

        if (!user) {
            await createLog('AUTH', decoded.id, 'Token for non-existent user', {}, req);
            return res.status(401).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        await createLog('AUTH', null, 'Invalid token', { error: error.message }, req);
        return res.status(401).json({
            success: false,
            message: 'טוקן לא תקין'
        });
    }
}

// Check if user is admin
async function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        await createLog('AUTH', req.user.id, 'Admin access denied', { path: req.path }, req);
        return res.status(403).json({
            success: false,
            message: 'הגישה מותרת למנהלים בלבד'
        });
    }
    next();
}

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

module.exports = {
    verifyToken,
    isAdmin,
    generateToken,
    createLog,
    JWT_SECRET
};
