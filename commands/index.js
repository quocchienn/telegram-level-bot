// commands/index.js
import User from '../models/User.js';
import Reward from '../models/Reward.js';
import config from '../config/config.js';
import { calcLevel } from '../utils/xp.js';

// ✅ ADMIN MẶC ĐỊNH – TELEGRAM ID CỦA BẠN
const DEFAULT_ADMINS = [
  5589888565 // sửa nếu ID bạn khác
];

// helper: key ngày YYYY-MM-DD
function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// helper: tìm user theo ID hoặc @username
async function findUserByArg(arg) {
  if (!arg) return null;

  // Nếu là ID
  if (/^\d+$/.test(arg)) {
    return await User.findOne({ telegramId: Number(arg) });
  }

  // Nếu là @username
  if (arg.startsWith('@')) {
    return await User.findOne({ username: arg.slice(1) });
  }

  return null;
}

// helper: check admin trong bot
async function isAdmin(userId) {
  // nếu là ID mặc định → auto admin
  if (DEFAULT_ADMINS.includes(userId)) return true;

  const u = await User.findOne({ telegramId: userId });
  return u && u.role === 'admin';
}

export default (bot) => {
  // /start
  bot.start(async (ctx) => {
    await ctx.reply(
      'Xin chào! Đây là bot level / điểm / top / shop.\n' +
      '• /me – xem level, XP, coin\n' +
      '• /top, /topweek, /topmonth – top 10\n' +
      '• /top_full, /topweek_full, /topmonth_full – top 50\n' +
      '• /shop – xem vật phẩm\n' +
      '• /buy <id> – đổi coin lấy quà\n' +
      '• /daily – điểm danh nhận XP + coin\n' +
      '• /claimdaily – nhận thưởng nếu chat đủ XP trong ngày',
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /me – info user
    // /me – info user
  bot.command('me', async (ctx) => {
    let u = await User.findOne({ telegramId: ctx.from.id });
    if (!u) {
      return ctx.reply(
        'Bạn chưa có dữ liệu, hãy chat trong group trước.',
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    const level = calcLevel(u.totalXP || 0);
    const nextLevel = level + 1;
    const xpNextLevel = 5 * nextLevel * nextLevel;
    const need = Math.max(0, xpNextLevel - (u.totalXP || 0));

    await ctx.reply(
      [
        '📊 Thông tin của bạn:',
        `• Level hiện tại: ${level}`,
        `• XP hiện tại: ${u.totalXP || 0}`,
        `• Còn thiếu: ${need} XP để lên Level ${nextLevel}`,
        `• Coin: ${u.topCoin || 0}`,
        `• Tuần: ${u.weekXP || 0} XP • Tháng: ${u.monthXP || 0} XP`,
        `• Tổng số tin nhắn đã gửi: ${u.messageCount || 0}`
      ].join('\n'),
      { reply_to_message_id: ctx.message?.message_id }
    );
  });
  // ================= TOP =================

  bot.command('top', async (ctx) => {
    const list = await User.find().sort({ totalXP: -1 }).limit(10);
    if (!list.length) {
      return ctx.reply('Chưa có dữ liệu top.', { reply_to_message_id: ctx.message?.message_id });
    }
    let text = '🏆 TOP TỔNG (XP)\n\n';
    list.forEach((u, i) => {
      const level = calcLevel(u.totalXP);
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – Level ${level} (${u.totalXP} XP)\n`;
    });
    await ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
  });

  bot.command('top_full', async (ctx) => {
    const list = await User.find().sort({ totalXP: -1 }).limit(50);
    if (!list.length) {
      return ctx.reply('Chưa có dữ liệu top.', { reply_to_message_id: ctx.message?.message_id });
    }
    let text = '🏆 TOP TỔNG (50 người)\n\n';
    list.forEach((u, i) => {
      const level = calcLevel(u.totalXP);
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – Level ${level} (${u.totalXP} XP)\n`;
    });
    await ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
  });

  bot.command('topweek', async (ctx) => {
    const list = await User.find().sort({ weekXP: -1 }).limit(10);
    if (!list.length) {
      return ctx.reply('Chưa có dữ liệu top tuần.', { reply_to_message_id: ctx.message?.message_id });
    }
    let text = '📅 TOP TUẦN\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.weekXP} XP tuần\n`;
    });
    await ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
  });

  bot.command('topweek_full', async (ctx) => {
    const list = await User.find().sort({ weekXP: -1 }).limit(50);
    if (!list.length) {
      return ctx.reply('Chưa có dữ liệu top tuần.', { reply_to_message_id: ctx.message?.message_id });
    }
    let text = '📅 TOP TUẦN (50 người)\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.weekXP} XP tuần\n`;
    });
    await ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
  });

  bot.command('topmonth', async (ctx) => {
    const list = await User.find().sort({ monthXP: -1 }).limit(10);
    if (!list.length) {
      return ctx.reply('Chưa có dữ liệu top tháng.', { reply_to_message_id: ctx.message?.message_id });
    }
    let text = '📆 TOP THÁNG\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.monthXP} XP tháng\n`;
    });
    await ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
  });

  bot.command('topmonth_full', async (ctx) => {
    const list = await User.find().sort({ monthXP: -1 }).limit(50);
    if (!list.length) {
      return ctx.reply('Chưa có dữ liệu top tháng.', { reply_to_message_id: ctx.message?.message_id });
    }
    let text = '📆 TOP THÁNG (50 người)\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.monthXP} XP tháng\n`;
    });
    await ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
  });

  // ================= SHOP =================

  bot.command('shop', async (ctx) => {
    let txt = '🎁 SHOP\n\n';
    config.shop.items.forEach(i => {
      txt += `• ${i.id} – ${i.name} – ${i.price} coin\n`;
    });
    await ctx.reply(txt, { reply_to_message_id: ctx.message?.message_id });
  });

  bot.command('buy', async (ctx) => {
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const id = parts[1];
    if (!id) {
      return ctx.reply('Sai cú pháp: /buy <id>', { reply_to_message_id: ctx.message?.message_id });
    }

    let user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      return ctx.reply('Bạn chưa có dữ liệu.', { reply_to_message_id: ctx.message?.message_id });
    }

    const item = config.shop.items.find(i => i.id === id);
    if (!item) {
      return ctx.reply('Không tìm thấy vật phẩm này.', { reply_to_message_id: ctx.message?.message_id });
    }
    if (user.topCoin < item.price) {
      return ctx.reply('Bạn không đủ coin.', { reply_to_message_id: ctx.message?.message_id });
    }

    user.topCoin -= item.price;

    // Box random
    if (item.type === 'box') {
      const rand = Math.random() * 100;
      let sum = 0;
      let rewardType = 'nothing';
      for (const r of config.shop.randomRewards) {
        sum += r.chance;
        if (rand <= sum) {
          rewardType = r.type;
          break;
        }
      }
      await Reward.create({ userId: user._id, type: rewardType });
      await user.save();
      return ctx.reply(
        `Bạn mở Box và nhận: ${rewardType === 'nothing' ? 'Hụt 😢' : rewardType}`,
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    // Vật phẩm bình thường
    await Reward.create({ userId: user._id, type: item.type });
    await user.save();
    await ctx.reply(
      `Đã mua: ${item.name}. Quà sẽ do admin xử lý.`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // ================= NHIỆM VỤ: /daily & /claimdaily =================

  // /daily – điểm danh hằng ngày
  bot.command('daily', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    let user = await User.findOne({ telegramId: from.id });
    if (!user) {
      user = await User.create({
        telegramId: from.id,
        username: from.username || '',
        role: DEFAULT_ADMINS.includes(from.id) ? 'admin' : 'user'
      });
    }

    const todayKey = getDayKey();
    if (user.lastDailyAt === todayKey) {
      return ctx.reply(
        '📅 Hôm nay bạn đã điểm danh rồi, quay lại ngày mai nhé!',
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    // streak: nếu hôm qua có daily → +1, không thì reset = 1
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getDayKey(yesterday);

    if (user.lastDailyAt === yKey) {
      user.dailyStreak += 1;
    } else {
      user.dailyStreak = 1;
    }

    user.lastDailyAt = todayKey;

    // thưởng daily
    const dailyXp = 10;
    const dailyCoin = 20;

    user.totalXP += dailyXp;
    user.dayXP += dailyXp;
    user.weekXP += dailyXp;
    user.monthXP += dailyXp;
    user.topCoin += dailyCoin;

    await user.save();

    const level = calcLevel(user.totalXP);

    await ctx.reply(
      `✅ Điểm danh thành công!\n` +
      `• +${dailyXp} XP\n` +
      `• +${dailyCoin} coin\n` +
      `• Streak: ${user.dailyStreak} ngày\n` +
      `• Level hiện tại: ${level} (XP: ${user.totalXP})`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /claimdaily – nhiệm vụ chat đủ XP trong ngày
  bot.command('claimdaily', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    let user = await User.findOne({ telegramId: from.id });
    if (!user) {
      return ctx.reply(
        'Bạn chưa có dữ liệu, hãy chat trong group trước.',
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    const todayKey = getDayKey();
    const requiredXpToday = 40; // cần 40 XP trong ngày để nhận thưởng
    const bonusXp = 30;
    const bonusCoin = 30;

    // đã claim hôm nay?
    if (user.lastDailyQuestKey === todayKey) {
      return ctx.reply(
        '🎯 Bạn đã nhận thưởng nhiệm vụ ngày hôm nay rồi.',
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    if (user.dayXP < requiredXpToday) {
      return ctx.reply(
        `Bạn mới có ${user.dayXP} XP hôm nay.\n` +
        `Cần ${requiredXpToday} XP trong ngày để nhận thưởng.`,
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    user.lastDailyQuestKey = todayKey;

    user.totalXP += bonusXp;
    user.dayXP += bonusXp;
    user.weekXP += bonusXp;
    user.monthXP += bonusXp;
    user.topCoin += bonusCoin;

    await user.save();

    const level = calcLevel(user.totalXP);

    await ctx.reply(
      `🎉 Nhiệm vụ ngày hoàn thành!\n` +
      `• +${bonusXp} XP\n` +
      `• +${bonusCoin} coin\n` +
      `• Level hiện tại: ${level} (XP: ${user.totalXP})`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // ================= ADMIN PACK =================

  // /addadmin <telegramId>
  bot.command('addadmin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const idStr = parts[1];
    if (!idStr) {
      return ctx.reply('Dùng: /addadmin <telegramId>', { reply_to_message_id: ctx.message?.message_id });
    }
    const idNum = Number(idStr);
    if (isNaN(idNum)) {
      return ctx.reply('ID không hợp lệ.', { reply_to_message_id: ctx.message?.message_id });
    }

    let u = await User.findOne({ telegramId: idNum });
    if (!u) u = await User.create({ telegramId: idNum });
    u.role = 'admin';
    await u.save();
    await ctx.reply(`✅ Đã set admin cho ID ${idNum}`, { reply_to_message_id: ctx.message?.message_id });
  });

  // /removeadmin <telegramId>
  bot.command('removeadmin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const idStr = parts[1];
    if (!idStr) {
      return ctx.reply('Dùng: /removeadmin <telegramId>', { reply_to_message_id: ctx.message?.message_id });
    }
    const idNum = Number(idStr);
    if (isNaN(idNum)) {
      return ctx.reply('ID không hợp lệ.', { reply_to_message_id: ctx.message?.message_id });
    }

    const u = await User.findOne({ telegramId: idNum });
    if (!u) return ctx.reply('Không tìm thấy user này.', { reply_to_message_id: ctx.message?.message_id });
    u.role = 'user';
    await u.save();
    await ctx.reply(`✅ Đã gỡ admin của ID ${idNum}`, { reply_to_message_id: ctx.message?.message_id });
  });

  // /give <user> <coin|xp> <số lượng>
  bot.command('give', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    const type = parts[2];
    const amountStr = parts[3];

    if (!userArg || !type || !amountStr) {
      return ctx.reply(
        'Dùng: /give <telegramId|@username> <coin|xp> <số lượng>',
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('Số lượng không hợp lệ.', { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    if (type === 'coin') {
      target.topCoin = (target.topCoin || 0) + amount;
    } else if (type === 'xp') {
      target.totalXP = (target.totalXP || 0) + amount;
    } else {
      return ctx.reply('Loại chỉ hỗ trợ: coin hoặc xp', { reply_to_message_id: ctx.message?.message_id });
    }

    await target.save();

    await ctx.reply(
      `✅ Đã cộng ${amount} ${type} cho ${target.username || target.telegramId}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /removecoin <user> <số lượng>
  bot.command('removecoin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    const amountStr = parts[2];

    if (!userArg || !amountStr) {
      return ctx.reply('Dùng: /removecoin <telegramId|@username> <số lượng>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('Số lượng không hợp lệ.', { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.topCoin = Math.max(0, (target.topCoin || 0) - amount);
    await target.save();

    await ctx.reply(
      `✅ Đã trừ ${amount} coin của ${target.username || target.telegramId}. Coin mới: ${target.topCoin}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /resetcoin <user>
  bot.command('resetcoin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];

    if (!userArg) {
      return ctx.reply('Dùng: /resetcoin <telegramId|@username>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.topCoin = 0;
    await target.save();

    await ctx.reply(
      `✅ Đã reset coin của ${target.username || target.telegramId} về 0.`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /resetcoin_all – reset coin toàn bộ
  bot.command('resetcoin_all', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    await User.updateMany({}, { topCoin: 0 });

    await ctx.reply(
      '✅ Đã reset coin của toàn bộ user về 0.',
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /removexp <user> <số lượng>
  bot.command('removexp', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    const amountStr = parts[2];

    if (!userArg || !amountStr) {
      return ctx.reply(
        'Dùng: /removexp <telegramId|@username> <số lượng>',
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('Số lượng không hợp lệ.', { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.totalXP = Math.max(0, (target.totalXP || 0) - amount);
    target.dayXP   = Math.max(0, (target.dayXP   || 0) - amount);
    target.weekXP  = Math.max(0, (target.weekXP  || 0) - amount);
    target.monthXP = Math.max(0, (target.monthXP || 0) - amount);

    await target.save();

    const level = calcLevel(target.totalXP);

    await ctx.reply(
      `✅ Đã trừ ${amount} XP của ${target.username || target.telegramId}.\n` +
      `XP mới: ${target.totalXP} • Level: ${level}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /resetxp <user>
  bot.command('resetxp', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];

    if (!userArg) {
      return ctx.reply('Dùng: /resetxp <telegramId|@username>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.totalXP = 0;
    target.dayXP   = 0;
    target.weekXP  = 0;
    target.monthXP = 0;

    await target.save();

    await ctx.reply(
      `✅ Đã reset XP của ${target.username || target.telegramId} về 0.`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /resetxp_all – reset XP toàn bộ
  bot.command('resetxp_all', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    await User.updateMany({}, {
      totalXP: 0,
      dayXP: 0,
      weekXP: 0,
      monthXP: 0
    });

    await ctx.reply(
      '✅ Đã reset XP của toàn bộ user về 0.',
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /ban <user>
  bot.command('ban', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];

    if (!userArg) {
      return ctx.reply('Dùng: /ban <telegramId|@username>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.banned = true;
    await target.save();

    try {
      if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        await ctx.telegram.kickChatMember(ctx.chat.id, target.telegramId);
      }
    } catch (e) {
      console.log('Kick error:', e.message);
    }

    await ctx.reply(
      `✅ Đã ban ${target.username || target.telegramId}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /unban <user>
  bot.command('unban', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];

    if (!userArg) {
      return ctx.reply('Dùng: /unban <telegramId|@username>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.banned = false;
    await target.save();

    await ctx.reply(
      `✅ Đã unban ${target.username || target.telegramId}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /mute <user>
  bot.command('mute', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];

    if (!userArg) {
      return ctx.reply('Dùng: /mute <telegramId|@username>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.muted = true;
    await target.save();

    try {
      if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        await ctx.telegram.restrictChatMember(ctx.chat.id, target.telegramId, {
          can_send_messages: false
        });
      }
    } catch (e) {
      console.log('Mute error:', e.message);
    }

    await ctx.reply(
      `✅ Đã mute ${target.username || target.telegramId}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /unmute <user>
  bot.command('unmute', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];

    if (!userArg) {
      return ctx.reply('Dùng: /unmute <telegramId|@username>',
        { reply_to_message_id: ctx.message?.message_id });
    }

    const target = await findUserByArg(userArg);
    if (!target) {
      return ctx.reply('Không tìm thấy user.', { reply_to_message_id: ctx.message?.message_id });
    }

    target.muted = false;
    await target.save();

    try {
      if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        await ctx.telegram.restrictChatMember(ctx.chat.id, target.telegramId, {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true
        });
      }
    } catch (e) {
      console.log('Unmute error:', e.message);
    }

    await ctx.reply(
      `✅ Đã unmute ${target.username || target.telegramId}`,
      { reply_to_message_id: ctx.message?.message_id }
    );
  });

  // /rewards – xem danh sách reward pending
  bot.command('rewards', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const rewards = await Reward.find({ status: 'pending' }).populate('userId');
    if (!rewards.length) {
      return ctx.reply('Không có reward pending.', { reply_to_message_id: ctx.message?.message_id });
    }

    let txt = '🎁 Reward pending:\n';
    rewards.forEach(r => {
      const u = r.userId || {};
      const name = u.username ? '@' + u.username : (u.telegramId || 'unknown');
      txt += `ID: ${r._id} – ${r.type} – của ${name}\n`;
    });

    await ctx.reply(txt, { reply_to_message_id: ctx.message?.message_id });
  });

  // /approve <rewardId> – duyệt reward
  bot.command('approve', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) {
      return ctx.reply('Bạn không có quyền.', { reply_to_message_id: ctx.message?.message_id });
    }

    const parts = ctx.message.text.split(' ').filter(Boolean);
    const id = parts[1];

    if (!id) {
      return ctx.reply('Dùng: /approve <rewardId>', { reply_to_message_id: ctx.message?.message_id });
    }

    const r = await Reward.findById(id);
    if (!r) {
      return ctx.reply('Reward không tồn tại.', { reply_to_message_id: ctx.message?.message_id });
    }

    r.status = 'claimed';
    await r.save();

    await ctx.reply('✅ Đã duyệt reward.', { reply_to_message_id: ctx.message?.message_id });
  });
    // ====== MENU NHIỆM VỤ DẠNG NÚT ======

  const questMenuKeyboard = {
    inline_keyboard: [
      [
        { text: '📅 Nhiệm vụ ngày',  callback_data: 'nv_daily' },
        { text: '📆 Nhiệm vụ tuần',  callback_data: 'nv_week' }
      ],
      [
        { text: '🏆 Nhiệm vụ đặc biệt', callback_data: 'nv_special' },
        { text: '🎁 Mẹo lên level nhanh', callback_data: 'nv_tips' }
      ]
    ]
  };

  // /nhiemvu – mở menu
  bot.command('nhiemvu', async (ctx) => {
    await ctx.reply(
      '🎯 <b>Menu nhiệm vụ</b>\n\nChọn một mục bên dưới để xem chi tiết.',
      {
        parse_mode: 'HTML',
        reply_markup: questMenuKeyboard,
        reply_to_message_id: ctx.message?.message_id
      }
    );
  });

  // Nhiệm vụ ngày
  bot.action('nv_daily', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      [
        '📅 <b>Nhiệm vụ ngày</b>',
        '',
        '• /daily – điểm danh mỗi ngày:',
        '  +10 XP • +20 coin',
        '',
        '• Chat đủ 40 XP trong ngày:',
        '  Sau đó dùng <code>/claimdaily</code> để nhận',
        '  ➜ +30 XP • +30 coin',
        '',
        'Gợi ý: Chat > 50 ký tự/tin để được +2 XP thay vì +1.'
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: questMenuKeyboard
      }
    );
  });

  // Nhiệm vụ tuần
  bot.action('nv_week', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      [
        '📆 <b>Nhiệm vụ tuần</b>',
        '',
        '• Lọt TOP 10 tuần:',
        '  ➜ +100 coin (tuỳ bạn config khi chốt top).',
        '',
        '• Lọt TOP 3 tuần:',
        '  ➜ +300 coin hoặc quà Pro (CapCut / Canva...)',
        '',
        'Top tuần tính theo XP trong tuần (weekXP).'
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: questMenuKeyboard
      }
    );
  });

  // Nhiệm vụ đặc biệt (mốc level)
  bot.action('nv_special', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      [
        '🏆 <b>Nhiệm vụ đặc biệt (mốc level)</b>',
        '',
        'Khi đạt các mốc level sau sẽ được thưởng coin thêm:',
        '',
        '• Level 5  ➜ +20 coin',
        '• Level 10 ➜ +40 coin',
        '• Level 20 ➜ +60 coin',
        '• Level 30 ➜ +80 coin',
        '• Level 40 ➜ +100 coin',
        '• Level 50 ➜ +150 coin',
        '• Level 75 ➜ +200 coin',
        '• Level 100 ➜ +300 coin',
        '',
        'Coin sẽ tự cộng khi bot phát hiện bạn vừa lên mốc đó.'
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: questMenuKeyboard
      }
    );
  });

  // Mẹo lên level nhanh
  bot.action('nv_tips', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      [
        '🎁 <b>Mẹo lên level & kiếm coin nhanh</b>',
        '',
        '• Viết tin nhắn dài, có nội dung:',
        '  > 50 ký tự ➜ +2 XP / tin',
        '',
        '• Không spam ký tự ngắn, emoji, sticker:',
        '  Bot không cộng XP + dễ ăn cảnh cáo spam.',
        '',
        '• Online đều mỗi ngày:',
        '  Dùng /daily + /claimdaily để lấy XP + coin free.',
        '',
        '• Cày top tuần/tháng để nhận thưởng lớn.',
        '',
        'Xem tiến trình của bạn bằng lệnh /me.'
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: questMenuKeyboard
      }
    );
  });
};
