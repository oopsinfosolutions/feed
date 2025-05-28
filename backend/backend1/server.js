const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./DB/DBconnect');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

function generateUserId(callback) {
    const tryGenerate = () => {
        const id = Math.floor(1000 + Math.random() * 9000);
        db.query('SELECT * FROM user WHERE user_id = ?', [id], (err, results) => {
            if (err) return callback(err);
            if (results.length > 0) {
                
                tryGenerate();
            } else {
                callback(null, id);
            }
        });
    };
    tryGenerate();
}

app.get('/', (req, res) => {
    db.query('SELECT * FROM user', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Query failed' });
        }
        res.json(results);
    });
});

app.post('/signup', (req, res) => {
    console.log("Signup request body:", req.body);

    const { name, email, password, phone, type,} = req.body;

    if (!name || !email || !password || !phone || !type) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    generateUserId((err, user_id) => {
        if (err) {
            console.error('User ID generation error:', err.message);
            return res.status(500).json({ error: 'Failed to generate user ID' });
        }

        const sql = `INSERT INTO user (name, email, password, phone, type, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [name, email, password, phone, type, user_id];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Insert error:', err.message);
                return res.status(500).json({ error: 'Database insert failed' });
            }
            res.json({ message: 'Record added successfully', id: result.insertId, user_id });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM user WHERE email = ? AND password = ?`;
    const values = [email, password];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Login error:', err.message);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});