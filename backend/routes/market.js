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

module.exports = router;
