const express = require('express');
const router = express.Router();
const axios = require('axios');

// ─── KRİPTO (Binance) ────────────────────────────────────
router.get('/crypto/:symbol', async (req, res) => {
  const { symbol } = req.params; // örnek: BTCUSDT

  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Kripto fiyatı alınamadı.' });
  }
});

// ─── HİSSE SENEDİ (Alpha Vantage) ────────────────────────
router.get('/stock/:symbol', async (req, res) => {
  const { symbol } = req.params; // örnek: AAPL

  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${process.env.ALPHA_VANTAGE_KEY}`
    );

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      return res.status(404).json({ error: 'Hisse bulunamadı.' });
    }

    res.json({
      symbol: quote['01. symbol'],
      price: quote['05. price'],
      change: quote['09. % change'],
    });
  } catch (err) {
    res.status(500).json({ error: 'Hisse fiyatı alınamadı.' });
  }
});

// ─── DÖVİZ (ExchangeRate) ─────────────────────────────────
router.get('/currency/:from/:to', async (req, res) => {
  const { from, to } = req.params; // örnek: USD/TRY

  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_KEY}/pair/${from.toUpperCase()}/${to.toUpperCase()}`
    );

    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: response.data.conversion_rate,
    });
  } catch (err) {
    res.status(500).json({ error: 'Döviz kuru alınamadı.' });
  }
});

// ─── TARİHSEL VERİ — KRİPTO (Binance Klines) ────────────
// period: '1S'=1saat, '1G'=1gün, '1H'=1hafta, '1A'=1ay, '1Y'=1yıl
router.get('/history/crypto/:symbol', async (req, res) => {
  const { symbol } = req.params;
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
      `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
    );

    // Binance kline: [openTime, open, high, low, close, volume, ...]
    const closes = response.data.map((k) => parseFloat(k[4]));
    res.json({ closes });
  } catch (err) {
    res.status(500).json({ error: 'Kripto geçmiş verisi alınamadı.' });
  }
});

// ─── TARİHSEL VERİ — HİSSE (Alpha Vantage) ──────────────
router.get('/history/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { period = '1G' } = req.query;

  // Alpha Vantage free tier: TIME_SERIES_DAILY (günlük, son 100 gün)
  // Tüm periyotlar için DAILY kullanıp dilim alıyoruz (intraday premium gerektirir)
  const sliceMap = { '1S': 5, '1G': 5, '1H': 7, '1A': 30, '1Y': 52 };
  const slice = sliceMap[period] ?? 7;

  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol.toUpperCase()}&outputsize=compact&apikey=${process.env.ALPHA_VANTAGE_KEY}`
    );

    const series = response.data['Time Series (Daily)'];
    if (!series) return res.status(404).json({ error: 'Veri bulunamadı.' });

    const closes = Object.values(series)
      .slice(0, slice)
      .reverse()
      .map((day) => parseFloat(day['4. close']));

    res.json({ closes });
  } catch (err) {
    res.status(500).json({ error: 'Hisse geçmiş verisi alınamadı.' });
  }
});

module.exports = router;
