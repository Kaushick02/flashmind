/**
 * Client-side Rule-Based Flashcard Generator — v2
 * High-quality, context-aware, exam-level question generation.
 * Every question references a specific concept from the source text.
 */

let _idCounter = 0;
const uid = () => `card_${Date.now()}_${_idCounter++}`;

// ─── VAGUE WORD BLOCKLIST ────────────────────────────────────────────────────
// Any question containing these bare words (as whole tokens) is rejected.
const VAGUE_TOKENS = new Set([
  'this', 'that', 'these', 'those', 'thing', 'things',
  'topic', 'chapter', 'section', 'concept', 'stuff', 'item',
  'it', 'something', 'aspect',
]);

// Minimum meaningful subject length — rejects 1-2 word stub subjects
const MIN_SUBJECT_LEN = 4;

// ─── DEFINITION PATTERNS ────────────────────────────────────────────────────
// Each pattern: regex → question builder → answer builder
// Questions are SPECIFIC: they embed the exact concept name from the match.
const DEFINITION_PATTERNS = [
  // "Photosynthesis is defined as ..."
  {
    re: /^(.{4,70}?)\s+is\s+defined\s+as\s+(.{12,350})$/i,
    q: m => `How is ${titleCase(m[1].trim())} defined, and what does it describe?`,
    a: m => m[2].trim(),
  },
  // "Osmosis refers to ..."
  {
    re: /^(.{4,70}?)\s+refers?\s+to\s+(.{12,350})$/i,
    q: m => `What does the term "${m[1].trim()}" refer to in this context?`,
    a: m => m[2].trim(),
  },
  // "Entropy means ..."
  {
    re: /^(.{4,70}?)\s+means?\s+(.{12,350})$/i,
    q: m => `What is meant by "${m[1].trim()}" and how is it used?`,
    a: m => m[2].trim(),
  },
  // "Kinetic energy is the energy ..."  (capitalised noun phrase)
  {
    re: /^([A-Z][a-z]{2,35}(?:\s+[a-zA-Z]{2,20}){0,3})\s+is\s+((?:the|a|an)\s+.{15,280})$/,
    q: m => `What is ${m[1].trim()}, and how is it characterised?`,
    a: m => `${m[1].trim()} is ${m[2].trim()}`,
  },
  // "Momentum: product of mass and velocity"  (colon-definition)
  {
    re: /^([A-Z][^\n:]{3,55}):\s+(.{18,320})$/,
    q: m => `Define "${m[1].trim()}" and explain its significance.`,
    a: m => m[2].trim(),
  },
];

// ─── RELATIONSHIP PATTERNS ──────────────────────────────────────────────────
const RELATIONSHIP_PATTERNS = [
  // "The boiling point of water is 100°C"
  {
    re: /^The\s+([\w\s]{3,40}?)\s+of\s+(.{4,55}?)\s+is\s+(.{5,220})$/i,
    q: m => `What is the ${m[1].trim()} of ${m[2].trim()}, and why is it significant?`,
    a: m => `The ${m[1].trim()} of ${m[2].trim()} is ${m[3].trim()}.`,
  },
  // "The formula for velocity is ..."
  {
    re: /^The\s+(formula|equation|expression|rule|law|theorem)\s+for\s+(.{4,55}?)\s+is\s+(.{5,220})$/i,
    q: m => `What is the ${m[1].trim()} for ${m[2].trim()}? Write it and explain each term.`,
    a: m => `The ${m[1].trim()} for ${m[2].trim()} is: ${m[3].trim()}.`,
  },
  // "Newton's Second Law states that ..."
  {
    re: /^(.{5,60}?)\s+states?\s+that\s+(.{15,300})$/i,
    q: m => `What does ${m[1].trim()} state, and what are its key implications?`,
    a: m => m[2].trim(),
  },
  // "X causes / produces / results in Y"
  {
    re: /^(.{5,60}?)\s+(causes?|produces?|results?\s+in|leads?\s+to|increases?|decreases?)\s+(.{10,250})$/i,
    q: m => `How does ${m[1].trim()} relate to ${stripLeadingArticle(m[3].trim())}? What is the effect?`,
    a: m => `${m[1].trim()} ${m[2].trim()} ${m[3].trim()}.`,
  },
  // "X depends on / is affected by Y"
  {
    re: /^(.{5,60}?)\s+(depends?\s+on|is\s+affected\s+by|varies?\s+with)\s+(.{5,200})$/i,
    q: m => `What factors does ${m[1].trim()} depend on, and how do they influence it?`,
    a: m => `${m[1].trim()} ${m[2].trim()} ${m[3].trim()}.`,
  },
];

// ─── FORMULA / MATH PATTERNS ────────────────────────────────────────────────
const FORMULA_KEYWORDS = ['formula', 'equation', 'calculate', 'equals', 'theorem', 'law', 'rule', 'expression', 'given by', 'written as'];
const MATH_RE = /[=].*[\d\w]|[²³√∫∑∏πΔλΩ]|[\d]+\s*[×÷]/;

// ─── STRUCTURAL REGEXES ──────────────────────────────────────────────────────
const LIST_RE = /^[\d]+[.)]\s+|^[•\-\*\+]\s+/;
const HEADING_RE = /^#{1,4}\s+(.+)$|^([A-Z][A-Z\s]{4,}[A-Z])$/;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function uid7() { return uid(); }

function makeCard(question, answer, topic, type = 'concept') {
  return {
    id: uid7(),
    question: question.trim(),
    answer: answer.trim(),
    tags: topic ? [topic.slice(0, 40)] : [],
    type,
    easeFactor: 2.5, interval: 0, repetitions: 0,
    nextReview: null, mastery: 'new', lastQuality: null, reviewCount: 0,
  };
}

function cap(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function titleCase(str) {
  // Keep original capitalisation for proper nouns; just cap first letter
  return cap(str);
}

function stripLeadingArticle(str) {
  return str.replace(/^(the|a|an)\s+/i, '');
}

/** Returns true if a question is too vague to be useful */
function isVague(question) {
  if (!question) return true;
  const words = question.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  // Too short
  if (words.length < 5) return true;
  // Contains blocklisted vague tokens as standalone words
  for (const w of words) {
    if (VAGUE_TOKENS.has(w)) return true;
  }
  return false;
}

/** Extract a meaningful subject noun-phrase from a sentence */
function extractConceptSubject(sentence) {
  // Match "ConceptName is/are/was/can/has ..."
  const m = sentence.match(/^([A-Z][a-zA-Z\s\-]{3,50}?)\s+(?:is|are|was|were|can|will|has|have|represents?|describes?)\b/);
  if (m && m[1].trim().length >= MIN_SUBJECT_LEN) return m[1].trim();
  return null;
}

/** Compress an answer to ≤3 concise sentences */
function compressAnswer(text) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  return sentences.slice(0, 3).join(' ').trim();
}

/** Build a context-rich sentence-level question when no pattern fires */
function buildSentenceCard(sentence, heading) {
  const concept = extractConceptSubject(sentence);
  if (concept && concept.length >= MIN_SUBJECT_LEN) {
    // Determine question flavour based on verb clue
    if (/\bincrease|decrease|affect|cause|lead|result/i.test(sentence)) {
      return {
        q: `How does ${concept} affect related quantities or phenomena?`,
        a: compressAnswer(sentence),
      };
    }
    if (/\bused|applied|employed|utilised/i.test(sentence)) {
      return {
        q: `In what situations is ${concept} used or applied?`,
        a: compressAnswer(sentence),
      };
    }
    if (/\bconsist|contain|compos|made of|made up/i.test(sentence)) {
      return {
        q: `What does ${concept} consist of or contain?`,
        a: compressAnswer(sentence),
      };
    }
    return {
      q: `Explain the role and significance of ${concept}.`,
      a: compressAnswer(sentence),
    };
  }

  // No extractable subject — use heading context
  if (heading && heading.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(heading.toLowerCase())) {
    const shortSent = sentence.split(' ').slice(0, 10).join(' ');
    return {
      q: `In the context of "${heading}", what does the following describe: "${shortSent}..."?`,
      a: compressAnswer(sentence),
    };
  }

  return null; // discard — cannot build a meaningful question
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function generateCardsFromText(text) {
  if (!text || text.trim().length < 20) return [];

  const cards = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let heading = null;
  let prevLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── 1. Heading detection ──────────────────────────────────────────────────
    const hm = line.match(HEADING_RE);
    if (hm) {
      heading = (hm[1] || hm[2] || line).replace(/^#+\s*/, '').trim();
      // Only generate heading card if heading is substantive (not "Introduction", etc.)
      const trivial = /^(introduction|overview|summary|conclusion|preface|contents|index)$/i.test(heading);
      if (!trivial && heading.length >= MIN_SUBJECT_LEN && heading.length < 80) {
        const nextContent = lines
          .slice(i + 1, i + 5)
          .filter(l => l.length > 20 && !HEADING_RE.test(l))
          .slice(0, 2)
          .join(' ');
        if (nextContent) {
          const q = `What is "${heading}" and what are its key characteristics?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(nextContent), heading, 'concept'));
          }
        }
      }
      prevLine = line;
      continue;
    }

    // ── 2. Definition patterns ────────────────────────────────────────────────
    let matched = false;
    for (const p of DEFINITION_PATTERNS) {
      const m = line.match(p.re);
      if (m && m[1] && m[2]) {
        const subject = m[1].trim();
        // Reject vague subjects
        if (subject.length < MIN_SUBJECT_LEN || VAGUE_TOKENS.has(subject.toLowerCase())) break;
        const q = cap(p.q(m));
        const a = compressAnswer(p.a(m));
        if (!isVague(q) && a.length > 8) {
          cards.push(makeCard(q, a, heading || subject, 'definition'));
          matched = true;
        }
        break;
      }
    }
    if (matched) { prevLine = line; continue; }

    // ── 3. Relationship patterns ──────────────────────────────────────────────
    for (const p of RELATIONSHIP_PATTERNS) {
      const m = line.match(p.re);
      if (m) {
        const q = cap(p.q(m));
        const a = compressAnswer(p.a(m));
        if (!isVague(q) && a.length > 8) {
          cards.push(makeCard(q, a, heading, 'relationship'));
          matched = true;
        }
        break;
      }
    }
    if (matched) { prevLine = line; continue; }

    // ── 4. Formula / equation detection ──────────────────────────────────────
    if (MATH_RE.test(line) && line.length < 180) {
      // Derive label: prefer prev line keyword > heading > reject
      const prevHasKeyword = FORMULA_KEYWORDS.some(k => prevLine.toLowerCase().includes(k));
      const rawLabel = prevHasKeyword
        ? prevLine.replace(/[:#\-]/g, '').trim()
        : heading || null;

      if (rawLabel && rawLabel.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(rawLabel.toLowerCase().split(' ')[0])) {
        const label = rawLabel.slice(0, 80);
        const q = `What is the formula or equation for ${label}? Write it and identify each variable.`;
        if (!isVague(q)) {
          cards.push(makeCard(q, line, heading, 'formula'));
        }
      }
      prevLine = line;
      continue;
    }

    // ── 5. Bullet / numbered list items ──────────────────────────────────────
    if (LIST_RE.test(line)) {
      const content = line.replace(LIST_RE, '').trim();
      if (content.length < 12) { prevLine = line; continue; }

      // Try "Key: Value" split
      const kv = content.match(/^(.{5,55}?)\s*[:\-–—]\s+(.{10,})$/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim();
        if (key.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(key.toLowerCase())) {
          const q = `What is "${key}", and how is it defined or described?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(val), heading || key, 'list-item'));
          }
        }
      } else if (heading && heading.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(heading.toLowerCase())) {
        // Deduce question from content verbs
        const concept = extractConceptSubject(content);
        if (concept && concept.length >= MIN_SUBJECT_LEN) {
          const q = `How does ${concept} relate to ${heading}?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(content), heading, 'list-item'));
          }
        } else {
          const q = `What is one important aspect of "${heading}" described as: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(content), heading, 'list-item'));
          }
        }
      }
      // No heading and no kv → skip (would be vague)
      prevLine = line;
      continue;
    }

    // ── 6. Sentence-level fallback (every 2nd qualifying line) ───────────────
    if (line.length > 65 && line.length < 400 && i % 2 === 0) {
      const sentences = (line.match(/[^.!?]+[.!?]*/g) || [line]).map(s => s.trim()).filter(s => s.length > 35);
      for (const sent of sentences) {
        const result = buildSentenceCard(sent, heading);
        if (result && !isVague(result.q)) {
          cards.push(makeCard(result.q, result.a, heading, 'concept'));
        }
        break; // max 1 per line
      }
    }

    prevLine = line;
  }

  // ── Final: dedup + validate ───────────────────────────────────────────────
  const seen = new Set();
  return cards
    .filter(c => {
      if (!c.question || !c.answer) return false;
      if (isVague(c.question)) return false;
      if (c.answer.trim().length < 8) return false;
      if (c.question.length > 220 || c.answer.length > 500) return false;
      const key = c.question.toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}
