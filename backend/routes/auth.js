const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db');

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Bu email zaten kayıtlı.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users')
            .insert({ name, email, password: hashedPassword })
            .select('id, name, email');

        if (error) throw error;

        res.status(201).json({ user: data[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── LOGIN ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(401).json({ error: 'Email veya şifre hatalı.' });
        }

        const user = data[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Email veya şifre hatalı.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── ME ─────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', req.userId);

    if (error) return res.status(500).json({ error: 'Sunucu hatası.' });

    res.json({ user: data[0] });
});

module.exports = router;
