import db from '../db.js';
import bcrypt from 'bcrypt';

export const signup = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Check if user already exists
		db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
			if (err) return res.status(500).json({ error: err.message });
			if (results.length > 0) return res.status(400).json({ message: 'User already exists' });

			// Hash password
			const hashedPassword = await bcrypt.hash(password, 10);

			// Insert new user
			db.query(
				'INSERT INTO users (name, email, password,phone) VALUES (?, ?, ?,?)',
				[name, email, hashedPassword],
				(err, results) => {
					if (err) return res.status(500).json({ error: err.message });
					res.status(201).json({ message: 'User registered successfully' });
				}
			);
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export const login = (req, res) => {
	const { email, password } = req.body;

	db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
		if (err) return res.status(500).json({ error: err.message });
		if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

		const user = results[0];
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

		
	});
};

