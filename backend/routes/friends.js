const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');
const { incrementQuest } = require('../helpers/questProgress');
const { notify } = require('../helpers/pushNotifications');
const { getCurrentPrice } = require('../helpers/prices');

const STARTING_BALANCE = 10000;

router.use(authMiddleware);

// ─── ARKADAŞ LİSTESİ ─────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        // Onaylanmış arkadaşlıklar — kullanıcı ya requester ya receiver olabilir
        const { data, error } = await supabase
            .from('friendships')
            .select('id, requester_id, receiver_id, status')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${req.userId},receiver_id.eq.${req.userId}`);

        if (error) throw error;

        // Karşı tarafın id'lerini çıkar
        const friendIds = data.map((f) =>
            f.requester_id === req.userId ? f.receiver_id : f.requester_id
        );

        if (friendIds.length === 0) return res.json({ friends: [] });

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name, email, xp, level')
            .in('id', friendIds);

        if (usersError) throw usersError;

        res.json({ friends: users });
    } catch (err) {
        res.status(500).json({ error: 'Arkadaş listesi alınamadı.' });
    }
});

// ─── BEKLEYEN İSTEKLER ───────────────────────────────────
router.get('/requests', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('friendships')
            .select('id, requester_id, created_at')
            .eq('receiver_id', req.userId)
            .eq('status', 'pending');

        if (error) throw error;

        const requesterIds = data.map((r) => r.requester_id);
        if (requesterIds.length === 0) return res.json({ requests: [] });

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name, email, level')
            .in('id', requesterIds);

        if (usersError) throw usersError;

        const requests = data.map((r) => ({
            friendship_id: r.id,
            created_at: r.created_at,
            user: users.find((u) => u.id === r.requester_id),
        }));

        res.json({ requests });
    } catch (err) {
        res.status(500).json({ error: 'İstekler alınamadı.' });
    }
});

// ─── ARKADAŞLIK İSTEĞİ GÖNDER ────────────────────────────
router.post('/request', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email gereklidir.' });

    try {
        // Hedef kullanıcıyı bul
        const { data: target, error: findError } = await supabase
            .from('users')
            .select('id, name')
            .eq('email', email)
            .single();

        if (findError || !target) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        if (target.id === req.userId) {
            return res.status(400).json({ error: 'Kendinize istek gönderemezsiniz.' });
        }

        // Zaten arkadaş ya da istek var mı?
        const { data: existing } = await supabase
            .from('friendships')
            .select('id, status')
            .or(
                `and(requester_id.eq.${req.userId},receiver_id.eq.${target.id}),and(requester_id.eq.${target.id},receiver_id.eq.${req.userId})`
            );

        if (existing && existing.length > 0) {
            const s = existing[0].status;
            if (s === 'accepted') return res.status(409).json({ error: 'Zaten arkadaşsınız.' });
            if (s === 'pending') return res.status(409).json({ error: 'İstek zaten gönderildi.' });
        }

        const { error } = await supabase
            .from('friendships')
            .insert({ requester_id: req.userId, receiver_id: target.id });

        if (error) throw error;

        const { data: sender } = await supabase.from('users').select('name').eq('id', req.userId).single();
        await notify(target.id, {
            icon: 'person-add-outline',
            type: 'primary',
            text: `${sender?.name || 'Biri'} size arkadaslik istegi gonderdi.`,
            push: {
                title: 'Yeni Arkadaslik Istegi',
                body: `${sender?.name || 'Biri'} sizi arkadas olarak ekledi.`,
            },
        });

        res.status(201).json({ message: `${target.name} adlı kullanıcıya istek gönderildi.` });
    } catch (err) {
        res.status(500).json({ error: 'İstek gönderilemedi.' });
    }
});

// ─── KABUL / RED ─────────────────────────────────────────
router.patch('/respond/:friendshipId', async (req, res) => {
    const { friendshipId } = req.params;
    const { action } = req.body; // 'accept' | 'decline'

    if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: "action 'accept' veya 'decline' olmalıdır." });
    }

    try {
        // İstek bu kullanıcıya mı ait?
        const { data, error } = await supabase
            .from('friendships')
            .select('id, status')
            .eq('id', friendshipId)
            .eq('receiver_id', req.userId)
            .eq('status', 'pending')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Bekleyen istek bulunamadı.' });
        }

        if (action === 'decline') {
            await supabase.from('friendships').delete().eq('id', friendshipId);
            return res.json({ message: 'İstek reddedildi.' });
        }

        const { error: updateError } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);

        if (updateError) throw updateError;

        // Her iki taraf da arkadaş kazandı
        const { data: friendship } = await supabase
            .from('friendships')
            .select('requester_id')
            .eq('id', friendshipId)
            .single();
        if (friendship) incrementQuest(friendship.requester_id, 'friend_add');
        incrementQuest(req.userId, 'friend_add');

        res.json({ message: 'Arkadaşlık kabul edildi.' });
    } catch (err) {
        res.status(500).json({ error: 'İşlem başarısız.' });
    }
});

// ─── LİDERLİK TABLOSU ────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
    try {
        // Kullanıcının arkadaş id'lerini bul
        const { data: friendships } = await supabase
            .from('friendships')
            .select('requester_id, receiver_id')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${req.userId},receiver_id.eq.${req.userId}`);

        const friendIds = (friendships || []).map((f) =>
            f.requester_id === req.userId ? f.receiver_id : f.requester_id
        );

        // Kendisini de ekle
        const ids = [...new Set([req.userId, ...friendIds])];

        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, xp, level, balance')
            .in('id', ids);

        if (error) throw error;

        const { data: holdings } = await supabase
            .from('portfolio')
            .select('user_id, symbol, amount, avg_buy_price')
            .in('user_id', ids);

        const symbols = [...new Set((holdings || []).map((h) => h.symbol))];
        const prices = {};
        for (const sym of symbols) {
            prices[sym] = await getCurrentPrice(sym);
        }

        const portfolioValueByUser = {};
        const costBasisByUser = {};
        for (const h of holdings || []) {
            const price = prices[h.symbol] ?? parseFloat(h.avg_buy_price);
            portfolioValueByUser[h.user_id] =
                (portfolioValueByUser[h.user_id] ?? 0) + parseFloat(h.amount) * price;
            costBasisByUser[h.user_id] =
                (costBasisByUser[h.user_id] ?? 0) + parseFloat(h.amount) * parseFloat(h.avg_buy_price);
        }

        const leaderboard = users
            .map((u) => {
                const netWorth = parseFloat(u.balance) + (portfolioValueByUser[u.id] ?? 0);
                const totalProfit = netWorth - STARTING_BALANCE;
                const currentProfit = (portfolioValueByUser[u.id] ?? 0) - (costBasisByUser[u.id] ?? 0);
                return { ...u, totalProfit, currentProfit, isMe: u.id === req.userId };
            })
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .map((u, index) => ({ ...u, rank: index + 1 }));

        res.json({ leaderboard });
    } catch (err) {
        res.status(500).json({ error: 'Liderlik tablosu alınamadı.' });
    }
});

module.exports = router;
