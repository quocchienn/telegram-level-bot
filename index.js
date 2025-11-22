import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bot from './utils/bot.js';
import './cron/weekly.js';
import './cron/monthly.js';

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error', err));

const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server started on', PORT));

bot.launch().then(() => console.log('🤖 Bot launched'));
