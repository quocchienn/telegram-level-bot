import User from '../models/User.js';
import config from '../config/config.js';

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getMinuteKey(date = new Date()) {
  return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

async function addWarning(user, ctx) {
  user.warnCount += 1;
  user.lastWarnAt = new Date();

  let actionText = '';
  // Sau 3 lần cảnh cáo thì auto mute
  if (user.warnCount >= 3 && !user.muted) {
    user.muted = true;
    actionText = '\nBạn đã bị mute vì spam. Liên hệ admin nếu cần mở.';
    try {
      if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        await ctx.telegram.restrictChatMember(ctx.chat.id, user.telegramId, {
          can_send_messages: false
        });
      }
    } catch (e) {
      console.log('Mute error in warning:', e.message);
    }
  }

  await user.save();

  try {
    await ctx.reply(
      `⚠️ Cảnh cáo spam (${user.warnCount}/3).` + actionText
    );
  } catch (e) {
    console.log('Warn reply error:', e.message);
  }
}

export default async (ctx, next) => {
  if (!ctx.message) return next();
  const msg = ctx.message;
  const from = msg.from;
  if (!from || from.is_bot) return next();

  const text = msg.text || msg.caption || '';
  if (!text) return next();

  // chỉ tính / check spam trong group / supergroup
  if (!msg.chat || (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup')) {
    return next();
  }

  const now = new Date();
  const trimmed = text.trim();

  let user = await User.findOne({ telegramId: from.id });
  if (!user) {
    user = await User.create({
      telegramId: from.id,
      username: from.username || ''
    });
  }

  if (user.banned) return next();

  // ========== Anti-spam ==========

  // 1) lặp y chang tin trước trong 3s
  if (user.lastMessageText === trimmed && user.lastMessageAt) {
    const diffSec = (now - user.lastMessageAt) / 1000;
    if (diffSec <= 3) {
      await addWarning(user, ctx);
      user.lastMessageAt = now;
      await user.save();
      return next();
    }
  }

  // 2) flood: quá nhiều tin trong khoảng thời gian ngắn
  const windowSec = config.spam.windowSeconds || 10;
  const maxMsgs = config.spam.maxMsgsPerWindow || 7;

  if (!user.spamWindowStart) {
    user.spamWindowStart = now;
    user.spamCount = 1;
  } else {
    const diffSec = (now - user.spamWindowStart) / 1000;
    if (diffSec <= windowSec) {
      user.spamCount += 1;
    } else {
      // reset window
      user.spamWindowStart = now;
      user.spamCount = 1;
    }
  }

  if (user.spamCount > maxMsgs) {
    await addWarning(user, ctx);
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  // nếu đã bị mute thì không cộng XP
  if (user.muted) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  // ========== Cộng XP với giới hạn phút/ngày ==========

  // Tin quá ngắn hoặc không có chữ/số thì không tính XP
  if (trimmed.length < 5 || !/[a-zA-Z0-9À-ỹ]/.test(trimmed)) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  const dayKey = getDayKey(now);
  const minuteKey = getMinuteKey(now);

  // reset dayXP nếu sang ngày mới
  if (user.dayKey !== dayKey) {
    user.dayKey = dayKey;
    user.dayXP = 0;
  }

  // reset minuteXP nếu sang phút mới
  if (user.minuteKey !== minuteKey) {
    user.minuteKey = minuteKey;
    user.minuteXP = 0;
  }

  const minuteLimit = config.xp.minuteLimit || 5;
  const dailyLimit = config.xp.dailyLimit || 100;

  // nếu đã đạt giới hạn thì không cộng
  if (user.minuteXP >= minuteLimit || user.dayXP >= dailyLimit) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  // điểm mỗi tin
  let gain = trimmed.length > 50 ? 2 : 1;

  // đảm bảo không vượt quá giới hạn phút/ngày khi cộng
  const possibleMinute = Math.max(0, minuteLimit - user.minuteXP);
  const possibleDay = Math.max(0, dailyLimit - user.dayXP);
  const canGain = Math.min(gain, possibleMinute, possibleDay);
  if (canGain <= 0) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  user.totalXP += canGain;
  user.dayXP += canGain;
  user.weekXP += canGain;
  user.monthXP += canGain;
  user.minuteXP += canGain;

  user.lastMessageText = trimmed;
  user.lastMessageAt = now;

  await user.save();
  return next();
};
