import crypto from 'node:crypto';

/**
 * Enterprise password hashing utility using NIST/OWASP approved native scrypt.
 * Zero external dependencies. Timing-safe comparison.
 */

const SCRYPT_KEYLEN = 64;

/**
 * Hashes a plaintext password using crypto.scrypt with a unique random salt.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Stored format: "salt:hash"
 */
export const hashPassword = async (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
};

/**
 * Verifies a plaintext password against a stored "salt:hash" string using constant-time comparison.
 * @param {string} password - Plaintext password to verify
 * @param {string} storedHash - Stored "salt:hash" string
 * @returns {Promise<boolean>} True if match, false otherwise
 */
export const verifyPassword = async (password, storedHash) => {
  return new Promise((resolve) => {
    if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
      return resolve(false);
    }

    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return resolve(false);

      try {
        const keyBuffer = Buffer.from(key, 'hex');
        if (keyBuffer.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
};

/**
 * Generates a cryptographically secure random token string for password resets.
 * @param {number} [bytes=32]
 * @returns {string} Hex token
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generates a SHA-256 hash of a reset token for safe storage in database.
 * @param {string} token
 * @returns {string} SHA-256 hash
 */
export const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export default {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashResetToken,
};
