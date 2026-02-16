const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Users } = require('../database');
const { verifyToken, generateToken, createLog } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'נא להזין שם משתמש וסיסמא'
            });
        }

        const user = await Users.getByUsername(username);

        if (!user) {
            await createLog('AUTH', null, 'Login failed - user not found', { username }, req);
            return res.status(401).json({
                success: false,
                message: 'שם משתמש או סיסמא שגויים'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            await createLog('AUTH', user.id, 'Login failed - wrong password', {}, req);
            return res.status(401).json({
                success: false,
                message: 'שם משתמש או סיסמא שגויים'
            });
        }

        const token = generateToken(user);

        await createLog('AUTH', user.id, 'Login successful', {}, req);

        res.json({
            success: true,
            message: 'התחברות הצליחה',
            data: {
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    username: user.username,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        await createLog('ERROR', null, 'Login error', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהתחברות'
        });
    }
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.user.id,
            fullName: req.user.fullName,
            username: req.user.username,
            phone: req.user.phone,
            role: req.user.role
        }
    });
});

// Logout (client-side token removal, but log it)
router.post('/logout', verifyToken, async (req, res) => {
    await createLog('AUTH', req.user.id, 'Logout', {}, req);
    res.json({
        success: true,
        message: 'התנתקות הצליחה'
    });
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'נא להזין סיסמא נוכחית וסיסמא חדשה'
            });
        }

        const user = await Users.getById(req.user.id);
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            await createLog('AUTH', req.user.id, 'Password change failed - wrong current password', {}, req);
            return res.status(401).json({
                success: false,
                message: 'הסיסמא הנוכחית שגויה'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Users.update(req.user.id, { password: hashedPassword });

        await createLog('AUTH', req.user.id, 'Password changed successfully', {}, req);

        res.json({
            success: true,
            message: 'הסיסמא שונתה בהצלחה'
        });

    } catch (error) {
        console.error('Change password error:', error);
        await createLog('ERROR', req.user.id, 'Password change error', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשינוי סיסמא'
        });
    }
});

// Initialize admin user (run once) - GET for easy browser access
router.get('/init', async (req, res) => {
    try {
        const existingAdmin = await Users.getByUsername('admin');

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'מנהל כבר קיים במערכת'
            });
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);

        const admin = {
            id: uuidv4(),
            fullName: 'מנהל מערכת',
            phone: '0501234567',
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await Users.create(admin);

        await createLog('AUTH', admin.id, 'Admin user initialized', {}, req);

        res.json({
            success: true,
            message: 'מנהל נוצר בהצלחה',
            data: {
                username: 'admin',
                password: 'admin123'
            }
        });

    } catch (error) {
        console.error('Init error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת מנהל'
        });
    }
});

module.exports = router;
