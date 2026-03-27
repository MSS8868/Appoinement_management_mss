require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const { sequelize } = require('./models');
const { releaseExpiredLocks } = require('./utils/slotEngine');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // allow all in dev — restrict in production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/send-otp', rateLimit({ windowMs: 60 * 1000, max: 5 }));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Static ───────────────────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'OK',
  service: 'MediCare Hospital API',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Cron: release expired slot locks every minute ────────────────────────────
cron.schedule('* * * * *', async () => {
  try { await releaseExpiredLocks(); } catch (e) { logger.error('Cron lock-release error:', e); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connected');
    // force:false = never drop tables; alter:false = never modify existing schema
    // Run "npm run seed" to create fresh schema + data
    await sequelize.sync({ force: false, alter: false });
    logger.info('✅ Database synced');
    app.listen(PORT, () => {
      logger.info(`🚀 Server on http://localhost:${PORT}`);
      logger.info(`💊 Health: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('❌ Startup failed:', err);
    process.exit(1);
  }
}
start();
module.exports = app;
