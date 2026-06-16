const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/ticket', async (req, res) => {
    const { topic, message } = req.body;

    if (!topic || !message || message.trim().length < 10) {
        return res.status(400).json({ error: 'Konu ve en az 10 karakterli mesaj gerekli.' });
    }

    const { error } = await supabase
        .from('support_tickets')
        .insert({
            user_id: req.userId,
            topic: topic.trim(),
            message: message.trim(),
        });

    if (error) return res.status(500).json({ error: 'Talep oluşturulamadı.' });

    res.json({ message: 'Talebiniz alındı. En kısa sürede dönüş yapacağız.' });
});

module.exports = router;
