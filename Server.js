const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  console.log('New user received:', req.body);

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
  };


  res.status(201).json({ id: newUser.id, message: 'User created successfully' });
});

app.post('/login',(req,res)=>{
  const {email,password}=req.body;
  const sql = `SELECT * FROM user WHERE email = ? AND password = ?`;
  const values = [email,password];
  db.query(sql, values, (err, results) =>
      {
          if (err) {
              console.error('Insert error:', err.message);
              return res.status(500).json({ error: 'Database insert failed' });

          }
          if(results.length>0){
                  res.json(results[0]);
                  }
                  else{
                      res.json({error:'Invalid email or password'});
                      }
                      }
                      );
})


const PORT = process.env.PORT || 1086;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
