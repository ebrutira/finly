const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');
const { incrementQuest, setQuestProgress } = require('../helpers/questProgress');
const { updatePeakProfit } = require('../helpers/prices');

router.use(authMiddleware);

// ─── PORTFÖYÜ GÖR ────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', req.userId);

        if (error) throw error;

        const { data: userData } = await supabase
            .from('users').select('peak_profit').eq('id', req.userId).single();

        res.json({ portfolio: data, peakProfit: parseFloat(userData?.peak_profit ?? 0) });
    } catch (err) {
        res.status(500).json({ error: 'Portföy alınamadı.' });
    }
});

// ─── AL ──────────────────────────────────────────────────
router.post('/buy', async (req, res) => {
    const { symbol, quantity, price } = req.body;
    const total = parseFloat(quantity) * parseFloat(price);
    const sym = symbol.toUpperCase();

    try {
        // Kullanıcının mevcut bakiyesini ve XP'sini çek
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance, xp, level')
            .eq('id', req.userId)
            .single();

        if (userError) throw userError;

        if (parseFloat(userData.balance) < total) {
            return res.status(400).json({ error: 'Yetersiz bakiye.' });
        }

        // Portföyde bu varlık var mı?
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

        // İşlem kaydı
        const { error: tradeError } = await supabase
            .from('trades')
            .insert({ user_id: req.userId, symbol: sym, type: 'buy', quantity, price, total });

        if (tradeError) throw tradeError;

        // Bakiyeyi düş, XP ekle
        const newXp = userData.xp + 10;
        const newLevel = Math.floor(newXp / 100) + 1;
        const newBalance = parseFloat(userData.balance) - total;

        await supabase
            .from('users')
            .update({ balance: newBalance, xp: newXp, level: newLevel })
            .eq('id', req.userId);

        // Portföydeki farklı varlık sayısını çek → five_assets görevi için
        const { data: allAssets } = await supabase
            .from('portfolio')
            .select('symbol')
            .eq('user_id', req.userId);

        const assetCount = allAssets ? allAssets.length : 0;

        // Görev ilerlemesi
        const CRYPTO_SYMS = new Set(['BTC','ETH','XRP','SOL','BNB','ADA']);
        const ETF_SYMS    = new Set(['SPY','QQQ','VTI','IVV']);
        const FOREX_SYMS  = new Set(['USDTRY','EURTRY','EURUSD','GBPUSD','JPYUSD']);

        incrementQuest(req.userId, 'first_buy');
        incrementQuest(req.userId, 'ten_trades');
        incrementQuest(req.userId, 'daily_trade');
        incrementQuest(req.userId, 'buy_10');
        incrementQuest(req.userId, 'buy_50');
        incrementQuest(req.userId, 'buy_100');
        setQuestProgress(req.userId, 'five_assets',   assetCount);
        setQuestProgress(req.userId, 'portfolio_10',  assetCount);
        setQuestProgress(req.userId, 'portfolio_20',  assetCount);
        if (CRYPTO_SYMS.has(sym)) incrementQuest(req.userId, 'crypto_buy');
        if (ETF_SYMS.has(sym))    incrementQuest(req.userId, 'etf_buy');
        if (FOREX_SYMS.has(sym))  incrementQuest(req.userId, 'forex_buy');

        updatePeakProfit(req.userId);

        res.json({
            message: `${sym} alındı.`,
            balance: newBalance,
            xp: newXp,
            level: newLevel,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Alım işlemi başarısız.' });
    }
});

// ─── SAT ─────────────────────────────────────────────────
router.post('/sell', async (req, res) => {
    const { symbol, quantity, price } = req.body;
    const total = parseFloat(quantity) * parseFloat(price);
    const sym = symbol.toUpperCase();

    try {
        // Portföyde var mı?
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

        // İşlem kaydı
        const { error: tradeError } = await supabase
            .from('trades')
            .insert({ user_id: req.userId, symbol: sym, type: 'sell', quantity, price, total });

        if (tradeError) throw tradeError;

        // Kullanıcının XP ve bakiyesini güncelle
        const { data: userData } = await supabase
            .from('users')
            .select('balance, xp')
            .eq('id', req.userId)
            .single();

        const newXp = userData.xp + 5;
        const newLevel = Math.floor(newXp / 100) + 1;
        const newBalance = parseFloat(userData.balance) + total;

        await supabase
            .from('users')
            .update({ balance: newBalance, xp: newXp, level: newLevel })
            .eq('id', req.userId);

        incrementQuest(req.userId, 'ten_trades');
        incrementQuest(req.userId, 'daily_trade');
        incrementQuest(req.userId, 'first_sell');

        // Kârlı satış kontrolü
        if (parseFloat(price) > parseFloat(old.avg_buy_price)) {
            incrementQuest(req.userId, 'profit_trade');
            incrementQuest(req.userId, 'profit_5');
            incrementQuest(req.userId, 'profit_10');
        }

        updatePeakProfit(req.userId);

        res.json({
            message: `${sym} satıldı.`,
            balance: newBalance,
            xp: newXp,
            level: newLevel,
        });

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

// ─── PORTFÖY DEĞERİ GEÇMİŞİ ──────────────────────────────
router.get('/history', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('portfolio_snapshots')
            .select('snapshot_date, total_value')
            .eq('user_id', req.userId)
            .order('snapshot_date', { ascending: true });

        if (error) throw error;
        res.json({ history: data });
    } catch (err) {
        res.status(500).json({ error: 'Portföy geçmişi alınamadı.' });
    }
});

module.exports = router;
