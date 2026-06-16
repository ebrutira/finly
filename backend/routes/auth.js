const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const supabase = require('../db');
const { incrementQuest, setQuestProgress } = require('../helpers/questProgress');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendVerificationEmail(email, name, otp) {
    console.log(`[OTP] ${email} → ${otp}`);
    if (!resend) return;
    const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Finly <onboarding@resend.dev>',
        to: email,
        subject: 'Finly — E-posta Doğrulama',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#071215;padding:40px;border-radius:16px">
            <h2 style="color:#3A9BAB;margin:0 0 8px">Merhaba ${name}!</h2>
            <p style="color:#B5DDE3;margin:0 0 24px">Finly hesabını doğrulamak için aşağıdaki kodu gir:</p>
            <div style="background:#0E2228;border:1px solid #1A3A40;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#E8F6F8">${otp}</span>
            </div>
            <p style="color:#3A6A72;font-size:12px;margin:0">Bu kod 15 dakika geçerlidir.</p>
          </div>
        `,
    });
    if (error) console.log(`[Resend hata] ${email}: ${error.message} — OTP yukarıda konsola yazıldı.`);
}

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const { data: existing } = await supabase.from('users').select('id').eq('email', email);
        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Bu email zaten kayıtlı.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { data, error } = await supabase
            .from('users')
            .insert({ name, email, password: hashedPassword, email_verified: false })
            .select('id, name, email');
        if (error) throw error;

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await supabase.from('email_verifications').delete().eq('email', email);
        await supabase.from('email_verifications').insert({ email, otp, expires_at: expiresAt });

        await sendVerificationEmail(email, name, otp);

        res.status(201).json({ message: 'Doğrulama kodu e-posta adresinize gönderildi.', email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── VERIFY EMAIL ────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email ve kod gerekli.' });

    try {
        const { data: record, error: recErr } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (recErr || !record) return res.status(400).json({ error: 'Kod hatalı veya süresi dolmuş.' });

        const { data: user, error: updateErr } = await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('email', email)
            .select('*')
            .single();

        if (updateErr) throw updateErr;

        await supabase.from('email_verifications').delete().eq('email', email);

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                xp: user.xp,
                level: user.level,
                streak: user.streak ?? 0,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── RESEND VERIFICATION ────────────────────────────────
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email gerekli.' });

    try {
        const { data: user } = await supabase
            .from('users').select('name, email_verified').eq('email', email).single();

        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        if (user.email_verified) return res.status(400).json({ error: 'Email zaten doğrulanmış.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await supabase.from('email_verifications').delete().eq('email', email);
        await supabase.from('email_verifications').insert({ email, otp, expires_at: expiresAt });
        await sendVerificationEmail(email, user.name, otp);

        res.json({ message: 'Doğrulama kodu tekrar gönderildi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── LOGIN ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.from('users').select('*').eq('email', email);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(401).json({ error: 'Email veya şifre hatalı.' });

        const user = data[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Email veya şifre hatalı.' });

        if (!user.email_verified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await supabase.from('email_verifications').delete().eq('email', email);
            await supabase.from('email_verifications').insert({ email, otp, expires_at: expiresAt });
            await sendVerificationEmail(email, user.name, otp);
            return res.status(403).json({
                error: 'Email adresiniz doğrulanmamış. Yeni kod gönderildi.',
                unverified: true,
                email: user.email,
            });
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        let streak = user.streak || 0;
        if (!user.last_login) {
            streak = 1;
        } else if (user.last_login !== todayStr) {
            const last = new Date(user.last_login + 'T00:00:00Z');
            const today = new Date(todayStr + 'T00:00:00Z');
            const diffDays = Math.round((today - last) / 86400000);
            streak = diffDays === 1 ? streak + 1 : 1;
        }
        if (user.last_login !== todayStr) {
            await supabase.from('users').update({ streak, last_login: todayStr }).eq('id', user.id);
            incrementQuest(user.id, 'daily_login');
            setQuestProgress(user.id, 'streak_3',  streak);
            setQuestProgress(user.id, 'streak_7',  streak);
            setQuestProgress(user.id, 'streak_30', streak);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                xp: user.xp,
                level: user.level,
                streak,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ─── FORGOT PASSWORD ────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email gerekli.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await supabase.from('password_resets').delete().eq('email', email);
    const { error } = await supabase.from('password_resets').insert({ email, otp, expires_at: expiresAt });
    if (error) return res.status(500).json({ error: 'Sunucu hatası.' });

    console.log(`[OTP] Şifre sıfırlama — ${email}: ${otp}`);
    if (resend) {
        const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Finly <onboarding@resend.dev>',
            to: email,
            subject: 'Finly — Şifre Sıfırlama',
            html: `<p>Şifre sıfırlama kodun: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>15 dakika geçerlidir.</p>`,
        });
        if (error) console.log(`[Resend hata] ${error.message}`);
    }

    res.json({ message: 'Kod e-postanıza gönderildi.', ...(process.env.NODE_ENV !== 'production' && { code: otp }) });
});

// ─── RESET PASSWORD ─────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Tüm alanlar gerekli.' });

    const { data, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('email', email)
        .eq('otp', otp)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !data) return res.status(400).json({ error: 'Kod hatalı veya süresi dolmuş.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabase.from('users').update({ password: hashedPassword }).eq('email', email);
    if (updateErr) return res.status(500).json({ error: 'Şifre güncellenemedi.' });

    await supabase.from('password_resets').delete().eq('email', email);
    res.json({ message: 'Şifre başarıyla sıfırlandı.' });
});

// ─── ME ─────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
    const { data, error } = await supabase.from('users').select('id, name, email').eq('id', req.userId);
    if (error) return res.status(500).json({ error: 'Sunucu hatası.' });
    res.json({ user: data[0] });
});

module.exports = router;
