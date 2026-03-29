const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY.slice(0, 64).padEnd(64, '0'), 'hex');

/**
 * Encrypt a sensitive string (API key, private key, etc.)
 * @param {string} plainText - The text to encrypt
 * @returns {{ iv: string, encrypted: string, authTag: string }}
 */
function encryptKey(plainText) {
  if (!plainText) throw new Error('Cannot encrypt empty value');

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BUFFER, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag
  };
}

/**
 * Decrypt an encrypted key
 * @param {{ iv: string, encrypted: string, authTag: string }} encrypted - The encrypted data
 * @returns {string} - The decrypted plain text
 */
function decryptKey({ iv, encrypted, authTag }) {
  if (!iv || !encrypted || !authTag) {
    throw new Error('Invalid encrypted data format');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUFFER, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encryptKey, decryptKey };
