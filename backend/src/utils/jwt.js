import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';

/**
 * Native RFC 7519 compliant JSON Web Token (JWT) engine using HS256.
 * Zero external dependencies.
 */

const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
};

/**
 * Parses duration string (e.g. "7d", "24h", "60m", "5m") into seconds.
 */
export const parseExpiresIn = (duration) => {
  if (typeof duration === 'number') return duration;
  if (!duration || typeof duration !== 'string') return 5 * 60; // default 5 minutes

  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 5 * 60;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 5 * 60;
  }
};

/**
 * Signs a payload and returns a compact JWT string.
 * @param {object} payload - Data to embed in token
 * @param {string|number} [expiresIn] - Expiration duration
 * @returns {string} Compact JWT token: "header.payload.signature"
 */
export const signToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured on the server.', 500, 'CONFIG_ERROR');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = parseExpiresIn(expiresIn);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const fullPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
};

/**
 * Verifies a JWT token signature and expiration.
 * @param {string} token - The raw JWT token
 * @returns {object} Decoded payload
 * @throws {AppError} If invalid or expired
 */
export const verifyToken = (token) => {
  const secret = env.JWT_SECRET;
  if (!token || typeof token !== 'string') {
    throw new AppError('Authentication token missing.', 401, 'TOKEN_MISSING');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Malformed authentication token.', 401, 'INVALID_TOKEN');
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const recBuf = Buffer.from(receivedSignature);
  const expBuf = Buffer.from(expectedSignature);

  if (recBuf.length !== expBuf.length || !crypto.timingSafeEqual(recBuf, expBuf)) {
    throw new AppError('Invalid token signature.', 401, 'INVALID_TOKEN');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new AppError('Invalid token payload.', 401, 'INVALID_TOKEN');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSeconds) {
    throw new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  return payload;
};

export default {
  signToken,
  verifyToken,
};
