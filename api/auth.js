const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { action } = req.body;

        switch (action) {
            case 'signup':
                return await handleSignup(req, res);
            case 'login':
                return await handleLogin(req, res);
            case 'verify':
                return await handleVerify(req, res);
            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Auth API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function handleSignup(req, res) {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
        // Check if user already exists
        const existingUser = await sql`
            SELECT id FROM users WHERE username = ${username}
        `;
        
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await sql`
            INSERT INTO users (username, password_hash, created_at)
            VALUES (${username}, ${hashedPassword}, NOW())
            RETURNING id, username, created_at
        `;

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser[0].id, username: newUser[0].username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser[0].id,
                username: newUser[0].username,
                createdAt: newUser[0].created_at
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
}

async function handleLogin(req, res) {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Find user
        const user = await sql`
            SELECT id, username, password_hash, created_at
            FROM users 
            WHERE username = ${username}
        `;
        
        if (user.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user[0].id, username: user[0].username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user[0].id,
                username: user[0].username,
                createdAt: user[0].created_at
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

async function handleVerify(req, res) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Remove 'Bearer ' prefix
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists
        const user = await sql`
            SELECT id, username, created_at
            FROM users 
            WHERE id = ${decoded.userId}
        `;
        
        if (user.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user[0].id,
                username: user[0].username,
                createdAt: user[0].created_at
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Token verification failed' });
    }
}