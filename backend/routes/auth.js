const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Email zaten kayıtlı mı?
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1', [email]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Bu email zaten kayıtlı.' });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Kullanıcıyı kaydet
        const result = await pool.query(
            `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3) RETURNING id, name, email`,
            [name, email, hashedPassword]
        );

        res.status(201).json({ user: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── LOGIN ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Kullanıcı var mı?
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email veya şifre hatalı.' });
        }

        const user = result.rows[0];

        // Şifre doğru mu?
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Email veya şifre hatalı.' });
        }

        // JWT üret
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── ME (middleware test için) ──────────────────────────
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
    const result = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [req.userId]
    );
    res.json({ user: result.rows[0] });
});

module.exports = router;