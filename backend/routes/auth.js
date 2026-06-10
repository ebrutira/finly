const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db');
const { incrementQuest } = require('../helpers/questProgress');

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

        // Günlük giriş serisi (streak) güncelle
        const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        let streak = user.streak || 0;

        if (!user.last_login) {
            streak = 1;
        } else if (user.last_login !== todayStr) {
            const last = new Date(user.last_login + 'T00:00:00Z');
            const today = new Date(todayStr + 'T00:00:00Z');
            const diffDays = Math.round((today - last) / 86400000);
            streak = diffDays === 1 ? streak + 1 : 1;
        }

        if (user.last_login !== todayStr) {
            await supabase.from('users').update({ streak, last_login: todayStr }).eq('id', user.id);
            incrementQuest(user.id, 'daily_login');
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                xp: user.xp,
                level: user.level,
                streak,
            },
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── FORGOT PASSWORD ────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email gerekli.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await supabase.from('password_resets').delete().eq('email', email);
  const { error } = await supabase
    .from('password_resets')
    .insert({ email, otp, expires_at: expiresAt });

  if (error) return res.status(500).json({ error: 'Sunucu hatası.' });

  console.log(`[DEV] Şifre sıfırlama kodu — ${email}: ${otp}`);
  res.json({ message: 'Kod e-postanıza gönderildi.', code: otp });
});

// ─── RESET PASSWORD ─────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli.' });
  }

  // Supabase'in kendi NOW() ile karşılaştır — timezone sorununu önler
  const { data, error } = await supabase
    .from('password_resets')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return res.status(400).json({ error: 'Kod hatalı veya süresi dolmuş.' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const { error: updateErr } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('email', email);

  if (updateErr) return res.status(500).json({ error: 'Şifre güncellenemedi.' });

  await supabase.from('password_resets').delete().eq('email', email);
  res.json({ message: 'Şifre başarıyla sıfırlandı.' });
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
