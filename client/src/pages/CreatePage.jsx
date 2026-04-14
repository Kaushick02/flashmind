import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';
import { useToast } from '../hooks/useToast';
import { generateCardsFromText } from '../utils/cardGenerator';

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const SUBJECTS = ['general', 'math', 'science', 'history', 'language', 'other'];
const COLORS = ['#7c6fff', '#2dd4bf', '#ff6b6b', '#fbbf24', '#60a5fa', '#f472b6', '#34d399', '#fb923c'];

const GEN_STEPS = [
  { pct: 10, msg: 'Analysing text structure...' },
  { pct: 28, msg: 'Detecting definitions & concepts...' },
  { pct: 46, msg: 'Extracting key relationships...' },
  { pct: 62, msg: 'Identifying formulas & equations...' },
  { pct: 78, msg: 'Building flashcard pairs...' },
  { pct: 92, msg: 'Applying quality filters...' },
  { pct: 100, msg: 'Done! ✦' },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const { dispatch } = useAppStore();
  const toast = useToast();

  const [step, setStep] = useState('form');
  const [deckName, setDeckName] = useState('');
  const [subject, setSubject] = useState('general');
  const [color, setColor] = useState('#7c6fff');
  const [pasteText, setPasteText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [cards, setCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    if (!deckName) setDeckName(file.name.replace(/\.[^.]+$/, ''));

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload/pdf', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.cards && data.cards.length > 0) {
            toast(`PDF parsed! ${data.cards.length} cards ready.`, 'success');
            setStep('processing');
            await animateProgress();
            setCards(data.cards);
            setStep('preview');
            return;
          }
        }
      } catch {}
      toast('PDF server unavailable. Please copy-paste the text from your PDF.', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      setPasteText(e.target.result);
      toast('File loaded! Click Generate to create cards.', 'success');
    };
    reader.readAsText(file);
  }

  function onFileChange(e) { handleFile(e.target.files[0]); e.target.value = ''; }
  function onDrop(e) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function animateProgress() {
    for (let i = 0; i < GEN_STEPS.length - 1; i++) {
      await delay(300 + Math.random() * 200);
      setProgress(GEN_STEPS[i].pct);
      setProgressMsg(GEN_STEPS[i].msg);
    }
    await delay(200);
    setProgress(100);
    setProgressMsg(GEN_STEPS[GEN_STEPS.length - 1].msg);
    await delay(400);
  }

  async function startFromText() {
    if (!pasteText.trim() || pasteText.trim().length < 20) {
      toast('Please paste some study text first.', 'error');
      return;
    }
    setStep('processing');
    await animateProgress();
    const generated = generateCardsFromText(pasteText);
    if (!generated.length) {
      toast('No cards generated. Try definitions, bullet points, or headings.', 'error');
      setStep('form');
      return;
    }
    setCards(generated);
    setStep('preview');
  }

  function saveDeck() {
    if (!cards.length) { toast('No cards!', 'error'); return; }
    const deck = {
      id: genId(),
      name: deckName.trim() || 'Untitled Deck',
      subject, color,
      description: '',
      cards: cards.map(c => ({ ...c, id: c.id || genId() })),
    };
    dispatch({ type: 'ADD_DECK', deck });
    toast(`"${deck.name}" saved — ${deck.cards.length} cards 🎉`, 'success');
    navigate('/decks');
  }

  function removeCard(i) { setCards(p => p.filter((_, j) => j !== i)); }
  function updateCard(i, field, val) { setCards(p => p.map((c, j) => j === i ? { ...c, [field]: val } : c)); }

  // ── Processing ─────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="container page" style={{ maxWidth: 520, textAlign: 'center' }}>
        <div className="card card-elevated anim-pop" style={{ padding: '3.5rem 2rem', marginTop: '4rem' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', margin: '0 auto 1.5rem', animation: 'spin 0.8s linear infinite' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.5rem' }}>Generating Cards</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>Applying NLP rules to your study material...</p>
          <div className="progress-track" style={{ height: 8, marginBottom: '1rem' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minHeight: 22 }}>{progressMsg}</p>
        </div>
      </div>
    );
  }

  // ── Preview ────────────────────────────────────────────────
  if (step === 'preview') {
    const byType = cards.reduce((a, c) => { a[c.type || 'concept'] = (a[c.type || 'concept'] || 0) + 1; return a; }, {});
    return (
      <div className="container page">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginBottom: 6 }}>✦ {cards.length} Cards Generated</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(byType).map(([t, n]) => (
                <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{t}: {n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => { setStep('form'); setCards([]); }}>← Back</button>
            <button className="btn btn-primary" onClick={saveDeck} disabled={!cards.length}>Save Deck ({cards.length}) ✓</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map((card, i) => (
            <div key={card.id || i} className="card" style={{ padding: '1rem 1.25rem' }}>
              {editingCard === i ? (
                <div>
                  <label className="label">Question</label>
                  <input className="input" style={{ marginBottom: 10 }} value={card.question} onChange={e => updateCard(i, 'question', e.target.value)} />
                  <label className="label">Answer</label>
                  <textarea className="input" style={{ minHeight: 80, marginBottom: 10 }} value={card.answer} onChange={e => updateCard(i, 'answer', e.target.value)} />
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingCard(null)}>Done ✓</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: 'var(--accent-light)', minWidth: 24, paddingTop: 3, fontWeight: 700 }}>{String(i+1).padStart(2,'0')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4, fontSize: '0.9rem' }}>{card.question}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>{card.answer.length > 150 ? card.answer.slice(0,150)+'...' : card.answer}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                      {card.tags?.[0] && <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 20, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{card.tags[0]}</span>}
                      {card.type && <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 20, background: 'var(--accent-subtle)', color: 'var(--accent-light)', border: '1px solid rgba(124,111,255,0.15)' }}>{card.type}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingCard(i)}>✏</button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeCard(i)}>✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────
  return (
    <div className="container page" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.7rem', marginBottom: 6 }}>Create a Deck</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Upload a PDF, drop a .txt file, or paste your notes. Detects definitions, formulas, headings, and bullet points.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 12, marginBottom: '1.25rem' }}>
        <div>
          <label className="label">Deck Name</label>
          <input className="input" placeholder="e.g. Chapter 5 — Photosynthesis" value={deckName} onChange={e => setDeckName(e.target.value)} />
        </div>
        <div>
          <label className="label">Subject</label>
          <select className="input" value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Deck Color</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: color === c ? '3px solid rgba(255,255,255,0.7)' : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </div>

      <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`} style={{ marginBottom: '1.5rem' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}>
        <input type="file" accept=".pdf,.txt,.md" onChange={onFileChange} />
        <div style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{fileName ? '✅' : '📄'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{fileName ? `Loaded: ${fileName}` : 'Drop PDF or text file here'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>PDF, TXT, MD · or click to browse</div>
        </div>
      </div>

      <div style={{ position: 'relative', textAlign: 'center', margin: '1.25rem 0' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid var(--border)' }} />
        <span style={{ position: 'relative', background: 'var(--bg-base)', padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>or paste text directly</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">Study Material</label>
        <textarea className="input" style={{ minHeight: 220, fontSize: '0.88rem', lineHeight: 1.75 }}
          placeholder={`Paste your notes here…\n\nExample:\n## Photosynthesis\nPhotosynthesis is defined as the process by which plants convert sunlight into energy.\nThe formula for photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂\nChlorophyll refers to the green pigment absorbing light.\n- Light reactions: occur in thylakoid membranes\n- Calvin cycle: fixes CO₂ into organic molecules\n\n## Quadratic Equations\nA quadratic equation is defined as ax² + bx + c = 0 where a ≠ 0.\nThe discriminant refers to b²-4ac and determines the number of roots.`}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Patterns: definitions · formulas · headings · bullets · fill-blank</span>
          <span>{pasteText.length} chars</span>
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={startFromText} disabled={pasteText.trim().length < 20}>
        ✦ Generate Flashcards
      </button>
    </div>
  );
}
