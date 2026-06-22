const axios = require('axios');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const CRYPTO_SYMS = new Set(['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA']);
const FOREX_SYMS = new Set(['USDTRY', 'EURTRY', 'EURUSD', 'GBPUSD', 'JPYUSD']);

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

module.exports = { getCurrentPrice };
