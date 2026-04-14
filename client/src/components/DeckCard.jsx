import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isDue } from '../utils/sm2';

const SUBJECT_ICONS = {
  math: '∑', science: '⚗', history: '🏛', language: '✍', general: '◈', other: '◉'
};

export default function DeckCard({ deck, onStudy, onDelete }) {
  const navigate = useNavigate();
  const due = (deck.cards || []).filter(isDue).length;
  const mastered = (deck.cards || []).filter(c => c.mastery === 'mastered').length;
  const total = deck.cards?.length || 0;
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  const icon = SUBJECT_ICONS[deck.subject] || '◈';

  return (
    <div
      className="card card-hover"
      style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}
      onClick={() => navigate(`/decks/${deck.id}`)}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${deck.color || '#7c6fff'}, transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${deck.color || '#7c6fff'}20`,
          border: `1px solid ${deck.color || '#7c6fff'}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', color: deck.color || '#7c6fff',
          fontFamily: 'var(--font-display)', fontWeight: 700,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.95rem', marginBottom: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {deck.name}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {total} cards · {deck.subject || 'general'}
          </div>
        </div>
        {due > 0 && (
          <div className="badge badge-due" style={{ flexShrink: 0 }}>
            ⏰ {due}
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Mastered</span>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Mastery dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['mastered', 'learning', 'new', 'again'].map(m => {
          const count = (deck.cards || []).filter(c => c.mastery === m).length;
          if (!count) return null;
          const colors = { mastered: 'var(--green)', learning: 'var(--amber)', new: 'var(--blue)', again: 'var(--red)' };
          return (
            <div key={m} style={{ fontSize: '0.7rem', color: colors[m], display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors[m], display: 'inline-block' }} />
              {count}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onStudy(deck.id)}
          disabled={total === 0}
        >
          {due > 0 ? `Study ${due} Due` : 'Study All'}
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => navigate(`/decks/${deck.id}`)}
          title="View deck"
        >
          ↗
        </button>
      </div>
    </div>
  );
}
