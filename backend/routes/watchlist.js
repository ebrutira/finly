const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── LİSTELE ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('watchlist')
            .select('id, symbol, added_at')
            .eq('user_id', req.userId)
            .order('added_at', { ascending: false });

        if (error) throw error;
        res.json({ watchlist: data });
    } catch (err) {
        res.status(500).json({ error: 'Watchlist alınamadı.' });
    }
});

// ─── EKLE ────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol gereklidir.' });

    try {
        const { error } = await supabase
            .from('watchlist')
            .insert({ user_id: req.userId, symbol: symbol.toUpperCase() });

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Zaten takip ediliyor.' });
            }
            throw error;
        }

        res.status(201).json({ message: `${symbol.toUpperCase()} takip listesine eklendi.` });
    } catch (err) {
        res.status(500).json({ error: 'Eklenemedi.' });
    }
});

// ─── KALDIR ──────────────────────────────────────────────
router.delete('/:symbol', async (req, res) => {
    try {
        const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', req.userId)
            .eq('symbol', req.params.symbol.toUpperCase());

        if (error) throw error;
        res.json({ message: 'Takipten çıkarıldı.' });
    } catch (err) {
        res.status(500).json({ error: 'Kaldırılamadı.' });
    }
});

module.exports = router;
