const express = require("express");
const cors = require("cors");
const sequelize = require("./Database/DB");
const SignUp = require('./models/signup'); // Correct casing
const Material=require('./models/shipmentorder')
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

const shipmentorder =require("./routes/officeEmp");
const employee =require("./routes/employee")
const admin =require("./routes/admin")

app.use('/api',shipmentorder)
app.use('/api',employee)
app.use('/admin',admin)



async function generateUserId() {
  while (true) {
    const id = Math.floor(1000 + Math.random() * 9000);
    const existing = await SignUp.findOne({ where: { user_id: id } });
    if (!existing) return id;
  }
}

// Signup Route
app.post('/signup', async (req, res) => {
  try {
    console.log("req.body ===>", req.body); // Debug log

    const { fullName, email, password, phone, type } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user_id = await generateUserId();

    const user = await SignUp.create({
      fullName, 
      email,
      password,
      phone,
      type,
      user_id
    });

    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const user = await SignUp.findOne({ where: { phone, password } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
