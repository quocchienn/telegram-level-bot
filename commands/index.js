import User from '../models/User.js';
import Reward from '../models/Reward.js';
import config from '../config/config.js';

// helper: tính level
function calcLevel(xp) {
  const lv = Math.floor(Math.sqrt(xp / 5));
  return lv < 1 ? 1 : lv;
}

// helper: tìm user theo arg (id hoặc @username)
async function findUserByArg(arg) {
  if (!arg) return null;
  if (arg.startsWith('@')) {
    const username = arg.slice(1);
    return await User.findOne({ username });
  }
  const idNum = Number(arg);
  if (!isNaN(idNum)) {
    return await User.findOne({ telegramId: idNum });
  }
  return null;
}

export default (bot) => {
  // /start
  bot.start(async (ctx) => {
    await ctx.reply(
      'Xin chào! Đây là bot level / điểm / top / shop.\n' +
      '• /me – xem level\n' +
      '• /top, /topweek, /topmonth – xem bảng xếp hạng\n' +
      '• /top_full, /topweek_full, /topmonth_full – top 50\n' +
      '• /shop – xem vật phẩm\n' +
      '• /buy <id> – đổi coin lấy quà'
    );
  });

  // /me
  bot.command('me', async (ctx) => {
    let u = await User.findOne({ telegramId: ctx.from.id });
    if (!u) return ctx.reply('Bạn chưa có dữ liệu, hãy chat trong group trước.');
    const level = calcLevel(u.totalXP);
    await ctx.reply(
      `Level: ${level}\nXP: ${u.totalXP}\nCoin: ${u.topCoin}\n` +
      `Tuần: ${u.weekXP} XP • Tháng: ${u.monthXP} XP`
    );
  });

  // /top (tổng) – top 10
  bot.command('top', async (ctx) => {
    const list = await User.find().sort({ totalXP: -1 }).limit(10);
    if (!list.length) return ctx.reply('Chưa có dữ liệu top.');
    let text = '🏆 TOP TỔNG (XP)\n\n';
    list.forEach((u, i) => {
      const level = calcLevel(u.totalXP);
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – Level ${level} (${u.totalXP} XP)\n`;
    });
    await ctx.reply(text);
  });

  // /top_full – top 50
  bot.command('top_full', async (ctx) => {
    const list = await User.find().sort({ totalXP: -1 }).limit(50);
    if (!list.length) return ctx.reply('Chưa có dữ liệu top.');
    let text = '🏆 TOP TỔNG (50 người)\n\n';
    list.forEach((u, i) => {
      const level = calcLevel(u.totalXP);
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – Level ${level} (${u.totalXP} XP)\n`;
    });
    await ctx.reply(text);
  });

  // /topweek – top 10
  bot.command('topweek', async (ctx) => {
    const list = await User.find().sort({ weekXP: -1 }).limit(10);
    if (!list.length) return ctx.reply('Chưa có dữ liệu top tuần.');
    let text = '📅 TOP TUẦN\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.weekXP} XP tuần\n`;
    });
    await ctx.reply(text);
  });

  // /topweek_full – top 50
  bot.command('topweek_full', async (ctx) => {
    const list = await User.find().sort({ weekXP: -1 }).limit(50);
    if (!list.length) return ctx.reply('Chưa có dữ liệu top tuần.');
    let text = '📅 TOP TUẦN (50 người)\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.weekXP} XP tuần\n`;
    });
    await ctx.reply(text);
  });

  // /topmonth – top 10
  bot.command('topmonth', async (ctx) => {
    const list = await User.find().sort({ monthXP: -1 }).limit(10);
    if (!list.length) return ctx.reply('Chưa có dữ liệu top tháng.');
    let text = '📆 TOP THÁNG\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.monthXP} XP tháng\n`;
    });
    await ctx.reply(text);
  });

  // /topmonth_full – top 50
  bot.command('topmonth_full', async (ctx) => {
    const list = await User.find().sort({ monthXP: -1 }).limit(50);
    if (!list.length) return ctx.reply('Chưa có dữ liệu top tháng.');
    let text = '📆 TOP THÁNG (50 người)\n\n';
    list.forEach((u, i) => {
      const name = u.username ? '@' + u.username : 'ID ' + u.telegramId;
      text += `${i + 1}. ${name} – ${u.monthXP} XP tháng\n`;
    });
    await ctx.reply(text);
  });

  // /shop
  bot.command('shop', async (ctx) => {
    let txt = '🎁 SHOP\n\n';
    config.shop.items.forEach(i => {
      txt += `• ${i.id} – ${i.name} – ${i.price} coin\n`;
    });
    await ctx.reply(txt);
  });

  // /buy <id>
  bot.command('buy', async (ctx) => {
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const id = parts[1];
    if (!id) return ctx.reply('Sai cú pháp: /buy <id>');

    let user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('Bạn chưa có dữ liệu.');

    const item = config.shop.items.find(i => i.id === id);
    if (!item) return ctx.reply('Không tìm thấy vật phẩm này.');
    if (user.topCoin < item.price) return ctx.reply('Bạn không đủ coin.');

    user.topCoin -= item.price;

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
      return ctx.reply(`Bạn mở Box và nhận: ${rewardType === 'nothing' ? 'Hụt 😢' : rewardType}`);
    }

    await Reward.create({ userId: user._id, type: item.type });
    await user.save();
    await ctx.reply(`Đã mua: ${item.name}. Quà sẽ do admin xử lý.`);
  });

  // ===== ADMIN ZONE =====
  async function isAdmin(userId) {
    const u = await User.findOne({ telegramId: userId });
    return u && u.role === 'admin';
  }

  // /addadmin <telegramId>
  bot.command('addadmin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const idStr = parts[1];
    if (!idStr) return ctx.reply('Dùng: /addadmin <telegramId>');
    const idNum = Number(idStr);
    if (isNaN(idNum)) return ctx.reply('ID không hợp lệ.');

    let u = await User.findOne({ telegramId: idNum });
    if (!u) u = await User.create({ telegramId: idNum });
    u.role = 'admin';
    await u.save();
    await ctx.reply(`Đã set admin cho ID ${idNum}`);
  });

  // /removeadmin <telegramId>
  bot.command('removeadmin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const idStr = parts[1];
    if (!idStr) return ctx.reply('Dùng: /removeadmin <telegramId>');
    const idNum = Number(idStr);
    if (isNaN(idNum)) return ctx.reply('ID không hợp lệ.');

    const u = await User.findOne({ telegramId: idNum });
    if (!u) return ctx.reply('Không tìm thấy user này.');
    u.role = 'user';
    await u.save();
    await ctx.reply(`Đã gỡ admin của ID ${idNum}`);
  });

  // /give <id> <coin|xp> <amount>
  bot.command('give', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    const type = parts[2];
    const amountStr = parts[3];
    if (!userArg || !type || !amountStr) {
      return ctx.reply('Dùng: /give <telegramId|@username> <coin|xp> <số lượng>');
    }
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return ctx.reply('Số lượng không hợp lệ.');

    const target = await findUserByArg(userArg);
    if (!target) return ctx.reply('Không tìm thấy user.');

    if (type === 'coin') {
      target.topCoin += amount;
    } else if (type === 'xp') {
      target.totalXP += amount;
    } else {
      return ctx.reply('Loại chỉ hỗ trợ: coin hoặc xp');
    }
    await target.save();
    await ctx.reply(`Đã cộng ${amount} ${type} cho ${target.username || target.telegramId}`);
  });

  // /ban <id>
  bot.command('ban', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    if (!userArg) return ctx.reply('Dùng: /ban <telegramId|@username>');

    const target = await findUserByArg(userArg);
    if (!target) return ctx.reply('Không tìm thấy user.');
    target.banned = true;
    await target.save();

    try {
      if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        await ctx.telegram.kickChatMember(ctx.chat.id, target.telegramId);
      }
    } catch (e) {
      console.log('Kick error (không sao):', e.message);
    }

    await ctx.reply(`Đã ban ${target.username || target.telegramId}`);
  });

  // /unban <id>
  bot.command('unban', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    if (!userArg) return ctx.reply('Dùng: /unban <telegramId|@username>');

    const target = await findUserByArg(userArg);
    if (!target) return ctx.reply('Không tìm thấy user.');
    target.banned = false;
    await target.save();
    await ctx.reply(`Đã unban ${target.username || target.telegramId}`);
  });

  // /mute <id>
  bot.command('mute', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    if (!userArg) return ctx.reply('Dùng: /mute <telegramId|@username>');

    const target = await findUserByArg(userArg);
    if (!target) return ctx.reply('Không tìm thấy user.');
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

    await ctx.reply(`Đã mute ${target.username || target.telegramId}`);
  });

  // /unmute <id>
  bot.command('unmute', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const userArg = parts[1];
    if (!userArg) return ctx.reply('Dùng: /unmute <telegramId|@username>');

    const target = await findUserByArg(userArg);
    if (!target) return ctx.reply('Không tìm thấy user.');
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

    await ctx.reply(`Đã unmute ${target.username || target.telegramId}`);
  });

  // /rewards (admin xem pending)
  bot.command('rewards', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const rewards = await Reward.find({ status: 'pending' }).populate('userId');
    if (!rewards.length) return ctx.reply('Không có reward pending.');

    let txt = '🎁 Reward pending:\n';
    rewards.forEach(r => {
      const u = r.userId || {};
      const name = u.username ? '@' + u.username : (u.telegramId || 'unknown');
      txt += `ID: ${r._id} – ${r.type} – của ${name}\n`;
    });
    await ctx.reply(txt);
  });

  // /approve <rewardId>
  bot.command('approve', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply('Bạn không có quyền.');
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const id = parts[1];
    if (!id) return ctx.reply('Dùng: /approve <rewardId>');

    const r = await Reward.findById(id);
    if (!r) return ctx.reply('Reward không tồn tại.');
    r.status = 'claimed';
    await r.save();
    await ctx.reply('Đã duyệt reward.');
  });
};
