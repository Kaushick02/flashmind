const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Deck, UserStats } = require('../models');
const { isDue, getDueCards, sortByPriority } = require('../sm2');

const router = express.Router();

// In-memory fallback when MongoDB isn't available
let memDecks = [];
let useMemory = false;

async function getDecks() {
  if (useMemory) return memDecks;
  try { return await Deck.find().lean(); }
  catch { useMemory = true; return memDecks; }
}

async function saveDeck(deck) {
  if (useMemory) {
    const idx = memDecks.findIndex(d => d.id === deck.id);
    if (idx >= 0) memDecks[idx] = deck; else memDecks.push(deck);
    return deck;
  }
  try {
    return await Deck.findOneAndUpdate({ id: deck.id }, deck, { upsert: true, new: true }).lean();
  } catch { useMemory = true; return saveDeck(deck); }
}

// GET /api/decks
router.get('/', async (req, res) => {
  const decks = await getDecks();
  const enriched = decks.map(d => ({
    ...d,
    dueCount: (d.cards || []).filter(isDue).length,
    masteredCount: (d.cards || []).filter(c => c.mastery === 'mastered').length,
  }));
  res.json(enriched);
});

// GET /api/decks/:id
router.get('/:id', async (req, res) => {
  const decks = await getDecks();
  const deck = decks.find(d => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  res.json({
    ...deck,
    dueCount: deck.cards.filter(isDue).length,
    masteredCount: deck.cards.filter(c => c.mastery === 'mastered').length,
  });
});

// POST /api/decks
router.post('/', async (req, res) => {
  const { name, subject, description, color, cards } = req.body;
  if (!name || !cards?.length) return res.status(400).json({ error: 'Name and cards required' });

  const deck = {
    id: uuidv4(),
    name,
    subject: subject || 'general',
    description: description || '',
    color: color || '#7c6fff',
    cards: cards.map(c => ({ ...c, id: c.id || uuidv4() })),
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveDeck(deck);
  res.status(201).json(deck);
});

// PUT /api/decks/:id
router.put('/:id', async (req, res) => {
  const decks = await getDecks();
  const existing = decks.find(d => d.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Deck not found' });
  const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  await saveDeck(updated);
  res.json(updated);
});

// DELETE /api/decks/:id
router.delete('/:id', async (req, res) => {
  if (useMemory) {
    memDecks = memDecks.filter(d => d.id !== req.params.id);
  } else {
    try { await Deck.deleteOne({ id: req.params.id }); } catch { memDecks = memDecks.filter(d => d.id !== req.params.id); }
  }
  res.json({ success: true });
});

// GET /api/decks/:id/study  — returns sorted due cards
router.get('/:id/study', async (req, res) => {
  const decks = await getDecks();
  const deck = decks.find(d => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const dueOnly = req.query.dueOnly === 'true';
  const cards = dueOnly ? getDueCards(deck.cards) : deck.cards;
  res.json({ cards: sortByPriority(cards), deckName: deck.name });
});

module.exports = router;
