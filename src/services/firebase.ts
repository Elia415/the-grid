import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserReview, WatchlistItem, UserProfile, MediaType, ReviewRating } from '../types';

// Default / fallback Firebase config format
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForMovieAppConfig123456",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "movie-app-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "movie-app-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "movie-app-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:demoapp123"
};

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let useLocalFallback = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase initialized in Local Storage fallback mode:", e);
  useLocalFallback = true;
}

import {
  hashPassword,
  verifyPassword,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  sanitizeInput,
  isValidEmail,
  validatePasswordStrength,
  generateSecureId,
} from './security';

// One-time cleanup: wipe any insecure legacy accounts and reviews
const CLEANUP_KEY = 'thegrid_security_hardened_v4';
if (typeof window !== 'undefined' && !localStorage.getItem(CLEANUP_KEY)) {
  localStorage.removeItem('thegrid_registered_accounts');
  localStorage.removeItem('thegrid_user');
  localStorage.removeItem('cinepulse_user');
  localStorage.removeItem('cinepulse_all_reviews');
  localStorage.setItem(CLEANUP_KEY, 'true');
}

// Global Auth State
let currentUserProfile: UserProfile | null = getStoredUser();

export function resetAllAccountsAndReviews() {
  localStorage.removeItem('thegrid_registered_accounts');
  localStorage.removeItem('thegrid_user');
  localStorage.removeItem('cinepulse_user');
  localStorage.removeItem('cinepulse_all_reviews');
  currentUserProfile = null;
  window.dispatchEvent(new CustomEvent('vault_updated'));
}

function getStoredUser(): UserProfile | null {
  const stored = localStorage.getItem('thegrid_user') || localStorage.getItem('cinepulse_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.uid && !parsed.uid.startsWith('guest_')) {
        return {
          uid: sanitizeInput(parsed.uid, 64),
          email: sanitizeInput(parsed.email, 120),
          displayName: sanitizeInput(parsed.displayName || 'Curatore', 60),
          photoURL: parsed.photoURL ? sanitizeInput(parsed.photoURL, 300) : undefined,
        };
      }
    } catch {}
  }
  return null;
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  if (auth && !useLocalFallback) {
    return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: sanitizeInput(fbUser.displayName || fbUser.email?.split('@')[0] || 'Curatore', 60),
          photoURL: fbUser.photoURL || undefined,
        };
        currentUserProfile = profile;
        localStorage.setItem('thegrid_user', JSON.stringify(profile));
        callback(profile);
      } else {
        const stored = getStoredUser();
        currentUserProfile = stored;
        callback(stored);
      }
    });
  } else {
    callback(currentUserProfile);
    return () => {};
  }
}

interface StoredAccount {
  salt: string;
  hash: string;
  name: string;
  createdAt: string;
}

export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Inserisci un indirizzo email valido.');
  }
  if (!pass) {
    throw new Error('Inserisci la password.');
  }

  // 1. Brute-Force Rate Limiting Protection
  const rateStatus = checkRateLimit(cleanEmail);
  if (!rateStatus.allowed) {
    throw new Error(
      `Troppi tentativi falliti per questo account. Riprova tra ${rateStatus.waitSeconds} secondi per motivi di sicurezza.`
    );
  }

  // 2. Read accounts database
  const accounts: Record<string, StoredAccount> = JSON.parse(
    localStorage.getItem('thegrid_registered_accounts') || '{}'
  );
  const account = accounts[cleanEmail];

  if (!account) {
    recordFailedAttempt(cleanEmail);
    throw new Error('Credenziali non corrette. Verifica email e password o registrati.');
  }

  // 3. Constant-time cryptographic password verification
  const isMatch = await verifyPassword(pass, account.salt, account.hash);
  if (!isMatch) {
    const attemptResult = recordFailedAttempt(cleanEmail);
    if (attemptResult.locked) {
      throw new Error(
        `Account temporaneamente bloccato per troppi tentativi errati. Riprova tra ${attemptResult.waitSeconds} secondi.`
      );
    }
    throw new Error('Credenziali non corrette. Verifica email e password o registrati.');
  }

  // 4. Successful login: reset rate limit & build secure profile
  resetRateLimit(cleanEmail);

  const profile: UserProfile = {
    uid: generateSecureId('usr'),
    email: cleanEmail,
    displayName: sanitizeInput(account.name, 60) || cleanEmail.split('@')[0],
  };

  currentUserProfile = profile;
  localStorage.setItem('thegrid_user', JSON.stringify(profile));
  localStorage.setItem('cinepulse_user', JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return profile;
}

// Temporary memory store for registration codes with expiration
const pendingRegistrationCodes = new Map<string, { code: string; name: string; salt: string; hash: string; expiresAt: number }>();

export async function sendRegistrationVerificationCode(
  email: string,
  pass: string,
  name: string
): Promise<{ code: string; expiresAt: number }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = sanitizeInput(name.trim() || cleanEmail.split('@')[0], 60);

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Inserisci un indirizzo email valido (es. nome@dominio.com).');
  }

  const passCheck = validatePasswordStrength(pass);
  if (!passCheck.isValid) {
    throw new Error(passCheck.error || 'La password non rispetta i requisiti minimi di sicurezza.');
  }

  const accounts: Record<string, StoredAccount> = JSON.parse(
    localStorage.getItem('thegrid_registered_accounts') || '{}'
  );
  if (accounts[cleanEmail]) {
    throw new Error(`L'indirizzo "${cleanEmail}" è già registrato. Passa alla scheda ACCEDI per effettuare il login.`);
  }

  // Hash password securely before storing in memory
  const { salt, hash } = await hashPassword(pass);

  // Generate 6 digit cryptographically random code
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  const code = (100000 + (randomBuffer[0] % 900000)).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  pendingRegistrationCodes.set(cleanEmail, {
    code,
    name: cleanName,
    salt,
    hash,
    expiresAt,
  });

  return { code, expiresAt };
}

export function confirmRegistrationCode(email: string, inputCode: string): UserProfile {
  const cleanEmail = email.trim().toLowerCase();
  const pending = pendingRegistrationCodes.get(cleanEmail);

  if (!pending) {
    throw new Error('Nessun codice inviato per questa email o sessione scaduta. Richiedi un nuovo codice.');
  }

  if (Date.now() > pending.expiresAt) {
    pendingRegistrationCodes.delete(cleanEmail);
    throw new Error('Il codice di verifica è scaduto. Richiedi un nuovo codice.');
  }

  if (pending.code !== inputCode.trim()) {
    throw new Error('Codice di conferma errato. Inserisci il codice a 6 cifre corretto.');
  }

  // Code verified! Register the account with cryptographic hash
  const accounts: Record<string, StoredAccount> = JSON.parse(
    localStorage.getItem('thegrid_registered_accounts') || '{}'
  );
  accounts[cleanEmail] = {
    salt: pending.salt,
    hash: pending.hash,
    name: pending.name,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('thegrid_registered_accounts', JSON.stringify(accounts));
  pendingRegistrationCodes.delete(cleanEmail);

  const profile: UserProfile = {
    uid: generateSecureId('usr'),
    email: cleanEmail,
    displayName: pending.name,
  };

  currentUserProfile = profile;
  localStorage.setItem('thegrid_user', JSON.stringify(profile));
  localStorage.setItem('cinepulse_user', JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return profile;
}

export async function registerUser(email: string, pass: string, name: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = sanitizeInput(name.trim() || cleanEmail.split('@')[0], 60);

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Inserisci un indirizzo email valido (es. nome@dominio.com).');
  }

  const passCheck = validatePasswordStrength(pass);
  if (!passCheck.isValid) {
    throw new Error(passCheck.error || 'La password non rispetta i requisiti minimi di sicurezza.');
  }

  const accounts: Record<string, StoredAccount> = JSON.parse(
    localStorage.getItem('thegrid_registered_accounts') || '{}'
  );

  if (accounts[cleanEmail]) {
    throw new Error(
      `L'indirizzo "${cleanEmail}" è già registrato nel sistema. Clicca su ACCEDI per effettuare il login.`
    );
  }

  // Hash password with unique cryptographic salt
  const { salt, hash } = await hashPassword(pass);

  // Store only salt and hash - NEVER plain text passwords
  accounts[cleanEmail] = {
    salt,
    hash,
    name: cleanName,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('thegrid_registered_accounts', JSON.stringify(accounts));

  const profile: UserProfile = {
    uid: generateSecureId('usr'),
    email: cleanEmail,
    displayName: cleanName,
  };

  currentUserProfile = profile;
  localStorage.setItem('thegrid_user', JSON.stringify(profile));
  localStorage.setItem('cinepulse_user', JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return profile;
}

export async function logoutUser(): Promise<void> {
  if (auth && !useLocalFallback) {
    try {
      await signOut(auth);
    } catch {}
  }
  localStorage.removeItem('thegrid_user');
  localStorage.removeItem('cinepulse_user');
  currentUserProfile = null;
  window.dispatchEvent(new CustomEvent('vault_updated'));
}

export function getCurrentUser(): UserProfile | null {
  return currentUserProfile || getStoredUser();
}

const WATCHLIST_STORAGE_KEY = 'thegrid_vault_watchlist';

// Watchlist Service
export async function getWatchlist(): Promise<WatchlistItem[]> {
  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading watchlist from storage:', err);
  }
  return [];
}

export async function toggleWatchlist(item: Omit<WatchlistItem, 'addedAt'>): Promise<boolean> {
  const currentList = await getWatchlist();
  const exists = currentList.some(
    (w) => String(w.mediaId) === String(item.mediaId) && w.mediaType === item.mediaType
  );

  let updatedList: WatchlistItem[];
  if (exists) {
    updatedList = currentList.filter(
      (w) => !(String(w.mediaId) === String(item.mediaId) && w.mediaType === item.mediaType)
    );
  } else {
    const newItem: WatchlistItem = {
      mediaId: Number(item.mediaId),
      mediaType: item.mediaType,
      title: item.title || 'Senza titolo',
      posterPath: item.posterPath,
      voteAverage: typeof item.voteAverage === 'number' ? item.voteAverage : 0,
      releaseYear: item.releaseYear || '',
      addedAt: new Date().toISOString(),
    };
    updatedList = [newItem, ...currentList];
  }

  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedList));

  // Trigger storage event so all tabs/components sync immediately
  window.dispatchEvent(new Event('vault_updated'));

  return !exists;
}

// Reviews Service - Pure user reviews only (No fake reviews)
export async function getAllReviews(): Promise<UserReview[]> {
  try {
    const raw = localStorage.getItem('cinepulse_all_reviews');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading all reviews:', err);
  }

  return [];
}

export async function getReviewsForMedia(mediaId: number, mediaType: MediaType): Promise<UserReview[]> {
  const allReviews = await getAllReviews();
  return allReviews.filter((r) => Number(r.mediaId) === Number(mediaId) && r.mediaType === mediaType);
}

export async function saveUserReview(
  mediaId: number,
  mediaType: MediaType,
  mediaTitle: string,
  posterPath: string | null,
  rating: number,
  comment: string,
  detailedRating?: ReviewRating
): Promise<UserReview> {
  const user = getCurrentUser();
  if (!user || !user.uid || user.uid.startsWith('guest_')) {
    throw new Error("Devi effettuare l'accesso per poter pubblicare una recensione.");
  }

  const cleanTitle = sanitizeInput(mediaTitle, 200) || 'Senza titolo';
  const cleanComment = sanitizeInput(comment, 3000);
  const cleanPoster = posterPath ? sanitizeInput(posterPath, 300) : null;
  const cleanUserName = sanitizeInput(user.displayName || user.email?.split('@')[0] || 'Curatore', 60);

  const allReviews = await getAllReviews();
  const existingIndex = allReviews.findIndex(
    (r) => r.userId === user.uid && Number(r.mediaId) === Number(mediaId) && r.mediaType === mediaType
  );

  let finalReview: UserReview;

  if (existingIndex >= 0) {
    const existing = allReviews[existingIndex];
    finalReview = {
      ...existing,
      mediaTitle: cleanTitle || existing.mediaTitle,
      posterPath: cleanPoster || existing.posterPath,
      userName: cleanUserName,
      rating: Math.min(10, Math.max(1, Number(rating) || 7)),
      comment: cleanComment,
      detailedRating: detailedRating || existing.detailedRating,
      createdAt: new Date().toISOString(),
    };
    allReviews[existingIndex] = finalReview;
  } else {
    finalReview = {
      id: generateSecureId('rev'),
      mediaId: Number(mediaId),
      mediaType,
      mediaTitle: cleanTitle,
      posterPath: cleanPoster,
      userId: user.uid,
      userName: cleanUserName,
      rating: Math.min(10, Math.max(1, Number(rating) || 7)),
      comment: cleanComment,
      createdAt: new Date().toISOString(),
      ...(detailedRating ? { detailedRating } : {}),
    };
    allReviews.unshift(finalReview);
  }

  localStorage.setItem('cinepulse_all_reviews', JSON.stringify(allReviews));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return finalReview;
}
