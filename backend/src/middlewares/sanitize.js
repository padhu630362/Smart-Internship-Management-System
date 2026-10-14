/**
 * Recursively removes MongoDB operator keys ($gt, $ne, etc.)
 * and keys containing dots (.) to prevent NoSQL injection.
 * Also protects against Object Prototype Pollution (__proto__, constructor, prototype).
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip dangerous prototype pollution and NoSQL operator keys
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      continue;
    }

    clean[key] = sanitizeObject(value);
  }
  return clean;
};

/**
 * Express middleware that strips NoSQL operators from req.body, req.query, and req.params.
 */
export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * Escapes regex special characters to prevent ReDoS and Regex SyntaxErrors.
 * @param {string} string - Raw user-supplied query string
 * @returns {string} Regex-escaped string
 */
export const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default { sanitizeInput, sanitizeObject, escapeRegex };
