const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { generateCards } = require('../cardGenerator');

const router = express.Router();

// Store in memory (no disk I/O needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt') || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and MD files are supported'));
    }
  }
});

// POST /api/upload/pdf
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let text = '';
    const filename = req.file.originalname;

    if (req.file.mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      // Parse PDF
      const data = await pdfParse(req.file.buffer);
      text = data.text;

      if (!text || text.trim().length < 30) {
        return res.status(422).json({ error: 'PDF appears to be scanned/image-based. Please use a text-based PDF.' });
      }
    } else {
      // Plain text
      text = req.file.buffer.toString('utf-8');
    }

    // Clean text
    text = cleanExtractedText(text);

    // Generate cards
    const cards = generateCards(text);

    if (cards.length === 0) {
      return res.status(422).json({
        error: 'Could not extract enough structured content. Try a PDF with clear headings, definitions, or bullet points.',
        textPreview: text.slice(0, 200)
      });
    }

    res.json({
      success: true,
      filename,
      textLength: text.length,
      cards,
      cardCount: cards.length,
      textPreview: text.slice(0, 300),
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

// POST /api/upload/text  
router.post('/text', express.json(), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'Text is too short. Please provide at least a paragraph.' });
    }

    const cleaned = cleanExtractedText(text);
    const cards = generateCards(cleaned);

    res.json({
      success: true,
      cards,
      cardCount: cards.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function cleanExtractedText(text) {
  return text
    .replace(/\f/g, '\n')                          // form feeds → newlines
    .replace(/([a-z])-\n([a-z])/g, '$1$2')         // rejoin hyphenated words
    .replace(/\n{3,}/g, '\n\n')                    // collapse excessive blank lines
    .replace(/[ \t]{2,}/g, ' ')                    // collapse multiple spaces
    .replace(/^\s*\d+\s*$/gm, '')                  // remove lone page numbers
    .trim();
}

module.exports = router;
