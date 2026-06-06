const supabase = require('../db');

async function incrementQuest(userId, questKey, increment = 1) {
    try {
        const { data: def } = await supabase
            .from('quest_definitions')
            .select('id, total, xp_reward, name')
            .eq('key', questKey)
            .single();

        if (!def) return;

        const { data: existing } = await supabase
            .from('user_quests')
            .select('*')
            .eq('user_id', userId)
            .eq('quest_id', def.id)
            .single();

        if (existing?.completed_at) {
            if (questKey === 'daily_trade') {
                const completedDay = new Date(existing.completed_at).toDateString();
                const today = new Date().toDateString();
                if (completedDay === today) return; // Bugün zaten yapıldı
                // Önceki günden: sıfırla ve devam et
                await supabase.from('user_quests').upsert(
                    { user_id: userId, quest_id: def.id, progress: 0, completed_at: null },
                    { onConflict: 'user_id,quest_id' }
                );
            } else {
                return; // Kalıcı görev: zaten tamamlandı
            }
        }

        const currentProgress = existing?.completed_at ? 0 : (existing?.progress ?? 0);
        const newProgress = Math.min(currentProgress + increment, def.total);
        const justCompleted = newProgress >= def.total;

        await supabase.from('user_quests').upsert(
            {
                user_id: userId,
                quest_id: def.id,
                progress: newProgress,
                completed_at: justCompleted ? new Date().toISOString() : null,
            },
            { onConflict: 'user_id,quest_id' }
        );

        if (justCompleted) {
            const { data: userData } = await supabase
                .from('users')
                .select('xp')
                .eq('id', userId)
                .single();

            const newXp = userData.xp + def.xp_reward;
            const newLevel = Math.floor(newXp / 100) + 1;

            await supabase
                .from('users')
                .update({ xp: newXp, level: newLevel })
                .eq('id', userId);

            await supabase.from('notifications').insert({
                user_id: userId,
                icon: 'trophy-outline',
                type: 'success',
                text: `Görev tamamlandı! "${def.name}" — +${def.xp_reward} XP kazandın.`,
            });
        }
    } catch (err) {
        console.error('incrementQuest error:', err);
    }
}

// İlerlemeyi artırmak yerine belirli bir değere set eder (örn: varlık sayısı)
async function setQuestProgress(userId, questKey, value) {
    try {
        const { data: def } = await supabase
            .from('quest_definitions')
            .select('id, total, xp_reward, name')
            .eq('key', questKey)
            .single();

        if (!def) return;

        const { data: existing } = await supabase
            .from('user_quests')
            .select('*')
            .eq('user_id', userId)
            .eq('quest_id', def.id)
            .single();

        if (existing?.completed_at) return;

        const newProgress = Math.min(value, def.total);
        const justCompleted = newProgress >= def.total;

        await supabase.from('user_quests').upsert(
            {
                user_id: userId,
                quest_id: def.id,
                progress: newProgress,
                completed_at: justCompleted ? new Date().toISOString() : null,
            },
            { onConflict: 'user_id,quest_id' }
        );

        if (justCompleted) {
            const { data: userData } = await supabase
                .from('users')
                .select('xp')
                .eq('id', userId)
                .single();

            const newXp = userData.xp + def.xp_reward;
            const newLevel = Math.floor(newXp / 100) + 1;

            await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('id', userId);

            await supabase.from('notifications').insert({
                user_id: userId,
                icon: 'trophy-outline',
                type: 'success',
                text: `Görev tamamlandı! "${def.name}" — +${def.xp_reward} XP kazandın.`,
            });
        }
    } catch (err) {
        console.error('setQuestProgress error:', err);
    }
}

module.exports = { incrementQuest, setQuestProgress };
