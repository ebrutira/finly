const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');

// Tüm route'lar JWT ile korunuyor
router.use(authMiddleware);

// ─── PORTFÖYÜ GÖR ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = $1',
      [req.userId]
    );
    res.json({ portfolio: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Portföy alınamadı.' });
  }
});

// ─── AL ──────────────────────────────────────────────────
router.post('/buy', async (req, res) => {
  const { symbol, quantity, price } = req.body;
  const total = quantity * price;

  try {
    // Portföyde bu sembol var mı?
    const existing = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      // Varsa miktarı ve ortalama fiyatı güncelle
      const old = existing.rows[0];
      const newAmount = parseFloat(old.amount) + parseFloat(quantity);
      const newAvg = (
        (parseFloat(old.amount) * parseFloat(old.avg_buy_price)) +
        (parseFloat(quantity) * parseFloat(price))
      ) / newAmount;

      await pool.query(
        `UPDATE portfolio SET amount = $1, avg_buy_price = $2
         WHERE user_id = $3 AND symbol = $4`,
        [newAmount, newAvg, req.userId, symbol.toUpperCase()]
      );
    } else {
      // Yoksa yeni kayıt oluştur
      await pool.query(
        `INSERT INTO portfolio (user_id, symbol, amount, avg_buy_price)
         VALUES ($1, $2, $3, $4)`,
        [req.userId, symbol.toUpperCase(), quantity, price]
      );
    }

    // İşlemi trades tablosuna kaydet
    await pool.query(
      `INSERT INTO trades (user_id, symbol, type, quantity, price, total)
       VALUES ($1, $2, 'buy', $3, $4, $5)`,
      [req.userId, symbol.toUpperCase(), quantity, price, total]
    );

    res.json({ message: `${symbol.toUpperCase()} alındı.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Alım işlemi başarısız.' });
  }
});

// ─── SAT ─────────────────────────────────────────────────
router.post('/sell', async (req, res) => {
  const { symbol, quantity, price } = req.body;
  const total = quantity * price;

  try {
    // Portföyde bu sembol var mı?
    const existing = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol.toUpperCase()]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'Bu varlık portföyünde yok.' });
    }

    const old = existing.rows[0];

    // Yeterli miktar var mı?
    if (parseFloat(old.amount) < parseFloat(quantity)) {
      return res.status(400).json({ error: 'Yetersiz miktar.' });
    }

    const newAmount = parseFloat(old.amount) - parseFloat(quantity);

    if (newAmount === 0) {
      // Tamamı satıldıysa portföyden sil
      await pool.query(
        'DELETE FROM portfolio WHERE user_id = $1 AND symbol = $2',
        [req.userId, symbol.toUpperCase()]
      );
    } else {
      // Kalan miktarı güncelle
      await pool.query(
        'UPDATE portfolio SET amount = $1 WHERE user_id = $2 AND symbol = $3',
        [newAmount, req.userId, symbol.toUpperCase()]
      );
    }

    // İşlemi trades tablosuna kaydet
    await pool.query(
      `INSERT INTO trades (user_id, symbol, type, quantity, price, total)
       VALUES ($1, $2, 'sell', $3, $4, $5)`,
      [req.userId, symbol.toUpperCase(), quantity, price, total]
    );

    res.json({ message: `${symbol.toUpperCase()} satıldı.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Satış işlemi başarısız.' });
  }
});

// ─── İŞLEM GEÇMİŞİ ───────────────────────────────────────
router.get('/trades', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ trades: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'İşlem geçmişi alınamadı.' });
  }
});

module.exports = router;
