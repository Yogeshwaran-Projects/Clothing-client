const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const stripe = require('stripe')('sk_test_51PKIroSHRE1k8EdpHEczao6QjRlRvguOXJG6Ry3Z2k4I4Ib6ginOFtywVgFOivjCkGHllSbaGEEXcfe3eJ0zesvz00f46quKKo'); // Your secret key
const db = require('./db'); // MySQL connection setup
const app = express();

app.use(express.json());
app.use(cors());

// Register User
app.post('/api/v1/user/save', (req, res) => {
    const { fullname, username, phone_number, email, password, gender } = req.body;

    // Hash password before storing
    const hashedPassword = bcrypt.hashSync(password, 10);

    const query = 'INSERT INTO users (fullname, username, phone_number, email, password, gender) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.query(query, [fullname, username, phone_number, email, hashedPassword, gender], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).send('Email or username already exists.');
            }
            return res.status(500).send('Server error.');
        }
        res.status(201).send('User registered successfully.');
    });
});

// Login User
app.post('/api/v1/user/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).send('Server error.');
        }
        if (results.length === 0) {
            return res.status(400).send('No user found with this email.');
        }

        const user = results[0];

        // Compare hashed password
        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
            return res.status(400).send('Incorrect password.');
        }

        res.status(200).send('Login successful.');
    });
});

// Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Artificial Intelligence A-Z 2024',
                    },
                    unit_amount: 80000, // Amount in cents ($800.00)
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://127.0.0.1:5500/frontend/success.html', // Success page
            cancel_url: 'http://127.0.0.1:5500/frontend/payment-failed.html', // Cancel page
        });

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
