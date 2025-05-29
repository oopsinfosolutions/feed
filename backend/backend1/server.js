const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./DB/DBconnect');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Utility to generate unique 4-digit user ID
function generateUserId(callback) {
    const tryGenerate = () => {
        const id = Math.floor(1000 + Math.random() * 9000);
        db.query('SELECT * FROM user WHERE user_id = ?', [id], (err, results) => {
            if (err) return callback(err);
            if (results.length > 0) {
                tryGenerate(); // Try again if ID exists
            } else {
                callback(null, id);
            }
        });
    };
    tryGenerate();
}

// Route to get all users
app.get('/', (req, res) => {
    db.query('SELECT * FROM user', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Query failed' });
        }
        res.json(results);
    });
});

// Signup Route
app.post('/signup', (req, res) => {
    const { name, email, password, phone, type } = req.body;

    if (!name || !email || !password || !phone || !type) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    bcrypt.hash(password, 12, (err, hashedPassword) => {
        if (err) return res.status(500).json({ error: 'Error encrypting password' });

        generateUserId((err, user_id) => {
            if (err) return res.status(500).json({ error: 'Failed to generate user ID' });

            const sql = `INSERT INTO user (name, email, password, phone, type, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
            const values = [name, email, hashedPassword, phone, type, user_id];

            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error('Insert error:', err.message);
                    return res.status(500).json({ error: 'Database insert failed' });
                }
                res.json({ message: 'Record added successfully', id: result.insertId, user_id });
            });
        });
    });
});

// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM user WHERE email = ?`;

    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database query failed' });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (err || !isMatch) return res.status(401).json({ error: 'Invalid email or password' });
            res.json(results[0]);
        });
    });
});


app.put('/update-user/:email', (req, res) => {
    const emailParam = req.params.email;
    const { name, password, phone, type } = req.body;

    if (!name || !password || !phone || !type) {
        return res.status(400).json({ error: 'All fields are required for update' });
    }


    bcrypt.hash(password, 12, (err, hashedPassword) => {
        if (err) return res.status(500).json({ error: 'Error hashing password' });

        const sql = `
            UPDATE user
            SET name = ?, password = ?, phone = ?, type = ?
            WHERE email = ?
        `;
        const values = [name, hashedPassword, phone, type, emailParam];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Update error:', err.message);
                return res.status(500).json({ error: 'Failed to update user' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: 'User updated successfully' });
        });
    });
});
app.delete('/delete-user/:email', (req, res) => {
    const email = req.params.email;

    const sql = `DELETE FROM user WHERE email = ?`;

    db.query(sql, [email], (err, result) => {
        if (err) {
            console.error('Delete error:', err.message);
            return res.status(500).json({ error: 'Failed to delete user' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    });
});

app.get('/shipment', (req, res) => {
    db.query('SELECT * FROM shipment_detail', (err, result) => {
        if (err) return res.status(500).json({ error: 'Query failed' });
        res.json(result);
    });
});

app.post('/add_shipment', upload.single('image'), (req, res) => {
    const { material_Name, detail, quantity, price_per_unit, destination } = req.body;
    if (!material_Name || !detail || !quantity || !price_per_unit || !destination) {
        return res.status(400).json({ error: 'All fields are required except total_price' });
    }

    const imagePath = req.file ? req.file.path : null;

    ShipmentId((err, id) => {
    if (err) return res.status(500).json({ error: 'Failed to generate shipment ID' });

    const total_price = quantity * price_per_unit;
    const sql = `
        INSERT INTO shipment_detail
        (id, material_Name, detail, quantity, price_per_unit, total_price, destination, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [id, material_Name, detail, quantity, price_per_unit, total_price, destination, imagePath], (err, result) => {
        if (err) {
            console.error('Insert error:', err.message);
            return res.status(500).json({ error: 'Failed to add shipment' });
        }

        res.json({ message: 'Shipment added successfully', id, total_price, image: imagePath });
    });
});
});


app.put('/update-shipment/:id', upload.single('image'), (req, res) => {
    const { material_Name, detail, quantity, price_per_unit, destination } = req.body;
    const id = req.params.id;
    const total_price = quantity * price_per_unit;
    const imagePath = req.file ? req.file.path : null;

    const sql = imagePath
        ? UPDATE shipment_detail SET material_Name = ?, detail = ?, quantity = ?, price_per_unit = ?, total_price = ?, destination = ?, image = ? WHERE id = ?
        : UPDATE shipment_detail SET material_Name = ?, detail = ?, quantity = ?, price_per_unit = ?, total_price = ?, destination = ? WHERE id = ?;

    const values = imagePath
        ? [material_Name, detail, quantity, price_per_unit, total_price, destination, imagePath, id]
        : [material_Name, detail, quantity, price_per_unit, total_price, destination, id];

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to update shipment' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Shipment not found' });

        res.json({ message: 'Shipment updated', total_price, image: imagePath });
    });
});

app.delete('/delete-shipment/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM shipment_detail WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to delete shipment' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Shipment not found' });

        res.json({ message: 'Shipment deleted' });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});