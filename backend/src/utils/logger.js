const SENSITIVE_KEYWORDS = [
  'password',
  'passwordhash',
  'token',
  'authorization',
  'secret',
  'jwt_secret',
  'mongouri',
  'mongo_uri',
];

/**
 * Redacts sensitive fields from objects before logging.
 */
export const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYWORDS.some((kw) => key.toLowerCase().includes(kw));
    if (isSensitive) {
      clean[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = redactSensitive(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Lightweight structured console logger for development and production diagnostics.
 */
export const logger = {
  info: (message, meta = {}) => {
    const safeMeta = redactSensitive(meta);
    console.log(`[INFO]  ${new Date().toISOString()} - ${message}`, Object.keys(safeMeta || {}).length ? safeMeta : '');
  },
  warn: (message, meta = {}) => {
    const safeMeta = redactSensitive(meta);
    console.warn(`[WARN]  ${new Date().toISOString()} - ${message}`, Object.keys(safeMeta || {}).length ? safeMeta : '');
  },
  error: (message, error = null) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? (error.stack || error) : '');
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const safeMeta = redactSensitive(meta);
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, Object.keys(safeMeta || {}).length ? safeMeta : '');
    }
  }
};

export default logger;
