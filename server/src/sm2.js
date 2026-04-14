/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak
 * 
 * Quality ratings:
 * 0 - Complete blackout (Again)
 * 1 - Incorrect, but upon seeing correct answer it felt familiar (Hard)
 * 2 - Incorrect, but correct answer seemed easy to recall (Hard)
 * 3 - Correct response with serious difficulty (Good)
 * 4 - Correct response after a hesitation (Good)
 * 5 - Perfect response (Easy)
 */

function sm2(card, quality) {
  if (quality < 0 || quality > 5) throw new Error('Quality must be 0-5');

  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response - reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  const nextReviewStr = nextReview.toISOString().split('T')[0];

  // Determine mastery level
  let mastery;
  if (quality === 0 || quality === 1) mastery = 'again';
  else if (quality === 2 || quality === 3) mastery = 'learning';
  else mastery = 'mastered';

  return {
    ...card,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReview: nextReviewStr,
    mastery,
    lastQuality: quality,
    reviewCount: (card.reviewCount || 0) + 1,
  };
}

function isDue(card) {
  if (!card.nextReview) return true;
  const today = new Date().toISOString().split('T')[0];
  return card.nextReview <= today;
}

function getDueCards(cards) {
  return cards.filter(isDue);
}

function sortByPriority(cards) {
  // Sort: again > learning > new > mastered, then by due date
  const priority = { again: 0, learning: 1, new: 2, mastered: 3 };
  return [...cards].sort((a, b) => {
    const pa = priority[a.mastery] ?? 2;
    const pb = priority[b.mastery] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.nextReview && b.nextReview) return a.nextReview.localeCompare(b.nextReview);
    return 0;
  });
}

module.exports = { sm2, isDue, getDueCards, sortByPriority };
