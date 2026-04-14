const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  hint: { type: String, default: '' },
  tags: [String],
  // SM-2 fields
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  repetitions: { type: Number, default: 0 },
  nextReview: { type: String, default: null },
  mastery: { type: String, enum: ['new', 'learning', 'mastered', 'again'], default: 'new' },
  lastQuality: { type: Number, default: null },
  reviewCount: { type: Number, default: 0 },
});

const DeckSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, default: 'general' },
  description: { type: String, default: '' },
  color: { type: String, default: '#7c6fff' },
  cards: [CardSchema],
  totalReviews: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastStudied: { type: String, default: null },
}, { timestamps: true });

const UserStatsSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  streak: { type: Number, default: 0 },
  lastStudyDate: { type: String, default: null },
  totalCardsReviewed: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = {
  Deck: mongoose.model('Deck', DeckSchema),
  UserStats: mongoose.model('UserStats', UserStatsSchema),
};
