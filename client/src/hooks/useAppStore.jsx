import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { sm2, isDue } from '../utils/sm2';

const AppContext = createContext(null);

const DECK_COLORS = ['#7c6fff','#2dd4bf','#ff6b6b','#fbbf24','#60a5fa','#f472b6','#34d399','#fb923c'];

function getInitialState() {
  try {
    const saved = localStorage.getItem('flashmind_state_v3');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    decks: [],
    stats: { streak: 0, lastStudyDate: null, totalReviewed: 0, totalSessions: 0 },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_DECK': {
      const color = DECK_COLORS[state.decks.length % DECK_COLORS.length];
      const deck = { ...action.deck, color: action.deck.color || color, createdAt: Date.now(), updatedAt: Date.now() };
      return { ...state, decks: [...state.decks, deck] };
    }
    case 'DELETE_DECK':
      return { ...state, decks: state.decks.filter(d => d.id !== action.id) };
    case 'UPDATE_DECK':
      return {
        ...state,
        decks: state.decks.map(d => d.id === action.id ? { ...d, ...action.updates, updatedAt: Date.now() } : d)
      };
    case 'REVIEW_CARD': {
      const { deckId, cardId, quality } = action;
      return {
        ...state,
        decks: state.decks.map(d => {
          if (d.id !== deckId) return d;
          return {
            ...d,
            updatedAt: Date.now(),
            cards: d.cards.map(c => c.id === cardId ? sm2(c, quality) : c),
          };
        }),
      };
    }
    case 'FINISH_SESSION': {
      const today = new Date().toISOString().split('T')[0];
      const { streak, lastStudyDate } = state.stats;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      const newStreak = lastStudyDate === today ? streak
        : lastStudyDate === yStr ? streak + 1 : 1;
      return {
        ...state,
        stats: {
          ...state.stats,
          streak: newStreak,
          lastStudyDate: today,
          totalReviewed: state.stats.totalReviewed + action.count,
          totalSessions: state.stats.totalSessions + 1,
        }
      };
    }
    case 'IMPORT_STATE':
      return action.state;
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);

  // Persist to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('flashmind_state_v3', JSON.stringify(state)); } catch {}
  }, [state]);

  // Computed helpers
  const allCards = state.decks.flatMap(d => d.cards || []);
  const dueCards = allCards.filter(isDue);
  const masteredCards = allCards.filter(c => c.mastery === 'mastered');

  const value = {
    state,
    dispatch,
    allCards,
    dueCards,
    masteredCards,
    getDeck: (id) => state.decks.find(d => d.id === id),
    getDeckDue: (id) => {
      const deck = state.decks.find(d => d.id === id);
      return deck ? deck.cards.filter(isDue) : [];
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be inside AppProvider');
  return ctx;
}
