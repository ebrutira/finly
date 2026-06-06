const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── GÖREV LİSTESİ ───────────────────────────────────────
// Tanımlı tüm görevleri kullanıcının ilerleme durumu ile birlikte döner.
// user_quests kaydı yoksa progress=0 / tamamlanmamış kabul edilir.
router.get('/', async (req, res) => {
    try {
        const { data: definitions, error: defError } = await supabase
            .from('quest_definitions')
            .select('*')
            .order('id');

        if (defError) throw defError;

        const { data: userQuests, error: uqError } = await supabase
            .from('user_quests')
            .select('*')
            .eq('user_id', req.userId);

        if (uqError) throw uqError;

        const quests = definitions.map((def) => {
            const uq = userQuests.find((q) => q.quest_id === def.id);
            return {
                id: def.id,
                key: def.key,
                name: def.name,
                description: def.description,
                icon: def.icon,
                total: def.total,
                xp_reward: def.xp_reward,
                progress: uq ? uq.progress : 0,
                done: uq ? !!uq.completed_at : false,
                completed_at: uq?.completed_at ?? null,
            };
        });

        res.json({ quests });
    } catch (err) {
        res.status(500).json({ error: 'Görevler alınamadı.' });
    }
});

// ─── GÖREV İLERLEMESİ GÜNCELLE (dahili yardımcı) ────────
// Bu fonksiyon portfolio route'larından çağrılmak yerine
// burada bir endpoint olarak tutuluyor. Gerekirse internal middleware'e taşınabilir.
router.post('/progress', async (req, res) => {
    const { quest_key, increment = 1 } = req.body;

    if (!quest_key) return res.status(400).json({ error: 'quest_key gereklidir.' });

    try {
        const { data: def, error: defError } = await supabase
            .from('quest_definitions')
            .select('*')
            .eq('key', quest_key)
            .single();

        if (defError || !def) return res.status(404).json({ error: 'Görev bulunamadı.' });

        // Mevcut user_quest kaydını bul veya oluştur
        const { data: existing } = await supabase
            .from('user_quests')
            .select('*')
            .eq('user_id', req.userId)
            .eq('quest_id', def.id)
            .single();

        if (existing?.completed_at) {
            return res.json({ message: 'Görev zaten tamamlandı.', already_done: true });
        }

        const currentProgress = existing ? existing.progress : 0;
        const newProgress = Math.min(currentProgress + increment, def.total);
        const justCompleted = newProgress >= def.total && !existing?.completed_at;

        const upsertData = {
            user_id: req.userId,
            quest_id: def.id,
            progress: newProgress,
            completed_at: justCompleted ? new Date().toISOString() : (existing?.completed_at ?? null),
        };

        const { error: upsertError } = await supabase
            .from('user_quests')
            .upsert(upsertData, { onConflict: 'user_id,quest_id' });

        if (upsertError) throw upsertError;

        // Tamamlandıysa XP ver ve bildirim oluştur
        if (justCompleted) {
            const { data: userData } = await supabase
                .from('users')
                .select('xp')
                .eq('id', req.userId)
                .single();

            const newXp = userData.xp + def.xp_reward;
            const newLevel = Math.floor(newXp / 100) + 1;

            await supabase
                .from('users')
                .update({ xp: newXp, level: newLevel })
                .eq('id', req.userId);

            await supabase.from('notifications').insert({
                user_id: req.userId,
                icon: 'trophy-outline',
                type: 'success',
                text: `Görev tamamlandı! "${def.name}" — +${def.xp_reward} XP kazandın.`,
            });

            return res.json({
                message: 'Görev tamamlandı!',
                xp_earned: def.xp_reward,
                new_xp: newXp,
                new_level: newLevel,
            });
        }

        res.json({ message: 'İlerleme güncellendi.', progress: newProgress, total: def.total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'İlerleme güncellenemedi.' });
    }
});

module.exports = router;
