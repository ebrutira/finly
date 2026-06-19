const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── PROFİL BİLGİSİ ──────────────────────────────────────
router.get('/me', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, balance, xp, level, streak, created_at')
            .eq('id', req.userId)
            .single();

        if (error) throw error;
        res.json({ user: data });
    } catch (err) {
        res.status(500).json({ error: 'Profil alınamadı.' });
    }
});

// ─── PROFİL GÜNCELLE ─────────────────────────────────────
router.patch('/me', async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Geçerli bir isim girin.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ name: name.trim() })
            .eq('id', req.userId)
            .select('id, name, email')
            .single();

        if (error) throw error;
        res.json({ user: data });
    } catch (err) {
        res.status(500).json({ error: 'Profil güncellenemedi.' });
    }
});

// ─── ŞİFRE DEĞİŞTİR ─────────────────────────────────────
router.patch('/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Mevcut ve yeni şifre gereklidir.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Yeni şifre en az 8 karakter olmalıdır.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('password')
            .eq('id', req.userId)
            .single();

        if (error) throw error;

        const isMatch = await bcrypt.compare(currentPassword, data.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashed })
            .eq('id', req.userId);

        if (updateError) throw updateError;

        res.json({ message: 'Şifre başarıyla değiştirildi.' });
    } catch (err) {
        res.status(500).json({ error: 'Şifre değiştirilemedi.' });
    }
});

// ─── PUSH TOKEN KAYDET ───────────────────────────────────
router.post('/push-token', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token gereklidir.' });
    try {
        await supabase.from('users').update({ push_token: token }).eq('id', req.userId);
        res.json({ message: 'Token kaydedildi.' });
    } catch {
        res.status(500).json({ error: 'Token kaydedilemedi.' });
    }
});

module.exports = router;
