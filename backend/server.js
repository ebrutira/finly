const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const marketRoutes = require('./routes/market');
app.use('/market', marketRoutes);

const portfolioRoutes = require('./routes/portfolio');
app.use('/portfolio', portfolioRoutes);

const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);

const friendsRoutes = require('./routes/friends');
app.use('/friends', friendsRoutes);

const questsRoutes = require('./routes/quests');
app.use('/quests', questsRoutes);

const notificationsRoutes = require('./routes/notifications');
app.use('/notifications', notificationsRoutes);

const watchlistRoutes = require('./routes/watchlist');
app.use('/watchlist', watchlistRoutes);

const supportRoutes = require('./routes/support');
app.use('/support', supportRoutes);

// Test endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Finly backend çalışıyor!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});

// ─── ZAMANLANMIŞ BİLDİRİMLER ─────────────────────────────
const supabase = require('./db');
const { sendPush, notify } = require('./helpers/pushNotifications');
const yahooFinance = require('yahoo-finance2').default;

// Gunluk hatirlat — 17:00 UTC = 20:00 Istanbul
cron.schedule('0 17 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: users } = await supabase
        .from('users').select('id, push_token, last_login').not('push_token', 'is', null);
    for (const u of users || []) {
        if (!u.last_login || u.last_login.toString().split('T')[0] !== today) {
            await sendPush(u.id, {
                title: 'Finly',
                body: 'Bugun giris yapmadiniz! Gunluk gorevlerinizi tamamlayin.',
            });
        }
    }
});

// Streak hatirlat — 18:00 UTC = 21:00 Istanbul
cron.schedule('0 18 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: users } = await supabase
        .from('users').select('id, push_token, last_login, streak')
        .not('push_token', 'is', null).gt('streak', 0);
    for (const u of users || []) {
        if (!u.last_login || u.last_login.toString().split('T')[0] !== today) {
            await sendPush(u.id, {
                title: 'Streak Tehlikede!',
                body: `${u.streak} gunluk serinizi kaybetmemek icin giris yapin.`,
            });
        }
    }
});

// Fiyat alarmi — her 2 saatte bir, hafta ici
cron.schedule('0 */2 * * 1-5', async () => {
    const { data: holdings } = await supabase
        .from('portfolio').select('user_id, symbol, avg_buy_price');
    if (!holdings?.length) return;

    const userIds = [...new Set(holdings.map((h) => h.user_id))];
    const { data: users } = await supabase
        .from('users').select('id, push_token').in('id', userIds).not('push_token', 'is', null);
    const tokenMap = Object.fromEntries((users || []).map((u) => [u.id, u.push_token]));

    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    const prices = {};
    for (const sym of symbols) {
        try {
            const q = await yahooFinance.quote(sym);
            prices[sym] = q.regularMarketPrice;
        } catch {}
    }

    const today = new Date().toISOString().split('T')[0];
    for (const h of holdings) {
        if (!tokenMap[h.user_id] || !prices[h.symbol]) continue;
        const pct = ((prices[h.symbol] - h.avg_buy_price) / h.avg_buy_price) * 100;
        if (Math.abs(pct) < 7) continue;

        const { data: existing } = await supabase
            .from('notifications').select('id').eq('user_id', h.user_id)
            .gte('created_at', `${today}T00:00:00`).like('text', `%${h.symbol}%`).limit(1);
        if (existing?.length) continue;

        const up = pct > 0;
        await notify(h.user_id, {
            icon: up ? 'trending-up-outline' : 'trending-down-outline',
            type: up ? 'success' : 'danger',
            text: `${h.symbol} %${Math.abs(pct).toFixed(1)} ${up ? 'yukseldi' : 'dustu'}.`,
            push: {
                title: `${h.symbol} ${up ? 'Yukseliyor' : 'Dusuyor'}!`,
                body: `${h.symbol} aliminizdan bu yana %${Math.abs(pct).toFixed(1)} ${up ? 'yukseldi' : 'dustu'}.`,
            },
        });
    }
});