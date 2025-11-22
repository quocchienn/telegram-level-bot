import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, index: true },
  username: String,
  totalXP: { type: Number, default: 0 },

  dayXP: { type: Number, default: 0 },
  weekXP: { type: Number, default: 0 },
  monthXP: { type: Number, default: 0 },

  dayKey: { type: String },          // YYYY-MM-DD
  minuteKey: { type: String },       // YYYY-MM-DDTHH:MM
  minuteXP: { type: Number, default: 0 },

  topCoin: { type: Number, default: 0 },
  role: { type: String, default: 'user' }, // user | admin

  banned: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },

  warnCount: { type: Number, default: 0 },
  lastWarnAt: { type: Date, default: null },

  lastMessageText: { type: String, default: '' },
  lastMessageAt: { type: Date, default: null },

  spamWindowStart: { type: Date, default: null },
  spamCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
