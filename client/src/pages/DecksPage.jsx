import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { useToast } from '../hooks/useToast';
import DeckCard from '../components/DeckCard';
import { isDue } from '../utils/sm2';

const SUBJECTS = ['all', 'general', 'math', 'science', 'history', 'language', 'other'];

export default function DecksPage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = state.decks
    .filter(d => filter === 'all' || d.subject === filter)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  const totalDue = state.decks.reduce((sum, d) => sum + (d.cards || []).filter(isDue).length, 0);

  return (
    <div className="container page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', marginBottom: 4 }}>My Decks</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {state.decks.length} decks · {totalDue > 0 ? `${totalDue} cards due today` : 'all caught up! ✓'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>+ New Deck</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Search decks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220, height: 36, padding: '0 12px', fontSize: '0.875rem' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '5px 12px', borderRadius: 20,
              fontSize: '0.78rem', fontWeight: 500,
              background: filter === s ? 'var(--accent)' : 'var(--bg-elevated)',
              color: filter === s ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${filter === s ? 'transparent' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'var(--transition)',
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>📚</div>
          <p style={{ marginBottom: '1.25rem' }}>
            {search ? `No decks matching "${search}"` : 'No decks yet.'}
          </p>
          {!search && <button className="btn btn-primary" onClick={() => navigate('/create')}>Create your first deck →</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
          {filtered.map(d => (
            <DeckCard
              key={d.id}
              deck={d}
              onStudy={id => navigate(`/study/${id}?dueOnly=true`)}
              onDelete={id => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
