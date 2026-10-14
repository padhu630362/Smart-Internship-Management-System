import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_internship_db',
  CLIENT_URL: process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_must_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
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
