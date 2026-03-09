const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

const app = express();
const server = http.Server(app);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const readLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        req.user = jwt.verify(header.slice(7), JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

const io = require('socket.io')(server, {
    cors: { origin: CLIENT_ORIGIN }
});

io.on('connection', (socket) => {
    console.log(`connected: ${socket.id}`);

    socket.on('aProductWasTakenOrAdded', () => {
        socket.broadcast.emit('update');
    });

    socket.on('disconnect', () => {
        console.log('disconnected:', socket.id);
    });
});

const DB_PATH = process.env.DB_PATH || 'groceries.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to database');
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )`, (err) => { if (err) console.error('Failed to create users table:', err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL REFERENCES users(id),
            share_token TEXT UNIQUE
        )`, (err) => { if (err) console.error('Failed to create lists table:', err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS groceries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL REFERENCES lists(id),
            product TEXT NOT NULL
        )`, (err) => { if (err) console.error('Failed to create groceries table:', err.message); });
    });
});

app.get('/api', readLimiter, (req, res) => {
    res.json({ message: 'moi' });
});

app.post('/api/auth/register', writeLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.length > 50 || password.length < 8) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) return res.status(409).json({ error: 'Username already taken' });
            const userId = this.lastID;
            db.run(`INSERT INTO lists (owner_id) VALUES (?)`, [userId], function(err) {
                if (err) return res.status(500).json({ error: 'Internal Server Error' });
                res.json({ message: 'User created' });
            });
        });
    });
});

app.post('/api/auth/login', writeLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        db.get(`SELECT id FROM lists WHERE owner_id = ?`, [user.id], (err, list) => {
            if (err) return res.status(500).json({ error: 'Internal Server Error' });
            if (!list) return res.status(500).json({ error: 'No list found for user' });

            const token = jwt.sign(
                { userId: user.id, listId: list.id },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.json({ token });
        });
    });
});

app.get('/tableData', readLimiter, requireAuth, (req, res) => {
    const sql = `SELECT id, product FROM groceries WHERE list_id = ?`;
    const table = [];
    db.each(sql, [req.user.listId], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        table.push({ id: row.id, product: row.product });
    }, () => {
        res.json(table);
    });
});

app.post('/api/retrieve', writeLimiter, requireAuth, (req, res) => {
    const { data } = req.body;
    if (!data || typeof data !== 'string' || data.trim().length === 0 || data.length > 200) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    db.run(`INSERT INTO groceries(list_id, product) VALUES (?, ?)`, [req.user.listId, data], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'Data received' });
    });
});

app.post('/api/remove', writeLimiter, requireAuth, (req, res) => {
    const { data } = req.body;
    if (!Number.isInteger(data) || data <= 0) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    db.run(`DELETE FROM groceries WHERE id = ? AND list_id = ?`, [data, req.user.listId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'remove command received' });
    });
});

app.post('/api/list/share', writeLimiter, requireAuth, (req, res) => {
    const token = uuidv4();
    db.run(`UPDATE lists SET share_token = ? WHERE id = ?`, [token, req.user.listId], function(err) {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json({ token });
    });
});

app.get('/api/list/:token', readLimiter, (req, res) => {
    const { token } = req.params;
    db.get(`SELECT id FROM lists WHERE share_token = ?`, [token], (err, list) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        if (!list) return res.status(404).json({ error: 'List not found' });
        db.all(`SELECT id, product FROM groceries WHERE list_id = ?`, [list.id], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Internal Server Error' });
            res.json(rows);
        });
    });
});

app.post('/api/list/:token/retrieve', writeLimiter, (req, res) => {
    const { token } = req.params;
    const { data } = req.body;
    if (!data || typeof data !== 'string' || data.trim().length === 0 || data.length > 200) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    db.get(`SELECT id FROM lists WHERE share_token = ?`, [token], (err, list) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        if (!list) return res.status(404).json({ error: 'List not found' });
        db.run(`INSERT INTO groceries(list_id, product) VALUES (?, ?)`, [list.id, data], function(err) {
            if (err) return res.status(500).json({ error: 'Internal Server Error' });
            res.json({ message: 'Data received' });
        });
    });
});

app.post('/api/list/:token/remove', writeLimiter, (req, res) => {
    const { token } = req.params;
    const { data } = req.body;
    if (!Number.isInteger(data) || data <= 0) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    db.get(`SELECT id FROM lists WHERE share_token = ?`, [token], (err, list) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        if (!list) return res.status(404).json({ error: 'List not found' });
        db.run(`DELETE FROM groceries WHERE id = ? AND list_id = ?`, [data, list.id], function(err) {
            if (err) return res.status(500).json({ error: 'Internal Server Error' });
            res.json({ message: 'remove command received' });
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
