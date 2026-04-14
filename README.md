# ⬡ FlashMind — Smart Spaced Repetition Flashcard Engine

A full-stack flashcard app that turns any PDF or text into a smart study deck using a rule-based NLP engine and the SM-2 spaced repetition algorithm. **No AI API required.**

---

## ✦ Features

| Feature | Details |
|---|---|
| **PDF Upload** | Server parses PDF text via `pdf-parse` |
| **Text Paste** | Paste any study material directly |
| **Smart Card Generation** | Detects definitions, formulas, headings, bullet points, relationships |
| **SM-2 Algorithm** | Full SuperMemo 2 scheduling (like Anki) |
| **Mastery Tracking** | New → Learning → Mastered progression |
| **Spaced Repetition** | Cards due today shown first, longer intervals as you improve |
| **Keyboard Shortcuts** | Space to flip, 1-4 to rate |
| **Streak Tracking** | Daily study streak counter |
| **Deck Management** | Create, browse, filter, delete decks |
| **Dark UI** | Stunning dark theme with Syne + DM Sans typography |
| **LocalStorage Persistence** | Works 100% offline (no DB needed) |
| **MongoDB Support** | Optional — enables server-side PDF parsing |

---

## 🚀 Quick Start (Frontend only — no server needed)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:3000

> Works fully offline. All data stored in browser localStorage.

---

## 🖥 Full Stack (with PDF server)

### Requirements
- Node.js 18+
- MongoDB (optional — app works without it)

### Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure server environment
cp server/.env.example server/.env
# Edit server/.env — set MONGO_URI if you have MongoDB

# 3. Start both servers concurrently
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Without MongoDB
The server still works — it uses in-memory storage when MongoDB is unavailable. PDF parsing still works; data just won't persist between server restarts.

---

## 📁 Project Structure

```
flashmind/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── main.jsx            # App entry + router
│   │   ├── styles/globals.css  # Design system
│   │   ├── hooks/
│   │   │   ├── useAppStore.jsx # Global state (localStorage)
│   │   │   └── useToast.jsx    # Toast notifications
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Nav + wrapper
│   │   │   └── DeckCard.jsx    # Deck card component
│   │   ├── pages/
│   │   │   ├── HomePage.jsx    # Dashboard + stats
│   │   │   ├── CreatePage.jsx  # Upload + generate flow
│   │   │   ├── DecksPage.jsx   # Browse decks
│   │   │   ├── DeckDetailPage.jsx # Deck view + cards
│   │   │   └── StudyPage.jsx   # Study session + ratings
│   │   └── utils/
│   │       ├── sm2.js          # SM-2 algorithm
│   │       └── cardGenerator.js # Rule-based NLP
│   └── package.json
│
└── server/                     # Express backend
    ├── src/
    │   ├── index.js            # Server entry
    │   ├── models.js           # MongoDB schemas
    │   ├── sm2.js              # SM-2 (server copy)
    │   ├── cardGenerator.js    # Card generation
    │   └── routes/
    │       ├── upload.js       # PDF/text parsing
    │       ├── decks.js        # CRUD for decks
    │       └── cards.js        # Review submission
    └── package.json
```

---

## 🧠 How Card Generation Works

The rule-based engine runs 6 pattern detectors over your text:

1. **Definition patterns** — `"X is defined as Y"` → Q: What is X? A: Y
2. **Reference patterns** — `"X refers to Y"`, `"X means Y"`
3. **The-of patterns** — `"The formula for X is Y"` → Q: What is the formula for X?
4. **Formula detection** — Lines with `=`, `²`, `√`, math symbols
5. **Bullet/list items** — `• item: description` → Q: What is item?
6. **Sentence fallback** — Long sentences → fill-in-blank cards

### Best results: format your text like this
```
## Topic Heading

Photosynthesis is defined as the process by which plants convert sunlight into glucose.
The formula for photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂
Chlorophyll refers to the green pigment that absorbs light.

Key stages:
- Light-dependent reactions: occur in thylakoid membranes
- Calvin cycle: fixes CO₂ into organic molecules
```

---

## 🔬 SM-2 Algorithm

Each card tracks:
- `easeFactor` (starts at 2.5, adjusts with ratings)
- `interval` (days until next review)
- `repetitions` (consecutive correct answers)
- `nextReview` (date string)
- `mastery` (new → learning → mastered)

Rating scale: **Again (0)** · **Hard (1)** · **Good (3)** · **Easy (5)**

---

## ⌨ Keyboard Shortcuts (Study Mode)

| Key | Action |
|---|---|
| `Space` or `Enter` | Flip card |
| `1` | Rate: Again |
| `2` | Rate: Hard |
| `3` | Rate: Good |
| `4` | Rate: Easy |

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router 6, Vite |
| Styling | Pure CSS (design system in globals.css) |
| State | useReducer + localStorage |
| Backend | Express.js |
| PDF Parsing | pdf-parse |
| Database | MongoDB (optional) |
| Algorithm | SM-2 (SuperMemo 2) |

---

## 📝 License

MIT — free to use, modify, and distribute.
