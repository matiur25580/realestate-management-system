const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { parseAllowedOrigins, isAllowedOrigin } = require('./config/originPolicy');
const Booking = require('./models/Booking');
const { assertActiveBookingIndex } = require('./utils/activeBookingKey');

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Fail fast on missing or unsafe deployment settings before the API begins listening.
function validateEnvironment() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32
    || /^(your_|change-me|replace-me|secret)/i.test(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET must be a non-placeholder secret of at least 32 characters.');
  }
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
}

function configureApp() {
  const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL, process.env.NODE_ENV);

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin, allowedOrigins)) return callback(null, true);
      return callback(new Error('CORS_ORIGIN_DENIED'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/auth', require('./routes/otpAuth'));
  app.use('/api/properties', require('./routes/property'));
  app.use('/api/bookings', require('./routes/booking'));
  app.use('/api/maintenance', require('./routes/maintenance'));
  app.use('/api/rents', require('./routes/rent'));
  app.use('/api/reviews', require('./routes/review'));
  app.use('/api/wishlist', require('./routes/wishlist'));
  app.use('/api/leases', require('./routes/lease'));
  app.use('/api/analytics', require('./routes/analytics'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/export', require('./routes/export'));
  app.use('/api/notifications', require('./routes/notification'));
  app.use('/api/commissions', require('./routes/commission'));
  app.use('/api/expenses', require('./routes/expense'));
  app.use('/api/audit', require('./routes/audit'));
  app.use('/api/messages', require('./routes/message'));
  app.use('/api/documents', require('./routes/document'));
  app.use('/api/visits', require('./routes/visit'));
  app.use('/api/ratings', require('./routes/rating'));

  app.get('/', (_req, res) => res.json({ service: 'RealEstate API', status: 'ok' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (req, res) => res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'API route not found.' },
  }));
  app.use((error, _req, res, _next) => {
    if (error?.message === 'CORS_ORIGIN_DENIED') {
      return res.status(403).json({ error: { code: 'CORS_ORIGIN_DENIED', message: 'Request origin is not allowed.' } });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON.' } });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the 1 MB limit.' } });
    }
    console.error('Unhandled API error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
  });
}

async function startServer() {
  validateEnvironment();
  configureApp();
  await connectDB();
  await assertActiveBookingIndex(Booking);
  app.listen(PORT, () => console.log('RealEstate API listening on port ' + PORT));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer, validateEnvironment };
