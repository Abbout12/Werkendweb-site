'use strict';
require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const path       = require('path');

const app    = express();
const PORT   = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        styleSrc:       ["'self'", 'https://fonts.googleapis.com'],
        fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc:      ["'self'"],
        imgSrc:         ["'self'", 'data:'],
        connectSrc:     ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:  isProd ? (process.env.ALLOWED_ORIGIN || false) : '*',
    methods: ['GET', 'POST'],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Static bestanden ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Rate limiter (max 5 aanvragen per minuut per IP) ──────────────────────────
const contactLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message: {
    success: false,
    message: 'Te veel verzoeken. Probeer het over een minuut opnieuw.',
  },
});

// ── Validatieregels ───────────────────────────────────────────────────────────
const contactValidation = [
  body('naam')
    .trim()
    .notEmpty().withMessage('Naam is verplicht.')
    .isLength({ min: 2, max: 100 }).withMessage('Naam moet tussen 2 en 100 tekens zijn.')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('E-mailadres is verplicht.')
    .isEmail().withMessage('Voer een geldig e-mailadres in.')
    .normalizeEmail(),

  body('bericht')
    .trim()
    .notEmpty().withMessage('Bericht is verplicht.')
    .isLength({ min: 10, max: 2000 }).withMessage('Bericht moet minimaal 10 tekens bevatten.')
    .escape(),

  body('bedrijf')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .escape(),

  body('telefoon')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .escape(),

  // Honeypot: moet altijd leeg zijn — bots vullen het in
  body('honeypot')
    .custom((value) => {
      if (value && value.trim() !== '') throw new Error('Bot detected');
      return true;
    }),
];

// ── POST /api/contact ─────────────────────────────────────────────────────────
app.post('/api/contact', contactLimiter, contactValidation, async (req, res) => {
  // Stil negeren als honeypot is ingevuld (bot)
  if (req.body.honeypot && req.body.honeypot.trim() !== '') {
    return res.json({ success: true });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { naam, email, bedrijf, telefoon, bericht } = req.body;

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from:    `"WerkendWeb Formulier" <${process.env.SMTP_USER}>`,
    to:      process.env.CONTACT_EMAIL || 'info@werkendweb.nl',
    replyTo: email,
    subject: `Nieuwe websiteaanvraag van ${naam}`,

    text: [
      `Naam:     ${naam}`,
      `Bedrijf:  ${bedrijf  || '—'}`,
      `E-mail:   ${email}`,
      `Telefoon: ${telefoon || '—'}`,
      '',
      'Bericht:',
      bericht,
    ].join('\n'),

    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f0f0e;padding:24px">
        <h2 style="border-bottom:2px solid #c8502a;padding-bottom:12px;color:#c8502a;margin-bottom:24px">
          Nieuwe websiteaanvraag
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
          <tr>
            <td style="padding:8px 0;font-weight:600;width:110px;vertical-align:top">Naam</td>
            <td style="padding:8px 0">${naam}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:600;vertical-align:top">Bedrijf</td>
            <td style="padding:8px 0">${bedrijf || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:600;vertical-align:top">E-mail</td>
            <td style="padding:8px 0"><a href="mailto:${email}" style="color:#c8502a">${email}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:600;vertical-align:top">Telefoon</td>
            <td style="padding:8px 0">${telefoon || '—'}</td>
          </tr>
        </table>
        <h3 style="margin-bottom:10px">Bericht</h3>
        <p style="background:#f7f4ef;padding:18px;border-radius:8px;line-height:1.7;white-space:pre-wrap;margin:0">${bericht}</p>
        <p style="color:#7a7670;font-size:11px;margin-top:32px;border-top:1px solid #ede9e2;padding-top:16px">
          Verzonden via het contactformulier op werkendweb.nl
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: 'Uw aanvraag is verzonden.' });
  } catch (err) {
    console.error('[Mail error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Verzenden mislukt. Probeer opnieuw of mail ons direct op info@werkendweb.nl.',
    });
  }
});

// ── POST /bedankt.html (lokale simulatie van Netlify form redirect) ───────────
app.post('/bedankt.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/bedankt.html'));
});

// ── Catch-all → index.html ────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Lokaal starten / Vercel export ────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  WerkendWeb draait op http://localhost:${PORT}\n`);
  });
}

module.exports = app;
