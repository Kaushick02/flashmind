import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { useToast } from '../hooks/useToast';
import { isDue, sortByPriority } from '../utils/sm2';

const RATINGS = [
  { quality: 0, label: 'Again', sub: '< 1 min', cls: 'again', color: 'var(--red)', key: '1' },
  { quality: 1, label: 'Hard',  sub: '~1 day',  cls: 'hard',  color: 'var(--amber)', key: '2' },
  { quality: 3, label: 'Good',  sub: 'Few days', cls: 'good', color: 'var(--blue)', key: '3' },
  { quality: 5, label: 'Easy',  sub: 'Long',     cls: 'easy', color: 'var(--green)', key: '4' },
];

export default function StudyPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dueOnly = searchParams.get('dueOnly') === 'true';
  const navigate = useNavigate();
  const { getDeck, dispatch } = useAppStore();
  const toast = useToast();

  const deck = getDeck(id);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionStats, setSessionStats] = useState({ easy: 0, good: 0, hard: 0, again: 0 });
  const [showAnswer, setShowAnswer] = useState(false);
  const startTime = useRef(Date.now());

  // Build queue on mount
  useEffect(() => {
    if (!deck) return;
    let cards = dueOnly ? deck.cards.filter(isDue) : [...deck.cards];
    if (cards.length === 0 && dueOnly) {
      // Fallback to all
      cards = [...deck.cards];
    }
    if (cards.length === 0) {
      toast('No cards in this deck.', 'info');
      navigate(`/decks/${id}`);
      return;
    }
    setQueue(sortByPriority(cards));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!flipped) flipCard(); }
      if (flipped) {
        const rating = RATINGS.find(r => r.key === e.key);
        if (rating) rateCard(rating.quality);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, idx]);

  function flipCard() {
    setFlipped(true);
    setShowAnswer(true);
  }

  function rateCard(quality) {
    if (!flipped) return;
    const card = queue[idx];

    // Update via store
    dispatch({ type: 'REVIEW_CARD', deckId: id, cardId: card.id, quality });

    // Track session stats
    setSessionStats(prev => ({
      ...prev,
      easy: prev.easy + (quality >= 4 ? 1 : 0),
      good: prev.good + (quality === 3 ? 1 : 0),
      hard: prev.hard + (quality === 1 || quality === 2 ? 1 : 0),
      again: prev.again + (quality === 0 ? 1 : 0),
    }));

    const next = idx + 1;
    if (next >= queue.length) {
      dispatch({ type: 'FINISH_SESSION', count: queue.length });
      setDone(true);
    } else {
      setIdx(next);
      setFlipped(false);
      setShowAnswer(false);
    }
  }

  if (!deck) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1.5rem', color: 'var(--text-muted)' }}>
        <p>Deck not found.</p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/decks')}>← Back</button>
      </div>
    );
  }

  if (done) {
    const total = queue.length;
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
    const score = Math.round(((sessionStats.easy + sessionStats.good) / total) * 100);

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>
            {score >= 80 ? '🎉' : score >= 50 ? '📈' : '💪'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.2rem', marginBottom: '0.5rem' }}>
            Session Complete!
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            You reviewed {total} card{total !== 1 ? 's' : ''} in {mins > 0 ? `${mins}m ` : ''}{secs}s
          </p>

          {/* Score ring */}
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 2rem' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)'}
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - score / 100)}`}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)' }}>{score}%</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>score</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '2rem' }}>
            {[
              { label: 'Easy', val: sessionStats.easy, color: 'var(--green)' },
              { label: 'Good', val: sessionStats.good, color: 'var(--blue)' },
              { label: 'Hard', val: sessionStats.hard, color: 'var(--amber)' },
              { label: 'Again', val: sessionStats.again, color: 'var(--red)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-block">
                <div className="stat-num" style={{ color, fontSize: '1.5rem' }}>{val}</div>
                <div className="stat-lbl">{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/decks/${id}`)}>View Deck</button>
            <button className="btn btn-primary" onClick={() => { setDone(false); setIdx(0); setFlipped(false); setShowAnswer(false); setSessionStats({ easy: 0, good: 0, hard: 0, again: 0 }); startTime.current = Date.now(); }}>
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (queue.length === 0) return null;

  const card = queue[idx];
  const progress = (idx / queue.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Study nav */}
      <div style={{
        padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(10px)',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/decks/${id}`)}>✕</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{deck.name}</span>
            <span>{idx + 1} / {queue.length}</span>
          </div>
          <div className="progress-track" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        {/* Mastery mini-stats */}
        <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--green)' }}>✓ {sessionStats.easy + sessionStats.good}</span>
          <span style={{ color: 'var(--red)' }}>✕ {sessionStats.hard + sessionStats.again}</span>
        </div>
      </div>

      {/* Main card area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>

        {/* Card type / tags */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: 8 }}>
          {card.tags?.[0] && (
            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {card.tags[0]}
            </span>
          )}
          <span className={`badge ${card.mastery === 'new' ? 'badge-new' : card.mastery === 'mastered' ? 'badge-mastered' : 'badge-learning'}`}>
            {card.mastery}
          </span>
        </div>

        {/* Flip card */}
        <div
          className="flip-scene"
          style={{ width: '100%', maxWidth: 620, marginBottom: '1.5rem' }}
          onClick={() => !flipped && flipCard()}
        >
          <div className={`flip-inner ${flipped ? 'flipped' : ''}`} style={{ height: 280 }}>
            {/* Front */}
            <div className="flip-face" style={{
              position: 'absolute', inset: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderTop: '3px solid var(--accent)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '2.5rem', textAlign: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-light)', marginBottom: '1rem', fontWeight: 600 }}>
                Question
              </div>
              <div style={{ fontSize: '1.2rem', lineHeight: 1.65, fontWeight: 500, color: 'var(--text-primary)' }}>
                {card.question}
              </div>
              <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Tap to reveal</span>
                <kbd style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: '0.72rem' }}>Space</kbd>
              </div>
            </div>

            {/* Back */}
            <div className="flip-face flip-back" style={{
              position: 'absolute', inset: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderTop: '3px solid var(--teal)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '2.5rem', textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)', marginBottom: '1rem', fontWeight: 600 }}>
                Answer
              </div>
              <div style={{ fontSize: '1.1rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {card.answer}
              </div>
            </div>
          </div>
        </div>

        {/* Rating buttons (shown after flip) */}
        {flipped ? (
          <div style={{ width: '100%', maxWidth: 620 }}>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              How well did you know this?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {RATINGS.map(({ quality, label, sub, color, key }) => (
                <button
                  key={label}
                  onClick={() => rateCard(quality)}
                  style={{
                    padding: '0.875rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${color}30`,
                    background: `${color}12`,
                    color: color,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--font-display)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.transform = 'none'; }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{sub}</span>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', marginTop: 2 }}>{key}</kbd>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ minWidth: 200 }}
            onClick={flipCard}
          >
            Reveal Answer <kbd style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: '0.72rem', marginLeft: 6 }}>Space</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
