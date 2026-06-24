const axios = require('axios');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const supabase = require('../db');

const CRYPTO_SYMS = new Set(['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA']);
const FOREX_SYMS = new Set(['USDTRY', 'EURTRY', 'EURUSD', 'GBPUSD', 'JPYUSD']);
const STARTING_BALANCE = 10000;

// Sembol tipine göre anlık fiyat çeker (kripto → Binance, döviz/hisse/ETF → Yahoo Finance)
async function getCurrentPrice(symbol) {
    try {
        if (CRYPTO_SYMS.has(symbol)) {
            const res = await axios.get(
                `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
            );
            return parseFloat(res.data.price);
        }
        if (FOREX_SYMS.has(symbol)) {
            const q = await yahooFinance.quote(`${symbol}=X`);
            return q.regularMarketPrice ?? null;
        }
        const q = await yahooFinance.quote(symbol);
        return q.regularMarketPrice ?? null;
    } catch {
        return null;
    }
}

// Kullanıcının toplam hesap kârını (nakit + portföy değeri - başlangıç bakiyesi) hesaplar,
// tüm zamanların en yükseğini geçtiyse peak_profit'i günceller
async function updatePeakProfit(userId) {
    try {
        const { data: user } = await supabase
            .from('users').select('balance, peak_profit').eq('id', userId).single();
        if (!user) return;

        const { data: holdings } = await supabase
            .from('portfolio').select('symbol, amount, avg_buy_price').eq('user_id', userId);

        let portfolioValue = 0;
        for (const h of holdings || []) {
            const price = (await getCurrentPrice(h.symbol)) ?? parseFloat(h.avg_buy_price);
            portfolioValue += parseFloat(h.amount) * price;
        }

        const currentTotalProfit = parseFloat(user.balance) + portfolioValue - STARTING_BALANCE;
        if (currentTotalProfit > parseFloat(user.peak_profit ?? 0)) {
            await supabase.from('users').update({ peak_profit: currentTotalProfit }).eq('id', userId);
        }
    } catch (err) {
        console.error('updatePeakProfit error:', err);
    }
}

module.exports = { getCurrentPrice, updatePeakProfit };
