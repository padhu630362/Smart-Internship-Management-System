import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Automatically detect test runs so automated tests never pollute the live database
const isTestRun =
  process.env.NODE_ENV === 'test' ||
  (process.argv && process.argv.some((arg) => typeof arg === 'string' && (arg.includes('--test') || arg.includes('tests/') || arg.includes('tests\\'))));

if (isTestRun && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'test';
}

function resolveMongoUri() {
  const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_internship_db';
  if (process.env.NODE_ENV === 'test') {
    if (process.env.TEST_MONGO_URI) return process.env.TEST_MONGO_URI;
    // Route automated test fixtures to an isolated database so tests never pollute live user data
    if (baseUri.includes('?')) {
      const parts = baseUri.split('?');
      const prefix = parts[0].endsWith('/')
        ? parts[0] + 'internhub_automated_tests'
        : (parts[0].includes('.net/') || parts[0].includes('.com/')
            ? parts[0] + '_test'
            : parts[0] + '/internhub_automated_tests');
      return `${prefix}?${parts[1]}`;
    }
    return baseUri.endsWith('/') ? `${baseUri}internhub_automated_tests` : `${baseUri}_test`;
  }
  return baseUri;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5001,
  MONGO_URI: resolveMongoUri(),
  DNS_SERVERS: process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1',
  CLIENT_URL: process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_must_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '500s',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'sims-d9539',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  EMAIL_FROM: process.env.EMAIL_FROM || 'InternHub Support <no-reply@internhub.edu>',
};

// Fail fast in production if security secrets are weak or missing
if (env.NODE_ENV === 'production') {
  if (!env.JWT_SECRET || env.JWT_SECRET.includes('dev_insecure_jwt_secret') || env.JWT_SECRET.length < 32) {
    throw new Error(
      'FATAL CONFIG ERROR: In production, JWT_SECRET must be explicitly set and be at least 32 characters long.'
    );
  }
  if (!process.env.MONGO_URI) {
    throw new Error('FATAL CONFIG ERROR: In production, MONGO_URI must be explicitly set.');
  }
}

export default env;
