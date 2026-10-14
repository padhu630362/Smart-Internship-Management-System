import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import { sanitizeInput } from './middlewares/sanitize.js';

const app = express();

// Disable information disclosure headers
app.disable('x-powered-by');

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by client assets
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-Origin Resource Sharing
const envAllowed = (env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  env.CLIENT_URL,
  ...envAllowed,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile clients, curl, server-to-server) or matching allowed origins
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
        return callback(null, true);
      }
      return callback(new Error('CORS request blocked by security policy.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  })
);

// HTTP request logger (skip during automated test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing with reasonable payload limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Input sanitization against NoSQL injection and prototype pollution
app.use(sanitizeInput);

// Mount API routes
app.use('/api', apiRoutes);

// Catch unmapped routes
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export default app;
