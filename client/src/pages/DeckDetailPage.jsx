import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { useToast } from '../hooks/useToast';
import { isDue } from '../utils/sm2';

const MASTERY_COLORS = { mastered: 'var(--green)', learning: 'var(--amber)', new: 'var(--blue)', again: 'var(--red)' };
const MASTERY_BG = { mastered: 'badge-mastered', learning: 'badge-learning', new: 'badge-new', again: 'badge-again' };

export default function DeckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, getDeck } = useAppStore();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const deck = getDeck(id);
  if (!deck) return (
    <div className="container page" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <p style={{ color: 'var(--text-muted)' }}>Deck not found.</p>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/decks')}>← Back to Decks</button>
    </div>
  );

  const cards = deck.cards || [];
  const due = cards.filter(isDue);
  const mastered = cards.filter(c => c.mastery === 'mastered');
  const learning = cards.filter(c => c.mastery === 'learning' || c.mastery === 'again');
  const newCards = cards.filter(c => c.mastery === 'new');

  const filteredCards = filter === 'all' ? cards
    : filter === 'due' ? due
    : cards.filter(c => c.mastery === filter);

  function handleDelete() {
    dispatch({ type: 'DELETE_DECK', id });
    toast(`"${deck.name}" deleted.`, 'default');
    navigate('/decks');
  }

  const pct = cards.length ? Math.round(mastered.length / cards.length * 100) : 0;

  return (
    <div className="container page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decks')}>← Decks</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: deck.color || '#7c6fff', flexShrink: 0,
            }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem' }}>{deck.name}</h1>
            <span style={{ fontSize: '0.78rem', padding: '2px 10px', borderRadius: 20, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {deck.subject}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {cards.length} cards · Created {new Date(deck.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>Delete Deck</button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { num: cards.length, lbl: 'Total', color: 'var(--accent-light)' },
          { num: due.length, lbl: 'Due Today', color: 'var(--amber)' },
          { num: mastered.length, lbl: 'Mastered', color: 'var(--green)' },
          { num: newCards.length, lbl: 'New', color: 'var(--blue)' },
        ].map(({ num, lbl, color }) => (
          <div className="stat-block" key={lbl}>
            <div className="stat-num" style={{ color, fontSize: '1.6rem' }}>{num}</div>
            <div className="stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Overall Progress</span>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{pct}% mastered</span>
        </div>
        <div className="progress-track" style={{ height: 10, marginBottom: 10 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {[
            { label: 'Mastered', val: mastered.length, color: 'var(--green)' },
            { label: 'Learning', val: learning.length, color: 'var(--amber)' },
            { label: 'New', val: newCards.length, color: 'var(--blue)' },
          ].map(({ label, val, color }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}: {val}
            </span>
          ))}
        </div>
      </div>

      {/* Study buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate(`/study/${id}?dueOnly=true`)}
          disabled={due.length === 0}
        >
          {due.length > 0 ? `Study ${due.length} Due Cards →` : '✓ All Caught Up'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/study/${id}`)}>
          Study All {cards.length} Cards
        </button>
      </div>

      {/* Card list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Cards ({filteredCards.length})</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'due', 'mastered', 'learning', 'new', 'again'].map(f => {
            const counts = { all: cards.length, due: due.length, mastered: mastered.length, learning: cards.filter(c=>c.mastery==='learning').length, new: newCards.length, again: cards.filter(c=>c.mastery==='again').length };
            if (counts[f] === 0 && f !== 'all') return null;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                background: filter === f ? 'var(--accent)' : 'var(--bg-elevated)',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'var(--transition)',
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredCards.map((card, i) => (
          <div key={card.id} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 22, paddingTop: 3, fontWeight: 600 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: 4 }}>{card.question}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {card.answer.length > 120 ? card.answer.slice(0, 120) + '...' : card.answer}
              </div>
              {card.nextReview && (
                <div style={{ marginTop: 5, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Next review: {card.nextReview} · Interval: {card.interval}d · Reviews: {card.reviewCount || 0}
                </div>
              )}
            </div>
            <div className={`badge ${MASTERY_BG[card.mastery] || 'badge-new'}`} style={{ flexShrink: 0 }}>
              {card.mastery}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.75rem' }}>Delete "{deck.name}"?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              This will permanently delete all {cards.length} cards and their review history. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
