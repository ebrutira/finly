const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── PORTFÖYÜ GÖR ────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json({ portfolio: data });
    } catch (err) {
        res.status(500).json({ error: 'Portföy alınamadı.' });
    }
});

// ─── AL ──────────────────────────────────────────────────
router.post('/buy', async (req, res) => {
    const { symbol, quantity, price } = req.body;
    const total = quantity * price;
    const sym = symbol.toUpperCase();

    try {
        const { data: existing } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', req.userId)
            .eq('symbol', sym);

        if (existing && existing.length > 0) {
            const old = existing[0];
            const newAmount = parseFloat(old.amount) + parseFloat(quantity);
            const newAvg = (
                (parseFloat(old.amount) * parseFloat(old.avg_buy_price)) +
                (parseFloat(quantity) * parseFloat(price))
            ) / newAmount;

            const { error } = await supabase
                .from('portfolio')
                .update({ amount: newAmount, avg_buy_price: newAvg })
                .eq('user_id', req.userId)
                .eq('symbol', sym);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('portfolio')
                .insert({ user_id: req.userId, symbol: sym, amount: quantity, avg_buy_price: price });

            if (error) throw error;
        }

        const { error: tradeError } = await supabase
            .from('trades')
            .insert({ user_id: req.userId, symbol: sym, type: 'buy', quantity, price, total });

        if (tradeError) throw tradeError;

        res.json({ message: `${sym} alındı.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Alım işlemi başarısız.' });
    }
});

// ─── SAT ─────────────────────────────────────────────────
router.post('/sell', async (req, res) => {
    const { symbol, quantity, price } = req.body;
    const total = quantity * price;
    const sym = symbol.toUpperCase();

    try {
        const { data: existing } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', req.userId)
            .eq('symbol', sym);

        if (!existing || existing.length === 0) {
            return res.status(400).json({ error: 'Bu varlık portföyünde yok.' });
        }

        const old = existing[0];

        if (parseFloat(old.amount) < parseFloat(quantity)) {
            return res.status(400).json({ error: 'Yetersiz miktar.' });
        }

        const newAmount = parseFloat(old.amount) - parseFloat(quantity);

        if (newAmount === 0) {
            const { error } = await supabase
                .from('portfolio')
                .delete()
                .eq('user_id', req.userId)
                .eq('symbol', sym);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('portfolio')
                .update({ amount: newAmount })
                .eq('user_id', req.userId)
                .eq('symbol', sym);

            if (error) throw error;
        }

        const { error: tradeError } = await supabase
            .from('trades')
            .insert({ user_id: req.userId, symbol: sym, type: 'sell', quantity, price, total });

        if (tradeError) throw tradeError;

        res.json({ message: `${sym} satıldı.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Satış işlemi başarısız.' });
    }
});

// ─── İŞLEM GEÇMİŞİ ───────────────────────────────────────
router.get('/trades', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ trades: data });
    } catch (err) {
        res.status(500).json({ error: 'İşlem geçmişi alınamadı.' });
    }
});

module.exports = router;
