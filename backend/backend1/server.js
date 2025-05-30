const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./DB/DBconnect');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads')); 


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(null, isValid);
};

const upload = multer({ storage, fileFilter });


// Utility to generate unique 4-digit user ID
function generateUserId(callback) {
    const tryGenerate = () => {
        const id = Math.floor(1000 + Math.random() * 9000);
        db.query('SELECT * FROM user WHERE user_id = ?', [id], (err, results) => {
            if (err) return callback(err);
            if (results.length > 0) tryGenerate();
            else callback(null, id);
        });
    };
    tryGenerate();
}
function ShipmentId(callback) {
    const tryGenerate = () => {
        const id = 'SHP' + Math.floor(100000 + Math.random() * 900000);
        db.query('SELECT * FROM shipment_detail WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error("DB Error while generating shipment ID:", err);
                return callback(err);
            }
            if (results.length > 0) {
                return tryGenerate(); 
            } else {
                return callback(null, id); 
            }
        });
    };

    tryGenerate();
}



// Route to get all users
app.get('/', (req, res) => {
    db.query('SELECT * FROM user', (err, results) => {
        if (err) return res.status(500).json({ error: 'Query failed' });
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
                if (err) return res.status(500).json({ error: 'Database insert failed' });
                res.json({ message: 'User registered', id: result.insertId, user_id });
            });
        });
    });
});

// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM user WHERE email = ?`;

    db.query(sql, [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        bcrypt.compare(password, results[0].password, (err, match) => {
            if (!match) return res.status(401).json({ error: 'Invalid credentials' });
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
            UPDATE user SET name = ?, password = ?, phone = ?, type = ? WHERE email = ?
        `;
        db.query(sql, [name, hashedPassword, phone, type, emailParam], (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to update user' });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

            res.json({ message: 'User updated successfully' });
        });
    });
});

app.delete('/delete-user/:email', (req, res) => {
    const email = req.params.email;

    db.query(`DELETE FROM user WHERE email = ?`, [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to delete user' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'User deleted successfully' });
    });
});



app.get('/shipment', (req, res) => {
    db.query('SELECT * FROM shipment_detail', (err, result) => {
      if (err) return res.status(500).json({ error: 'Query failed' });
      res.json(result);
    });
  });
  
  app.post('/add_shipment', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), (req, res) => {
    const {
      material_Name,
      detail,
      quantity,
      price_per_unit,
      destination,
      pickup_location = null,
      drop_location = null,
      c_id = null,
      e_id = null,
      status = null
    } = req.body;
  
    if (!material_Name || !detail || !quantity || !price_per_unit || !destination) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
  
    const qty = parseInt(quantity);
    const price = parseFloat(price_per_unit);
    if (isNaN(qty) || isNaN(price)) {
      return res.status(400).json({ error: 'Quantity must be integer and price_per_unit must be a number' });
    }
  
    const total_price = qty * price;
  
    const image1 = req.files['image1']?.[0]?.path || null;
    const image2 = req.files['image2']?.[0]?.path || null;
    const image3 = req.files['image3']?.[0]?.path || null;
  
    ShipmentId((err, id) => {
      if (err) return res.status(500).json({ error: 'Failed to generate shipment ID' });
  
      const sql = `
        INSERT INTO shipment_detail
        (id, material_Name, detail, quantity, price_per_unit, total_price, destination,
         image1, image2, image3, pickup_location, drop_location, c_id, e_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
  
      const values = [
        id, material_Name, detail, qty, price, total_price, destination,
        image1, image2, image3, pickup_location, drop_location, c_id, e_id, status
      ];
  
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Insert error:', err.message);
          return res.status(500).json({ error: 'Failed to add shipment' });
        }
  
        res.json({
          message: 'Shipment added successfully',
          id,
          total_price
        });
      });
    });
  });
  
  app.put('/update-shipment/:id', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), (req, res) => {
    const id = req.params.id;
    const {
      material_Name,
      detail,
      quantity,
      price_per_unit,
      destination,
      pickup_location = null,
      drop_location = null,
      c_id = null,
      e_id = null,
      status = null
    } = req.body;
  
    if (!material_Name || !detail || !quantity || !price_per_unit || !destination) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
  
    const qty = parseInt(quantity);
    const price = parseFloat(price_per_unit);
    if (isNaN(qty) || isNaN(price)) {
      return res.status(400).json({ error: 'Quantity must be integer and price_per_unit must be a number' });
    }
  
    const total_price = qty * price;
  
    const image1 = req.files['image1']?.[0]?.path || null;
    const image2 = req.files['image2']?.[0]?.path || null;
    const image3 = req.files['image3']?.[0]?.path || null;
  
    let sql = `
      UPDATE shipment_detail SET 
      material_Name = ?, detail = ?, quantity = ?, price_per_unit = ?, total_price = ?, destination = ?,
      pickup_location = ?, drop_location = ?, c_id = ?, e_id = ?, status = ?
    `;
  
    const values = [
      material_Name, detail, qty, price, total_price, destination,
      pickup_location, drop_location, c_id, e_id, status
    ];
  
    if (image1) { sql += `, image1 = ?`; values.push(image1); }
    if (image2) { sql += `, image2 = ?`; values.push(image2); }
    if (image3) { sql += `, image3 = ?`; values.push(image3); }
  
    sql += ` WHERE id = ?`;
    values.push(id);
  
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Update error:', err.message);
        return res.status(500).json({ error: 'Failed to update shipment' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
  
      res.json({ message: 'Shipment updated successfully', total_price });
    });
  });


  app.get('/user_id', (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id in query' });
    }

    const query = 'SELECT * FROM user WHERE id = ?';
    db.query(query, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Query failed' });

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(results[0]); // Return the first user record
    });
});


app.get('/employee_id', (req, res) => {
    const { employee_id } = req.query;

    if (!employee_id) {
        return res.status(400).json({ error: 'Missing employee_id in query' });
    }

    const query = 'SELECT * FROM user WHERE id = ?';
    db.query(query, [employee_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Query failed' });

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(results[0]); // Return the first user record
    });
});



  
  app.delete('/delete-shipment/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM shipment_detail WHERE id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to delete shipment' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Shipment not found' });
      res.json({ message: 'Shipment deleted successfully' });
    });
  });


  app.get('/user', (req, res) => {
    const userId = req.query.user_id;
  
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
  
    const query = 'SELECT * FROM shipment_detail WHERE c_id = ?';
  
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching shipments by user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});