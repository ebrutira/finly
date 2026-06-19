const { Expo } = require('expo-server-sdk');
const supabase = require('../db');

const expo = new Expo();

async function sendPush(userId, { title, body }) {
  try {
    const { data: user } = await supabase
      .from('users').select('push_token').eq('id', userId).single();
    const token = user?.push_token;
    if (!token || !Expo.isExpoPushToken(token)) return;
    await expo.sendPushNotificationsAsync([{ to: token, sound: 'default', title, body }]);
  } catch (e) {
    console.error('Push error:', e.message);
  }
}

async function notify(userId, { icon = 'notifications-outline', type = 'primary', text, push }) {
  try {
    await supabase.from('notifications').insert({ user_id: userId, icon, type, text });
  } catch {}
  if (push) await sendPush(userId, push);
}

module.exports = { sendPush, notify };
