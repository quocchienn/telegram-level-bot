// utils/xp.js
import User from '../models/User.js';
import config from '../config/config.js';

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getMinuteKey(date = new Date()) {
  return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

// Tính level theo công thức: Level = floor( sqrt(XP / 5) )
function calcLevel(xp) {
  const lv = Math.floor(Math.sqrt(xp / 5));
  return lv < 1 ? 1 : lv;
}

// Thêm cảnh cáo spam, đủ 3 lần thì auto mute
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
      `⚠️ Cảnh cáo spam (${user.warnCount}/3).` + actionText,
      { reply_to_message_id: ctx.message?.message_id }
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

  // Chỉ xử lý trong group / supergroup
  if (!msg.chat || (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup')) {
    return next();
  }

  const now = new Date();
  const trimmed = text.trim();

  // Lấy hoặc tạo user trong DB
  let user = await User.findOne({ telegramId: from.id });
  if (!user) {
    user = await User.create({
      telegramId: from.id,
      username: from.username || ''
    });
  }

  if (user.banned) return next();

  // ========== ANTI-SPAM ==========

  // 1) Lặp y chang tin trước trong 3 giây => cảnh cáo
  if (user.lastMessageText === trimmed && user.lastMessageAt) {
    const diffSec = (now - user.lastMessageAt) / 1000;
    if (diffSec <= 3) {
      await addWarning(user, ctx);
      user.lastMessageAt = now;
      await user.save();
      return next();
    }
  }

  // 2) Flood: quá nhiều tin trong khoảng thời gian ngắn
  const windowSec = config.spam?.windowSeconds || 10;
  const maxMsgs = config.spam?.maxMsgsPerWindow || 7;

  if (!user.spamWindowStart) {
    user.spamWindowStart = now;
    user.spamCount = 1;
  } else {
    const diffSec = (now - user.spamWindowStart) / 1000;
    if (diffSec <= windowSec) {
      user.spamCount += 1;
    } else {
      // Reset cửa sổ đếm spam
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

  // Nếu đã bị mute → không cộng XP nữa
  if (user.muted) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  // ========== CỘNG XP VỚI GIỚI HẠN PHÚT / NGÀY ==========

  // Tin quá ngắn hoặc không có chữ/số → không tính XP
  if (trimmed.length < 5 || !/[a-zA-Z0-9À-ỹ]/.test(trimmed)) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  const dayKey = getDayKey(now);
  const minuteKey = getMinuteKey(now);

  // Reset dayXP nếu sang ngày mới
  if (user.dayKey !== dayKey) {
    user.dayKey = dayKey;
    user.dayXP = 0;
  }

  // Reset minuteXP nếu sang phút mới
  if (user.minuteKey !== minuteKey) {
    user.minuteKey = minuteKey;
    user.minuteXP = 0;
  }

  const minuteLimit = config.xp?.minuteLimit ?? 5;
  const dailyLimit = config.xp?.dailyLimit ?? 100;

  // Nếu đã full limit thì không cộng nữa
  if (user.minuteXP >= minuteLimit || user.dayXP >= dailyLimit) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  // XP mỗi tin
  let gain = trimmed.length > 50 ? 2 : 1;

  // Không cho vượt quá limit
  const possibleMinute = Math.max(0, minuteLimit - user.minuteXP);
  const possibleDay = Math.max(0, dailyLimit - user.dayXP);
  const canGain = Math.min(gain, possibleMinute, possibleDay);

  if (canGain <= 0) {
    user.lastMessageText = trimmed;
    user.lastMessageAt = now;
    await user.save();
    return next();
  }

  // ===== Trước khi cộng XP: lưu lại level cũ =====
  const oldTotalXP = user.totalXP;
  const oldLevel = calcLevel(oldTotalXP);

  // Cộng XP
  user.totalXP += canGain;
  user.dayXP += canGain;
  user.weekXP += canGain;
  user.monthXP += canGain;
  user.minuteXP += canGain;

  user.lastMessageText = trimmed;
  user.lastMessageAt = now;

  // ===== Sau khi cộng: check lên level & thưởng coin =====
  const newLevel = calcLevel(user.totalXP);

  if (newLevel > oldLevel) {
    const levelUp = newLevel - oldLevel;

    // Kiểu B: thưởng coin mỗi level
    const coinPerLevel = 2;
    let totalBonus = levelUp * coinPerLevel;

    // Kiểu A: thưởng mốc level
    const milestoneRewards = {
      5: 20,
      10: 40,
      20: 60,
      30: 80,
      40: 100,
      50: 150,
      75: 200,
      100: 300
    };

    if (milestoneRewards[newLevel]) {
      totalBonus += milestoneRewards[newLevel];
    }

    user.topCoin += totalBonus;

    // Thông báo lên level
    try {
      await ctx.reply(
        `🎉 Bạn đã lên Level ${newLevel}!\n` +
        `+${levelUp * coinPerLevel} coin (thưởng lên level)\n` +
        (milestoneRewards[newLevel]
          ? `+${milestoneRewards[newLevel]} coin (mốc Level ${newLevel})`
          : ''),
        { reply_to_message_id: ctx.message?.message_id }
      );
    } catch (e) {
      console.log('Level up reply error:', e.message);
    }
  }

  await user.save();
  return next();
};
