const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'server/database/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Hash for strong password
const newPassword = 'Admin@RT2026!';
const newHash = bcrypt.hashSync(newPassword, 10);

// Update admin password
if (db.users && db.users[0]) {
    db.users[0].password = newHash;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Password reset to:', newPassword);
    console.log('New hash:', newHash);
} else {
    console.log('No users found');
}
