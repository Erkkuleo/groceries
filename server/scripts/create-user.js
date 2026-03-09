const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const args = process.argv.slice(2);
const usernameFlag = args.indexOf('--username');
const passwordFlag = args.indexOf('--password');

if (usernameFlag === -1 || passwordFlag === -1) {
    console.error('Usage: node scripts/create-user.js --username <name> --password <pass>');
    process.exit(1);
}

const username = args[usernameFlag + 1];
const password = args[passwordFlag + 1];
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'groceries.db');

const db = new sqlite3.Database(DB_PATH, async (err) => {
    if (err) { console.error(err.message); process.exit(1); }

    const hash = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hash], function(err) {
        if (err) { console.error('Failed to create user:', err.message); process.exit(1); }
        const userId = this.lastID;
        db.run(`INSERT INTO lists (owner_id) VALUES (?)`, [userId], function(err) {
            if (err) { console.error('Failed to create list:', err.message); process.exit(1); }
            console.log(`Created user "${username}" (id=${userId}) with list id=${this.lastID}`);
            db.close();
        });
    });
});
