const express = require('express');
const router = express.Router();
const axios = require('axios');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ─── YARDIMCI: HISSE/ETF ANLİK FİYAT ────────────────────
// Birincil: yahoo-finance2  |  Yedek: Finnhub
async function fetchStockQuote(symbol) {
  try {
    const q = await yahooFinance.quote(symbol);
    return {
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent ?? null,
    };
  } catch {
    if (!process.env.FINNHUB_KEY) throw new Error('Fiyat alınamadı.');
    const res = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY}`
    );
    if (!res.data?.c) throw new Error('Fiyat alınamadı.');
    return { symbol, price: res.data.c, change: res.data.dp ?? null };
  }
}

// ─── YARDIMCI: HISSE/ETF GRAFİK VERİSİ ──────────────────
// Birincil: yahoo-finance2 (intraday dahil)  |  Yedek: Finnhub (sadece daily)
async function fetchStockCandles(symbol, period) {
  const now = new Date();

  const periodMap = {
    '1S': { period1: new Date(now - 1 * 60 * 60 * 1000),       interval: '5m'  },
    '1G': { period1: new Date(now - 24 * 60 * 60 * 1000),      interval: '1h'  },
    '1H': { period1: new Date(now - 7 * 24 * 60 * 60 * 1000),  interval: '1d'  },
    '1A': { period1: new Date(now - 30 * 24 * 60 * 60 * 1000), interval: '1d'  },
    '1Y': { period1: new Date(now - 365 * 24 * 60 * 60 * 1000), interval: '1wk' },
  };

  const { period1, interval } = periodMap[period] ?? periodMap['1G'];

  try {
    const result = await yahooFinance.chart(symbol, { period1, period2: now, interval });
    const closes = (result.quotes ?? [])
      .map((q) => q.close)
      .filter((v) => v != null);
    return closes;
  } catch {
    // Finnhub free tier'da candle yok (403) — boş dizi dön, uygulama çökmez
    return [];
  }
}

// ─── HISSE / ETF ANLİK FİYAT ─────────────────────────────
router.get('/stock/:symbol', async (req, res) => {
  try {
    const data = await fetchStockQuote(req.params.symbol.toUpperCase());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Hisse fiyatı alınamadı.' });
  }
});

// ─── HISSE / ETF GRAFİK GEÇMİŞİ ─────────────────────────
router.get('/history/stock/:symbol', async (req, res) => {
  try {
    const closes = await fetchStockCandles(
      req.params.symbol.toUpperCase(),
      req.query.period ?? '1G'
    );
    res.json({ closes });
  } catch (err) {
    res.status(500).json({ error: 'Hisse geçmiş verisi alınamadı.' });
  }
});

// ─── KRİPTO (Binance) — anlık fiyat + 24sa değişim ───────
router.get('/crypto/:symbol', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${req.params.symbol.toUpperCase()}`
    );
    res.json({
      symbol: response.data.symbol,
      price: response.data.lastPrice,
      change: parseFloat(response.data.priceChangePercent),
    });
  } catch {
    res.status(500).json({ error: 'Kripto fiyatı alınamadı.' });
  }
});

// ─── KRİPTO GRAFİK GEÇMİŞİ (Binance Klines) — değişmedi ─
router.get('/history/crypto/:symbol', async (req, res) => {
  const { period = '1G' } = req.query;
  const config = {
    '1S': { interval: '5m',  limit: 12 },
    '1G': { interval: '1h',  limit: 24 },
    '1H': { interval: '1d',  limit: 7  },
    '1A': { interval: '1d',  limit: 30 },
    '1Y': { interval: '1w',  limit: 52 },
  };
  const { interval, limit } = config[period] ?? config['1G'];
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${req.params.symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
    );
    const closes = response.data.map((k) => parseFloat(k[4]));
    res.json({ closes });
  } catch {
    res.status(500).json({ error: 'Kripto geçmiş verisi alınamadı.' });
  }
});

// ─── DÖVİZ ANLİK FİYAT + DEĞİŞİM (Yahoo Finance) ────────
// pair: USDTRY, EURUSD vs. → Yahoo sembolü: USDTRY=X
router.get('/forex/:pair', async (req, res) => {
  try {
    const data = await fetchStockQuote(`${req.params.pair.toUpperCase()}=X`);
    res.json({ pair: req.params.pair.toUpperCase(), price: data.price, change: data.change });
  } catch {
    res.status(500).json({ error: 'Döviz kuru alınamadı.' });
  }
});

// ─── DÖVİZ GRAFİK GEÇMİŞİ (Yahoo Finance) ────────────────
router.get('/history/forex/:pair', async (req, res) => {
  try {
    const closes = await fetchStockCandles(
      `${req.params.pair.toUpperCase()}=X`,
      req.query.period ?? '1G'
    );
    res.json({ closes });
  } catch {
    res.status(500).json({ error: 'Döviz geçmiş verisi alınamadı.' });
  }
});

module.exports = router;
