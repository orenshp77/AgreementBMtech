const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Users } = require('../database');
const { verifyToken, isAdmin, createLog } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await Users.getAll();
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        await createLog('ERROR', req.user.id, 'Error fetching users', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת משתמשים'
        });
    }
});

// Get single user
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const user = await Users.getById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        // Non-admin users can only see their own data
        if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לצפות במשתמש זה'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                fullName: user.fullName,
                phone: user.phone,
                username: user.username,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת משתמש'
        });
    }
});

// Create new user (admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const { fullName, phone, username, password, role } = req.body;

        // Validation
        if (!fullName || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'נא למלא את כל השדות הנדרשים'
            });
        }

        // Check if username exists
        const existingUser = await Users.getByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'שם משתמש כבר קיים במערכת'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: uuidv4(),
            fullName,
            phone,
            username,
            password: hashedPassword,
            role: role || 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const createdUser = await Users.create(newUser);

        await createLog('INFO', req.user.id, 'User created', { newUserId: newUser.id, username }, req);

        res.status(201).json({
            success: true,
            message: 'משתמש נוצר בהצלחה',
            data: createdUser
        });

    } catch (error) {
        console.error('Create user error:', error);
        await createLog('ERROR', req.user.id, 'Error creating user', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת משתמש'
        });
    }
});

// Update user (admin only, or user can update self)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { fullName, phone, username, password, role } = req.body;
        const userId = req.params.id;

        // Non-admin can only update themselves
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לעדכן משתמש זה'
            });
        }

        // Non-admin cannot change role
        if (req.user.role !== 'admin' && role) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לשנות תפקיד'
            });
        }

        const existingUser = await Users.getById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        // Check if new username is taken by another user
        if (username && username !== existingUser.username) {
            const usernameExists = await Users.getByUsername(username);
            if (usernameExists) {
                return res.status(400).json({
                    success: false,
                    message: 'שם משתמש כבר קיים במערכת'
                });
            }
        }

        const updates = {};
        if (fullName) updates.fullName = fullName;
        if (phone) updates.phone = phone;
        if (username) updates.username = username;
        if (role && req.user.role === 'admin') updates.role = role;
        if (password) updates.password = await bcrypt.hash(password, 10);

        const updatedUser = await Users.update(userId, updates);

        await createLog('INFO', req.user.id, 'User updated', { updatedUserId: userId }, req);

        res.json({
            success: true,
            message: 'משתמש עודכן בהצלחה',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update user error:', error);
        await createLog('ERROR', req.user.id, 'Error updating user', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון משתמש'
        });
    }
});

// Impersonate user (admin only) - login as another user
router.post('/:id/impersonate', verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await Users.getById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        // Cannot impersonate admin
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'לא ניתן להיכנס כמנהל אחר'
            });
        }

        // Create token for the target user
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await createLog('INFO', req.user.id, 'Admin impersonated user', {
            targetUserId: userId,
            targetUsername: user.username
        }, req);

        res.json({
            success: true,
            message: 'כניסה כמשתמש בוצעה בהצלחה',
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
        console.error('Impersonate user error:', error);
        await createLog('ERROR', req.user.id, 'Error impersonating user', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בכניסה כמשתמש'
        });
    }
});

// Delete user (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent self-deletion
        if (req.user.id === userId) {
            return res.status(400).json({
                success: false,
                message: 'לא ניתן למחוק את עצמך'
            });
        }

        const user = await Users.getById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }

        await Users.delete(userId);

        await createLog('INFO', req.user.id, 'User deleted', { deletedUserId: userId, username: user.username }, req);

        res.json({
            success: true,
            message: 'משתמש נמחק בהצלחה'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        await createLog('ERROR', req.user.id, 'Error deleting user', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת משתמש'
        });
    }
});

module.exports = router;
