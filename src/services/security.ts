/**
 * Security & Cryptography Module for THE GRID
 * Provides cryptographic password hashing (PBKDF2 / SHA-256 with per-user salt),
 * constant-time verification, XSS sanitization, rate-limiting, and input validation.
 */

// 1. Password Hashing with Salt using Web Crypto API
export async function hashPassword(
  password: string,
  providedSalt?: string
): Promise<{ salt: string; hash: string }> {
  const enc = new TextEncoder();

  // Generate 16 cryptographically random bytes for salt if not provided
  let saltBytes: Uint8Array;
  if (providedSalt) {
    saltBytes = hexToUint8Array(providedSalt);
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  const saltHex = uint8ArrayToHex(saltBytes);

  // Import key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive 256-bit key using PBKDF2 with 100,000 iterations and SHA-256
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = uint8ArrayToHex(new Uint8Array(derivedKey));
  return { salt: saltHex, hash: hashHex };
}

// 2. Constant-time verification to prevent timing attacks
export async function verifyPassword(
  inputPass: string,
  storedSalt: string,
  storedHash: string
): Promise<boolean> {
  try {
    const { hash: computedHash } = await hashPassword(inputPass, storedSalt);
    if (computedHash.length !== storedHash.length) return false;

    let match = 0;
    for (let i = 0; i < computedHash.length; i++) {
      match |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return match === 0;
  } catch (e) {
    console.error('Password verification error:', e);
    return false;
  }
}

// 3. Rate-limiter to protect against automated Brute-Force and Credential Stuffing attacks
interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutes lockout
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window

export function checkRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = loginAttempts.get(cleanId);

  if (!record) return { allowed: true };

  // Check if locked
  if (record.lockedUntil && now < record.lockedUntil) {
    const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  // Clear if expired
  if (now - record.lastAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(cleanId);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(identifier: string): { locked: boolean; waitSeconds?: number } {
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = loginAttempts.get(cleanId) || { count: 0, lastAttempt: now };

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    loginAttempts.set(cleanId, record);
    return { locked: true, waitSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  loginAttempts.set(cleanId, record);
  return { locked: false };
}

export function resetRateLimit(identifier: string) {
  loginAttempts.delete(identifier.trim().toLowerCase());
}

// 4. Input Sanitization against XSS and Injection
export function sanitizeInput(str: string, maxLength = 2000): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Strip HTML brackets
    .replace(/javascript:/gi, '') // Strip script protocol
    .replace(/data:/gi, '') // Strip data protocol
    .replace(/vbscript:/gi, '')
    .replace(/on\w+=/gi, '') // Strip event handlers like onload=, onclick=
    .trim();
}

// 5. Strict Email Validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}

// 6. Password Strength Validation
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { isValid: false, error: 'La password deve contenere almeno 6 caratteri.' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'La password è troppo lunga (massimo 128 caratteri).' };
  }
  return { isValid: true };
}

// 7. Secure Random ID generator
export function generateSecureId(prefix = 'usr'): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${uint8ArrayToHex(bytes)}`;
}

// Helper utilities
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/[\da-f]{2}/gi) || [];
  return new Uint8Array(pairs.map((h) => parseInt(h, 16)));
}
