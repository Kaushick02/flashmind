import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { isDue } from '../utils/sm2';
import DeckCard from '../components/DeckCard';

export default function HomePage() {
  const navigate = useNavigate();
  const { state, allCards, dueCards, masteredCards } = useAppStore();

  const recentDecks = [...state.decks]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 4);

  const dueDecks = state.decks.filter(d => (d.cards || []).some(isDue));

  return (
    <div className="container page">
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '3rem 0 3.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--accent-subtle)', border: '1px solid rgba(124,111,255,0.2)',
          padding: '4px 14px', borderRadius: 20,
          fontSize: '0.78rem', color: 'var(--accent-light)',
          marginBottom: '1.25rem', fontWeight: 500,
        }}>
          ✦ Spaced Repetition · SM-2 Algorithm · PDF Upload
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.1,
          letterSpacing: '-0.03em', marginBottom: '1rem',
        }}>
          Study{' '}
          <span style={{ background: 'linear-gradient(135deg,#a090ff,#2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            smarter
          </span>
          ,<br />not harder.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto 2rem' }}>
          Upload any PDF or paste text — FlashMind turns it into a smart flashcard deck powered by spaced repetition.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')}>
            Create Deck →
          </button>
          {dueCards.length > 0 && (
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/decks')}>
              ⏰ {dueCards.length} Cards Due
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '3rem' }}>
        {[
          { num: allCards.length, lbl: 'Total Cards', color: 'var(--accent-light)' },
          { num: dueCards.length, lbl: 'Due Today', color: 'var(--amber)' },
          { num: masteredCards.length, lbl: 'Mastered', color: 'var(--green)' },
          { num: state.stats.streak, lbl: 'Day Streak', color: 'var(--pink)', suffix: '🔥' },
        ].map(({ num, lbl, color, suffix }) => (
          <div className="stat-block" key={lbl}>
            <div className="stat-num" style={{ color }}>{num}{suffix}</div>
            <div className="stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Due today */}
      {dueDecks.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div className="section-label">Due for review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dueDecks.map(d => {
              const due = d.cards.filter(isDue).length;
              return (
                <div key={d.id} className="card card-elevated" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '1rem 1.25rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.cards.length} cards total</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-due">⏰ {due} due</span>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/study/${d.id}?dueOnly=true`)}>
                      Study Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Decks */}
      {recentDecks.length > 0 ? (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="section-label" style={{ marginBottom: 0 }}>Recent Decks</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decks')}>View all →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {recentDecks.map(d => (
              <DeckCard key={d.id} deck={d} onStudy={id => navigate(`/study/${id}?dueOnly=true`)} />
            ))}
          </div>
        </section>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>📚</div>
          <p style={{ marginBottom: '1.25rem' }}>No decks yet. Create your first one!</p>
          <button className="btn btn-primary" onClick={() => navigate('/create')}>Create Deck →</button>
        </div>
      )}

      {/* How it works */}
      <section style={{ borderTop: '1px solid var(--border)', paddingTop: '3rem' }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: '2rem' }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '📄', title: 'Upload PDF or Text', desc: 'Drop in any study material — textbook chapter, class notes, lecture slides.' },
            { icon: '⚙', title: 'Smart Card Generation', desc: 'Rule-based NLP detects definitions, formulas, concepts, and bullet points.' },
            { icon: '🧠', title: 'SM-2 Scheduling', desc: 'Cards you know well space out. Tricky cards come back sooner. Like Anki.' },
            { icon: '📈', title: 'Track Mastery', desc: 'See what you\'ve mastered, what\'s shaky, and what\'s coming up for review.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
