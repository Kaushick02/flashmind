import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { isDue } from '../utils/sm2';

export default function Layout({ children }) {
  const { state, allCards, dueCards } = useAppStore();
  const location = useLocation();
  const isStudy = location.pathname.startsWith('/study');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isStudy && (
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(8,8,16,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 1.5rem',
          height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand */}
          <NavLink to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #a090ff, #2dd4bf)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ WebkitTextFillColor: 'initial', fontSize: '1.1rem' }}>⬡</span>
              FlashMind
            </div>
          </NavLink>

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { to: '/', label: 'Home' },
              { to: '/create', label: '+ Create' },
              { to: '/decks', label: 'My Decks' },
            ].map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-subtle)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'rgba(124,111,255,0.2)' : 'transparent',
                transition: 'var(--transition)',
                textDecoration: 'none',
              })}>
                {label}
              </NavLink>
            ))}
          </div>

          {/* Streak + due count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {dueCards.length > 0 && (
              <div style={{
                background: 'var(--amber-subtle)',
                border: '1px solid rgba(251,191,36,0.2)',
                color: 'var(--amber)',
                padding: '4px 10px', borderRadius: 20,
                fontSize: '0.78rem', fontWeight: 500,
              }}>
                ⏰ {dueCards.length} due
              </div>
            )}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '4px 12px', borderRadius: 20,
              fontSize: '0.8rem', color: 'var(--amber)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              🔥 <strong>{state.stats.streak}</strong>
            </div>
          </div>
        </nav>
      )}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
