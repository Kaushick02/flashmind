/**
 * SM-2 Spaced Repetition — Client Implementation
 */

export function sm2(card, quality) {
  let { easeFactor = 2.5, interval = 0, repetitions = 0 } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const next = new Date();
  next.setDate(next.getDate() + interval);
  const nextReview = next.toISOString().split('T')[0];

  let mastery;
  if (quality <= 1) mastery = 'again';
  else if (quality <= 3) mastery = 'learning';
  else mastery = 'mastered';

  return {
    ...card,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReview,
    mastery,
    lastQuality: quality,
    reviewCount: (card.reviewCount || 0) + 1,
  };
}

export function isDue(card) {
  if (!card.nextReview) return true;
  const today = new Date().toISOString().split('T')[0];
  return card.nextReview <= today;
}

export function getDueCards(cards) {
  return cards.filter(isDue);
}

export function sortByPriority(cards) {
  const p = { again: 0, learning: 1, new: 2, mastered: 3 };
  return [...cards].sort((a, b) => {
    const diff = (p[a.mastery] ?? 2) - (p[b.mastery] ?? 2);
    if (diff !== 0) return diff;
    if (a.nextReview && b.nextReview) return a.nextReview.localeCompare(b.nextReview);
    return 0;
  });
}
