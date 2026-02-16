const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database schema
async function initializeDatabase() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database schema:', error);
    }
}

// Initialize on startup
initializeDatabase();

// Helper to convert snake_case to camelCase and handle dates
function toCamelCase(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(toCamelCase);

    const newObj = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const value = obj[key];
        // Convert Date objects to ISO strings
        if (value instanceof Date) {
            newObj[camelKey] = value.toISOString();
        } else {
            newObj[camelKey] = toCamelCase(value);
        }
    }
    return newObj;
}

// Users operations
const Users = {
    getAll: async () => {
        const result = await pool.query(
            'SELECT id, full_name, phone, username, role, created_at, updated_at FROM users ORDER BY created_at DESC'
        );
        return result.rows.map(row => toCamelCase(row));
    },

    getById: async (id) => {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    },

    getByUsername: async (username) => {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    },

    create: async (user) => {
        const result = await pool.query(
            `INSERT INTO users (id, full_name, phone, username, password, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, full_name, phone, username, role, created_at, updated_at`,
            [user.id, user.fullName, user.phone, user.username, user.password, user.role, user.createdAt, user.updatedAt]
        );
        return toCamelCase(result.rows[0]);
    },

    update: async (id, updates) => {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (updates.fullName !== undefined) {
            setClauses.push(`full_name = $${paramIndex++}`);
            values.push(updates.fullName);
        }
        if (updates.phone !== undefined) {
            setClauses.push(`phone = $${paramIndex++}`);
            values.push(updates.phone);
        }
        if (updates.password !== undefined) {
            setClauses.push(`password = $${paramIndex++}`);
            values.push(updates.password);
        }
        if (updates.role !== undefined) {
            setClauses.push(`role = $${paramIndex++}`);
            values.push(updates.role);
        }
        setClauses.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        values.push(id);

        const result = await pool.query(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
             RETURNING id, full_name, phone, username, role, created_at, updated_at`,
            values
        );
        return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    },

    delete: async (id) => {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }
};

// Agreements operations
const Agreements = {
    getAll: async () => {
        const result = await pool.query(
            'SELECT * FROM agreements ORDER BY created_at DESC'
        );
        return result.rows.map(row => toCamelCase(row));
    },

    getById: async (id) => {
        const result = await pool.query(
            'SELECT * FROM agreements WHERE id = $1',
            [id]
        );
        return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    },

    getByUser: async (userId) => {
        const result = await pool.query(
            'SELECT * FROM agreements WHERE created_by = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows.map(row => toCamelCase(row));
    },

    create: async (agreement) => {
        const result = await pool.query(
            `INSERT INTO agreements (
                id, type, status, created_by, created_by_name,
                company_name, company_id, contact_name, contact_id,
                monthly_amount, payment_day, effective_date, duration, agreement_date,
                selected_services, notes, company_template,
                client_signature, company_stamp,
                sent_at, sent_via, sent_to, signed_at, pdf_url, drive_backup,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
            RETURNING *`,
            [
                agreement.id,
                agreement.type,
                agreement.status,
                agreement.createdBy,
                agreement.createdByName,
                agreement.companyName,
                agreement.companyId,
                agreement.contactName,
                agreement.contactId,
                agreement.monthlyAmount,
                agreement.paymentDay,
                agreement.effectiveDate,
                agreement.duration,
                agreement.agreementDate,
                JSON.stringify(agreement.selectedServices || {}),
                agreement.notes,
                JSON.stringify(agreement.companyTemplate || {}),
                agreement.clientSignature,
                agreement.companyStamp,
                agreement.sentAt,
                agreement.sentVia,
                agreement.sentTo,
                agreement.signedAt,
                agreement.pdfUrl,
                agreement.driveBackup ? JSON.stringify(agreement.driveBackup) : null,
                agreement.createdAt,
                agreement.updatedAt
            ]
        );
        return toCamelCase(result.rows[0]);
    },

    update: async (id, updates) => {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        const fieldMappings = {
            type: 'type',
            status: 'status',
            createdByName: 'created_by_name',
            companyName: 'company_name',
            companyId: 'company_id',
            contactName: 'contact_name',
            contactId: 'contact_id',
            monthlyAmount: 'monthly_amount',
            paymentDay: 'payment_day',
            effectiveDate: 'effective_date',
            duration: 'duration',
            agreementDate: 'agreement_date',
            notes: 'notes',
            clientSignature: 'client_signature',
            companyStamp: 'company_stamp',
            sentAt: 'sent_at',
            sentVia: 'sent_via',
            sentTo: 'sent_to',
            signedAt: 'signed_at',
            pdfUrl: 'pdf_url'
        };

        const jsonFields = {
            selectedServices: 'selected_services',
            companyTemplate: 'company_template',
            driveBackup: 'drive_backup'
        };

        for (const [jsKey, dbKey] of Object.entries(fieldMappings)) {
            if (updates[jsKey] !== undefined) {
                setClauses.push(`${dbKey} = $${paramIndex++}`);
                values.push(updates[jsKey]);
            }
        }

        for (const [jsKey, dbKey] of Object.entries(jsonFields)) {
            if (updates[jsKey] !== undefined) {
                setClauses.push(`${dbKey} = $${paramIndex++}`);
                values.push(JSON.stringify(updates[jsKey]));
            }
        }

        if (setClauses.length === 0) {
            return await Agreements.getById(id);
        }

        setClauses.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        values.push(id);

        const result = await pool.query(
            `UPDATE agreements SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0] ? toCamelCase(result.rows[0]) : null;
    },

    delete: async (id) => {
        const result = await pool.query(
            'DELETE FROM agreements WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }
};

// Logs operations
const Logs = {
    getAll: async (filters = {}) => {
        let query = 'SELECT * FROM logs WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        if (filters.type) {
            query += ` AND type = $${paramIndex++}`;
            values.push(filters.type);
        }
        if (filters.userId) {
            query += ` AND user_id = $${paramIndex++}`;
            values.push(filters.userId);
        }
        if (filters.from) {
            query += ` AND timestamp >= $${paramIndex++}`;
            values.push(filters.from);
        }
        if (filters.to) {
            query += ` AND timestamp <= $${paramIndex++}`;
            values.push(filters.to);
        }

        query += ' ORDER BY timestamp DESC';

        const result = await pool.query(query, values);
        return result.rows.map(row => toCamelCase(row));
    },

    create: async (log) => {
        const result = await pool.query(
            `INSERT INTO logs (id, timestamp, type, user_id, action, details, platform, ip)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                log.id,
                log.timestamp,
                log.type,
                log.userId,
                log.action,
                JSON.stringify(log.details || {}),
                log.platform,
                log.ip
            ]
        );
        return toCamelCase(result.rows[0]);
    },

    clear: async () => {
        await pool.query('DELETE FROM logs');
        return true;
    }
};

// Templates operations
const Templates = {
    get: async (type) => {
        const result = await pool.query(
            'SELECT * FROM templates WHERE type = $1',
            [type]
        );
        if (!result.rows[0]) return null;

        const row = result.rows[0];
        return {
            companyName: row.company_name,
            parentCompany: row.parent_company,
            companyId: row.company_id,
            address: row.address,
            phone: row.phone,
            fax: row.fax
        };
    },

    update: async (type, template) => {
        const result = await pool.query(
            `UPDATE templates SET
                company_name = COALESCE($2, company_name),
                parent_company = COALESCE($3, parent_company),
                company_id = COALESCE($4, company_id),
                address = COALESCE($5, address),
                phone = COALESCE($6, phone),
                fax = COALESCE($7, fax)
             WHERE type = $1
             RETURNING *`,
            [
                type,
                template.companyName,
                template.parentCompany,
                template.companyId,
                template.address,
                template.phone,
                template.fax
            ]
        );

        if (!result.rows[0]) return null;

        const row = result.rows[0];
        return {
            companyName: row.company_name,
            parentCompany: row.parent_company,
            companyId: row.company_id,
            address: row.address,
            phone: row.phone,
            fax: row.fax
        };
    }
};

module.exports = {
    Users,
    Agreements,
    Logs,
    Templates,
    pool,
    initializeDatabase
};
