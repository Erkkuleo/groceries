const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.Server(app);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const readLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

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
    db.run(`CREATE TABLE IF NOT EXISTS groceries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT NOT NULL
    )`, (err) => {
        if (err) console.error('Failed to create table:', err.message);
    });
});

app.get('/api', readLimiter, (req, res) => {
    res.json({ message: 'moi' });
});

app.get('/tableData', readLimiter, (req, res) => {
    const sql = `SELECT ID id, Product product FROM groceries;`;
    const table = [];
    db.each(sql, [], (err, row) => {
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

app.post('/api/retrieve', writeLimiter, (req, res) => {
    const { data } = req.body;
    if (!data || typeof data !== 'string' || data.trim().length === 0 || data.length > 200) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    db.run(`INSERT INTO groceries(product) VALUES (?)`, [data], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'Data received' });
    });
});

app.post('/api/remove', writeLimiter, (req, res) => {
    const { data } = req.body;
    if (!Number.isInteger(data) || data <= 0) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    db.run(`DELETE FROM groceries WHERE id = ?`, [data], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'remove command received' });
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
