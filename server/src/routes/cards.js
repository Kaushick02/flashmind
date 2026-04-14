const express = require('express');
const { Deck } = require('../models');
const { sm2 } = require('../sm2');

const router = express.Router();

// In-memory fallback (mirrors decks router)
let useMemory = false;
const getDecksRouter = require('./decks');

// POST /api/cards/:deckId/review/:cardId
router.post('/:deckId/review/:cardId', async (req, res) => {
  const { quality } = req.body; // 0-5
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'quality must be 0-5' });
  }

  try {
    // Try MongoDB first
    let deck;
    try {
      deck = await Deck.findOne({ id: req.params.deckId });
    } catch {
      useMemory = true;
    }

    if (useMemory || !deck) {
      // Fallback: get from memory via decks module
      return res.status(503).json({ error: 'Use in-memory mode via frontend' });
    }

    const card = deck.cards.find(c => c.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const updated = sm2(card.toObject(), parseInt(quality));
    Object.assign(card, updated);
    deck.totalReviews = (deck.totalReviews || 0) + 1;
    deck.updatedAt = new Date();

    await deck.save();
    res.json({ card: updated, deckId: req.params.deckId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cards/:deckId/bulk-review  — submit entire session at once
router.post('/:deckId/bulk-review', async (req, res) => {
  const { reviews } = req.body; // [{ cardId, quality }]
  if (!Array.isArray(reviews)) return res.status(400).json({ error: 'reviews array required' });

  try {
    let deck;
    try { deck = await Deck.findOne({ id: req.params.deckId }); } catch { }

    if (!deck) return res.status(404).json({ error: 'Deck not found' });

    const updatedCards = [];
    for (const { cardId, quality } of reviews) {
      const card = deck.cards.find(c => c.id === cardId);
      if (!card) continue;
      const updated = sm2(card.toObject(), parseInt(quality));
      Object.assign(card, updated);
      updatedCards.push(updated);
    }

    deck.totalReviews = (deck.totalReviews || 0) + reviews.length;
    deck.updatedAt = new Date();
    await deck.save();

    res.json({ success: true, updatedCards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
