const express = require('express');
const { Logs, pool } = require('../database');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all logs (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const { type, userId, from, to, limit = 100 } = req.query;

        const filters = {};
        if (type) filters.type = type;
        if (userId) filters.userId = userId;
        if (from) filters.from = from;
        if (to) filters.to = to;

        let logs = await Logs.getAll(filters);

        // Apply limit
        logs = logs.slice(0, Number(limit));

        res.json({
            success: true,
            data: logs,
            total: logs.length
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת לוגים'
        });
    }
});

// Get log statistics
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    try {
        const logs = await Logs.getAll();

        const stats = {
            total: logs.length,
            byType: {},
            last24Hours: 0,
            lastWeek: 0,
            errors: 0
        };

        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        logs.forEach(log => {
            // Count by type
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

            // Count errors
            if (log.type === 'ERROR') {
                stats.errors++;
            }

            // Count by time
            const logDate = new Date(log.timestamp);
            if (logDate >= oneDayAgo) {
                stats.last24Hours++;
            }
            if (logDate >= oneWeekAgo) {
                stats.lastWeek++;
            }
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get log stats error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת סטטיסטיקות'
        });
    }
});

// Export logs as CSV
router.get('/export', verifyToken, isAdmin, async (req, res) => {
    try {
        const { type, from, to } = req.query;

        const filters = {};
        if (type) filters.type = type;
        if (from) filters.from = from;
        if (to) filters.to = to;

        const logs = await Logs.getAll(filters);

        // Create CSV
        const headers = ['ID', 'Timestamp', 'Type', 'User ID', 'Action', 'Platform', 'IP'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                log.id,
                log.timestamp,
                log.type,
                log.userId || '',
                `"${(log.action || '').replace(/"/g, '""')}"`,
                `"${(log.platform || '').replace(/"/g, '""')}"`,
                log.ip || ''
            ];
            csvRows.push(row.join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=logs-${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csv); // BOM for Excel Hebrew support

    } catch (error) {
        console.error('Export logs error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בייצוא לוגים'
        });
    }
});

// Clear old logs (admin only)
router.delete('/clear', verifyToken, isAdmin, async (req, res) => {
    try {
        const { before } = req.query;

        if (!before) {
            return res.status(400).json({
                success: false,
                message: 'נא לציין תאריך למחיקה'
            });
        }

        const beforeDate = new Date(before);

        // Delete logs older than the specified date
        const result = await pool.query(
            'DELETE FROM logs WHERE timestamp < $1',
            [beforeDate.toISOString()]
        );

        res.json({
            success: true,
            message: `${result.rowCount} לוגים נמחקו בהצלחה`
        });

    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת לוגים'
        });
    }
});

module.exports = router;
