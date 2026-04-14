const { v4: uuidv4 } = require('uuid');

/**
 * Advanced Rule-Based Flashcard Generator — v2
 *
 * Generates exam-quality, context-aware flashcards.
 * Every question embeds the specific concept name from source text.
 * Vague questions ("What is this?", "Explain the topic") are blocked by design.
 */

// ─── VAGUE WORD BLOCKLIST ────────────────────────────────────────────────────
const VAGUE_TOKENS = new Set([
  'this', 'that', 'these', 'those', 'thing', 'things',
  'topic', 'chapter', 'section', 'concept', 'stuff', 'item',
  'it', 'something', 'aspect',
]);

const MIN_SUBJECT_LEN = 4; // reject subjects shorter than 4 chars

// ─── DEFINITION PATTERNS ────────────────────────────────────────────────────
const DEFINITION_PATTERNS = [
  // "Photosynthesis is defined as ..."
  {
    re: /^(.{4,70}?)\s+is\s+defined\s+as\s+(.{12,350})$/i,
    q: m => `How is ${cap(m[1].trim())} defined, and what does it describe?`,
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
  // "Kinetic energy is the energy ..." (capitalised noun phrase)
  {
    re: /^([A-Z][a-z]{2,35}(?:\s+[a-zA-Z]{2,20}){0,3})\s+is\s+((?:the|a|an)\s+.{15,280})$/,
    q: m => `What is ${m[1].trim()}, and how is it characterised?`,
    a: m => `${m[1].trim()} is ${m[2].trim()}`,
  },
  // "Momentum: product of mass and velocity"
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
  // "X causes / produces / leads to Y"
  {
    re: /^(.{5,60}?)\s+(causes?|produces?|results?\s+in|leads?\s+to|increases?|decreases?)\s+(.{10,250})$/i,
    q: m => `How does ${m[1].trim()} affect ${stripArticle(m[3].trim())}? Describe the relationship.`,
    a: m => `${m[1].trim()} ${m[2].trim()} ${m[3].trim()}.`,
  },
  // "X depends on / is affected by Y"
  {
    re: /^(.{5,60}?)\s+(depends?\s+on|is\s+affected\s+by|varies?\s+with)\s+(.{5,200})$/i,
    q: m => `What factors does ${m[1].trim()} depend on, and how do they influence it?`,
    a: m => `${m[1].trim()} ${m[2].trim()} ${m[3].trim()}.`,
  },
];

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const FORMULA_KEYWORDS = ['formula', 'equation', 'calculate', 'equals', 'theorem', 'law', 'rule', 'expression', 'given by', 'written as'];
const MATH_RE = /[=].*[\d\w]|[²³√∫∑∏πΔλΩ]|[\d]+\s*[×÷]/;
const LIST_PREFIXES = /^[\d]+[.)]\s+|^[•\-\*\+]\s+/;
const HEADING_RE = /^#{1,4}\s+(.+)$|^([A-Z][A-Z\s]{4,}[A-Z])$/;
const TRIVIAL_HEADINGS = /^(introduction|overview|summary|conclusion|preface|contents|index|references|appendix)$/i;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeCard(question, answer, topic, type) {
  return {
    id: uuidv4(),
    question: cap(question.trim()),
    answer: answer.trim(),
    tags: topic ? [topic.slice(0, 40)] : [],
    type,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: null,
    mastery: 'new',
    lastQuality: null,
    reviewCount: 0,
  };
}

function cap(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripArticle(str) {
  return str.replace(/^(the|a|an)\s+/i, '');
}

/** True if question is too vague or short to be useful */
function isVague(question) {
  if (!question) return true;
  const words = question.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 5) return true;
  for (const w of words) {
    if (VAGUE_TOKENS.has(w)) return true;
  }
  return false;
}

/** Extract a meaningful grammatical subject from a sentence */
function extractConceptSubject(sentence) {
  const m = sentence.match(/^([A-Z][a-zA-Z\s\-]{3,50}?)\s+(?:is|are|was|were|can|will|has|have|represents?|describes?)\b/);
  if (m && m[1].trim().length >= MIN_SUBJECT_LEN) return m[1].trim();
  return null;
}

/** Trim to at most 3 sentences */
function compressAnswer(text) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  return sentences.slice(0, 3).join(' ').trim();
}

/** Build a context-rich question from a plain sentence */
function buildSentenceCard(sentence, heading) {
  const concept = extractConceptSubject(sentence);

  if (concept && concept.length >= MIN_SUBJECT_LEN) {
    if (/\bincrease|decrease|affect|cause|lead|result/i.test(sentence)) {
      return { q: `How does ${concept} affect related quantities or phenomena?`, a: compressAnswer(sentence) };
    }
    if (/\bused|applied|employed|utilised/i.test(sentence)) {
      return { q: `In what situations is ${concept} used or applied?`, a: compressAnswer(sentence) };
    }
    if (/\bconsist|contain|compos|made of|made up/i.test(sentence)) {
      return { q: `What does ${concept} consist of or contain?`, a: compressAnswer(sentence) };
    }
    return { q: `Explain the role and significance of ${concept}.`, a: compressAnswer(sentence) };
  }

  if (heading && heading.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(heading.toLowerCase())) {
    const shortSent = sentence.split(' ').slice(0, 10).join(' ');
    return {
      q: `In the context of "${heading}", what does the following describe: "${shortSent}..."?`,
      a: compressAnswer(sentence),
    };
  }

  return null;
}

// ─── MAIN GENERATOR ──────────────────────────────────────────────────────────

function generateCards(text) {
  if (!text || text.trim().length < 20) return [];

  const cards = [];
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let currentHeading = null;
  let prevLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── 1. Heading detection ──────────────────────────────────────────────────
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/) || line.match(/^([A-Z][A-Z\s]{4,}[A-Z])$/);
    if (headingMatch) {
      currentHeading = (headingMatch[1] || headingMatch[0]).trim();
      if (!TRIVIAL_HEADINGS.test(currentHeading) && currentHeading.length >= MIN_SUBJECT_LEN && currentHeading.length < 80) {
        const nextContent = lines
          .slice(i + 1, i + 5)
          .filter(l => l.length > 20 && !l.match(/^#+/))
          .slice(0, 2)
          .join(' ');
        if (nextContent) {
          const q = `What is "${currentHeading}" and what are its key characteristics?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(nextContent), currentHeading, 'concept'));
          }
        }
      }
      prevLine = line;
      continue;
    }

    // ── 2. Definition patterns ────────────────────────────────────────────────
    let matched = false;
    for (const pat of DEFINITION_PATTERNS) {
      const m = line.match(pat.re);
      if (m && m[1] && m[2]) {
        const subject = m[1].trim();
        if (subject.length < MIN_SUBJECT_LEN || VAGUE_TOKENS.has(subject.toLowerCase())) break;
        const q = cap(pat.q(m));
        const a = compressAnswer(pat.a(m));
        if (!isVague(q) && a.length > 8) {
          cards.push(makeCard(q, a, currentHeading || subject, 'definition'));
          matched = true;
        }
        break;
      }
    }
    if (matched) { prevLine = line; continue; }

    // ── 3. Relationship patterns ──────────────────────────────────────────────
    for (const pat of RELATIONSHIP_PATTERNS) {
      const m = line.match(pat.re);
      if (m) {
        const q = cap(pat.q(m));
        const a = compressAnswer(pat.a(m));
        if (!isVague(q) && a.length > 8) {
          cards.push(makeCard(q, a, currentHeading, 'relationship'));
          matched = true;
        }
        break;
      }
    }
    if (matched) { prevLine = line; continue; }

    // ── 4. Formula / equation detection ──────────────────────────────────────
    if (MATH_RE.test(line) && line.length < 180) {
      const prevHasKeyword = FORMULA_KEYWORDS.some(k => prevLine.toLowerCase().includes(k));
      const rawLabel = prevHasKeyword
        ? prevLine.replace(/[:#\-]/g, '').trim()
        : currentHeading || null;

      if (rawLabel && rawLabel.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(rawLabel.toLowerCase().split(' ')[0])) {
        const label = rawLabel.slice(0, 80);
        const q = `What is the formula or equation for ${label}? Write it and identify each variable.`;
        if (!isVague(q)) {
          cards.push(makeCard(q, line, currentHeading, 'formula'));
        }
      }
      prevLine = line;
      continue;
    }

    // ── 5. Bullet / numbered list items ──────────────────────────────────────
    if (LIST_PREFIXES.test(line)) {
      const content = line.replace(LIST_PREFIXES, '').trim();
      if (content.length < 12) { prevLine = line; continue; }

      const kv = content.match(/^(.{5,55}?)\s*[:\-–—]\s+(.{10,})$/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim();
        if (key.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(key.toLowerCase())) {
          const q = `What is "${key}", and how is it defined or described?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(val), currentHeading || key, 'list-item'));
          }
        }
      } else if (currentHeading && currentHeading.length >= MIN_SUBJECT_LEN && !VAGUE_TOKENS.has(currentHeading.toLowerCase())) {
        const concept = extractConceptSubject(content);
        if (concept && concept.length >= MIN_SUBJECT_LEN) {
          const q = `How does ${concept} relate to ${currentHeading}?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(content), currentHeading, 'list-item'));
          }
        } else {
          const snippet = content.slice(0, 60) + (content.length > 60 ? '...' : '');
          const q = `What is one important aspect of "${currentHeading}" described as: "${snippet}"?`;
          if (!isVague(q)) {
            cards.push(makeCard(q, compressAnswer(content), currentHeading, 'list-item'));
          }
        }
      }
      prevLine = line;
      continue;
    }

    // ── 6. Sentence-level fallback (every 2nd qualifying line) ───────────────
    if (line.length > 65 && line.length < 400 && i % 2 === 0) {
      const sentences = (line.match(/[^.!?]+[.!?]*/g) || [line]).map(s => s.trim()).filter(s => s.length > 35);
      for (const sent of sentences) {
        const result = buildSentenceCard(sent, currentHeading);
        if (result && !isVague(result.q)) {
          cards.push(makeCard(result.q, result.a, currentHeading, 'concept'));
        }
        break;
      }
    }

    prevLine = line;
  }

  return deduplicateAndFinalize(cards);
}

// ─── DEDUP + FINAL VALIDATION ─────────────────────────────────────────────────

function deduplicateAndFinalize(cards) {
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

module.exports = { generateCards };
