import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, index: true },
  username: String,

  // XP & level
  totalXP: { type: Number, default: 0 },

  // ✅ đếm số lần chat
  messageCount: { type: Number, default: 0 },

  dayXP: { type: Number, default: 0 },
  weekXP: { type: Number, default: 0 },
  monthXP: { type: Number, default: 0 },

  // Giới hạn XP theo ngày / phút
  dayKey: { type: String },          // YYYY-MM-DD
  minuteKey: { type: String },       // YYYY-MM-DDTHH:MM
  minuteXP: { type: Number, default: 0 },

  // Coin dùng cho shop / thưởng
  topCoin: { type: Number, default: 0 },

  // Quyền
  role: { type: String, default: 'user' }, // user | admin

  // Trạng thái xử lý
  banned: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },

  // Anti-spam
  warnCount: { type: Number, default: 0 },
  lastWarnAt: { type: Date, default: null },

  lastMessageText: { type: String, default: '' },
  lastMessageAt: { type: Date, default: null },

  spamWindowStart: { type: Date, default: null },
  spamCount: { type: Number, default: 0 },

  // Nhiệm vụ /daily & /claimdaily
  lastDailyAt: { type: String, default: null },        // ngày đã điểm danh gần nhất: 'YYYY-MM-DD'
  lastDailyQuestKey: { type: String, default: null },  // ngày đã nhận thưởng nhiệm vụ chat
  dailyStreak: { type: Number, default: 0 }            // số ngày điểm danh liên tiếp
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
