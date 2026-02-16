const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Read database
function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: [], agreements: [], logs: [], templates: {} };
    }
}

// Write to database
function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing to database:', error);
        return false;
    }
}

// Users operations
const Users = {
    getAll: () => {
        const db = readDB();
        return db.users.map(u => ({ ...u, password: undefined }));
    },

    getById: (id) => {
        const db = readDB();
        return db.users.find(u => u.id === id);
    },

    getByUsername: (username) => {
        const db = readDB();
        return db.users.find(u => u.username === username);
    },

    create: (user) => {
        const db = readDB();
        db.users.push(user);
        writeDB(db);
        return { ...user, password: undefined };
    },

    update: (id, updates) => {
        const db = readDB();
        const index = db.users.findIndex(u => u.id === id);
        if (index === -1) return null;

        db.users[index] = { ...db.users[index], ...updates, updatedAt: new Date().toISOString() };
        writeDB(db);
        return { ...db.users[index], password: undefined };
    },

    delete: (id) => {
        const db = readDB();
        const index = db.users.findIndex(u => u.id === id);
        if (index === -1) return false;

        db.users.splice(index, 1);
        writeDB(db);
        return true;
    }
};

// Agreements operations
const Agreements = {
    getAll: () => {
        const db = readDB();
        return db.agreements;
    },

    getById: (id) => {
        const db = readDB();
        return db.agreements.find(a => a.id === id);
    },

    getByUser: (userId) => {
        const db = readDB();
        return db.agreements.filter(a => a.createdBy === userId);
    },

    create: (agreement) => {
        const db = readDB();
        db.agreements.push(agreement);
        writeDB(db);
        return agreement;
    },

    update: (id, updates) => {
        const db = readDB();
        const index = db.agreements.findIndex(a => a.id === id);
        if (index === -1) return null;

        db.agreements[index] = { ...db.agreements[index], ...updates, updatedAt: new Date().toISOString() };
        writeDB(db);
        return db.agreements[index];
    },

    delete: (id) => {
        const db = readDB();
        const index = db.agreements.findIndex(a => a.id === id);
        if (index === -1) return false;

        db.agreements.splice(index, 1);
        writeDB(db);
        return true;
    }
};

// Logs operations
const Logs = {
    getAll: (filters = {}) => {
        const db = readDB();
        let logs = db.logs;

        if (filters.type) {
            logs = logs.filter(l => l.type === filters.type);
        }
        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }
        if (filters.from) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.from));
        }
        if (filters.to) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.to));
        }

        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    create: (log) => {
        const db = readDB();
        db.logs.push(log);
        writeDB(db);
        return log;
    },

    clear: () => {
        const db = readDB();
        db.logs = [];
        writeDB(db);
        return true;
    }
};

// Templates operations
const Templates = {
    get: (type) => {
        const db = readDB();
        return db.templates[type];
    },

    update: (type, template) => {
        const db = readDB();
        db.templates[type] = { ...db.templates[type], ...template };
        writeDB(db);
        return db.templates[type];
    }
};

module.exports = {
    Users,
    Agreements,
    Logs,
    Templates,
    readDB,
    writeDB
};
