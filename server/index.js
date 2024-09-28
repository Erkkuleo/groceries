const path = require('path');
const express = require('express');

const cors = require('cors');
const PORT = process.env.PORT || 3001;

const app = express();
const  http = require('http').Server(app);

app.use(cors());

const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000"
    }
});

io.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);
    
    socket.on("aProductWasTakenOrAdded", () => {
        socket.broadcast.emit("update");
    });

    socket.on('disconnect', () => {
      console.log('🔥: A user disconnected');
    });
  });

const sqlite3 = require('sqlite3').verbose();

app.use(express.json());

let db = new sqlite3.Database('groceries.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log("Connected to database");
});
/*
db.run('INSERT INTO groceries(id, product) VALUES (2, \'kauramaito\')', [], function(err) {
    if (err) {
        return console.log(err.message);
    }
    console.log(`A row has been inserted ${this.lastID}`);
});
*/

let selectSql = `SELECT Id id,
Product product
FROM groceries`;

let table = [];
db.each(selectSql, [], function(err, row) {
if(err) {
console.log(err.message);
}  
table.push({id: row.id, product: row.product});
});


app.use(express.static(path.resolve(__dirname, '~/Documents/omat/node/client/build')));

app.get('/api', (req, res) => {
    res.json({ message : "moi"});
});

app.get('/tableData', (req, res) => {
    let selectSql = `SELECT ID id, Product product FROM groceries;`;

    let table = [];
    db.each(selectSql, [], (err, row) => {
        if (err) {
            console.log(err.message);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        table.push({ id: row.id, product: row.product });
    }, () => {
        res.json(table);
    });
});

app.post('/api/retreave', (req, res) => {
    const { data } = req.body;
    console.log(data);
    res.json({ message: 'Data received' });
    db.run(`INSERT INTO groceries(product) VALUES (\'${data}\')`, [], function(err) {
        if (err) {
            return console.log(err.message);
        }
        console.log("successfuly added product to database");
    });
});

app.post('/api/remove', (req, res) => {
    const { data } = req.body;    
    console.log(data);
    res.json({message: 'remove command recieved'});
    db.run(`DELETE FROM groceries WHERE id = ?`, [data], function(err) {
        if (err) {
            return console.log(err.message);
        }
        console.log("Successfully removed product from database");
    });
});

http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

