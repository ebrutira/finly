const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── BİLDİRİMLERİ LİSTELE ────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json({ notifications: data });
    } catch (err) {
        res.status(500).json({ error: 'Bildirimler alınamadı.' });
    }
});

// ─── TÜMÜNÜ OKUNDU İŞARETLE ──────────────────────────────
router.patch('/read-all', async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.userId)
            .eq('is_read', false);

        if (error) throw error;
        res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi.' });
    } catch (err) {
        res.status(500).json({ error: 'Bildirimler güncellenemedi.' });
    }
});

// ─── TEKİL BİLDİRİMİ OKUNDU İŞARETLE ────────────────────
router.patch('/:id/read', async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.id)
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json({ message: 'Bildirim okundu.' });
    } catch (err) {
        res.status(500).json({ error: 'Bildirim güncellenemedi.' });
    }
});

module.exports = router;
