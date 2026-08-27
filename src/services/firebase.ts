import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
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
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserReview, WatchlistItem, UserProfile, MediaType, ReviewRating } from '../types';
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

// Firebase Cloud configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if valid Firebase configuration is present
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('DemoKey')
);

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn('Firebase Cloud initialization failed, using local storage fallback:', e);
  }
}

// Global Auth State
let currentUserProfile: UserProfile | null = getStoredUser();

function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
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

export function getCurrentUser(): UserProfile | null {
  return currentUserProfile || getStoredUser();
}

function mapFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Questo indirizzo email è già registrato. Accedi con la tua password.';
    case 'auth/invalid-email':
      return 'Indirizzo email non valido.';
    case 'auth/user-not-found':
      return 'Nessun account trovato con questa email. Registrati per iniziare.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenziali non corrette. Verifica email e password o registrati.';
    case 'auth/weak-password':
      return 'La password deve contenere almeno 6 caratteri.';
    case 'auth/too-many-requests':
      return 'Troppi tentativi falliti. Riprova tra qualche istante per sicurezza.';
    case 'auth/network-request-failed':
      return 'Errore di rete. Verifica la connessione a Internet.';
    default:
      return error?.message || 'Errore durante l\'autenticazione. Riprova.';
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  if (isFirebaseConfigured && auth) {
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
        currentUserProfile = null;
        localStorage.removeItem('thegrid_user');
        callback(null);
      }
    });
  } else {
    const stored = getStoredUser();
    currentUserProfile = stored;
    callback(stored);
    return () => {};
  }
}

interface StoredAccount {
  salt: string;
  hash: string;
  name: string;
  uid?: string;
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

  // 1. Rate Limiting Protection
  const rateStatus = checkRateLimit(cleanEmail);
  if (!rateStatus.allowed) {
    throw new Error(
      `Troppi tentativi falliti per questo account. Riprova tra ${rateStatus.waitSeconds} secondi per motivi di sicurezza.`
    );
  }

  // 2. Cloud Firebase Auth Mode (Sync across all devices)
  if (isFirebaseConfigured && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;
      resetRateLimit(cleanEmail);

      const profile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        displayName: sanitizeInput(fbUser.displayName || cleanEmail.split('@')[0], 60),
        photoURL: fbUser.photoURL || undefined,
      };

      currentUserProfile = profile;
      localStorage.setItem('thegrid_user', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('vault_updated'));
      return profile;
    } catch (fbErr: any) {
      recordFailedAttempt(cleanEmail);
      throw new Error(mapFirebaseAuthError(fbErr));
    }
  }

  // 3. Fallback Local Storage Mode
  const accounts: Record<string, StoredAccount> = JSON.parse(
    localStorage.getItem('thegrid_registered_accounts') || '{}'
  );
  const account = accounts[cleanEmail];

  if (!account) {
    recordFailedAttempt(cleanEmail);
    throw new Error('Credenziali non corrette. Verifica email e password o registrati.');
  }

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

  resetRateLimit(cleanEmail);

  const profile: UserProfile = {
    uid: account.uid || generateSecureId('usr'),
    email: cleanEmail,
    displayName: sanitizeInput(account.name, 60) || cleanEmail.split('@')[0],
  };

  currentUserProfile = profile;
  localStorage.setItem('thegrid_user', JSON.stringify(profile));
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
    throw new Error(passCheck.error || 'La password non rispetta i requisiti minimi di sicurezza (almeno 6 caratteri).');
  }

  // 1. Cloud Firebase Auth Mode (Sync across all devices)
  if (isFirebaseConfigured && auth && db) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;

      await updateProfile(fbUser, {
        displayName: cleanName,
      });

      const profile: UserProfile = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: cleanName,
      };

      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          uid: fbUser.uid,
          email: cleanEmail,
          displayName: cleanName,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn('Could not save user profile doc in Firestore:', err);
      }

      currentUserProfile = profile;
      localStorage.setItem('thegrid_user', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('vault_updated'));
      return profile;
    } catch (fbErr: any) {
      throw new Error(mapFirebaseAuthError(fbErr));
    }
  }

  // 2. Fallback Local Storage Mode
  const accounts: Record<string, StoredAccount> = JSON.parse(
    localStorage.getItem('thegrid_registered_accounts') || '{}'
  );

  if (accounts[cleanEmail]) {
    throw new Error(
      `L'indirizzo "${cleanEmail}" è già registrato nel sistema. Clicca su ACCEDI per effettuare il login.`
    );
  }

  const { salt, hash } = await hashPassword(pass);
  const localUid = generateSecureId('usr');

  accounts[cleanEmail] = {
    salt,
    hash,
    name: cleanName,
    uid: localUid,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('thegrid_registered_accounts', JSON.stringify(accounts));

  const profile: UserProfile = {
    uid: localUid,
    email: cleanEmail,
    displayName: cleanName,
  };

  currentUserProfile = profile;
  localStorage.setItem('thegrid_user', JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return profile;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Error signing out from Firebase Auth:', e);
    }
  }
  localStorage.removeItem('thegrid_user');
  localStorage.removeItem('cinepulse_user');
  currentUserProfile = null;
  window.dispatchEvent(new CustomEvent('vault_updated'));
}

export function resetAllAccountsAndReviews() {
  localStorage.removeItem('thegrid_registered_accounts');
  localStorage.removeItem('thegrid_user');
  localStorage.removeItem('cinepulse_user');
  localStorage.removeItem('cinepulse_all_reviews');
  currentUserProfile = null;
  window.dispatchEvent(new CustomEvent('vault_updated'));
}

const WATCHLIST_STORAGE_KEY = 'thegrid_vault_watchlist';

// Watchlist Service (Cloud Firestore + Local Cache)
export async function getWatchlist(): Promise<WatchlistItem[]> {
  const user = getCurrentUser();

  // Try fetching from Cloud Firestore if configured and user is logged in
  if (isFirebaseConfigured && db && user && user.uid && !user.uid.startsWith('guest_')) {
    try {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'watchlist'));
      const cloudItems: WatchlistItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as WatchlistItem;
        if (d && d.mediaId) {
          cloudItems.push(d);
        }
      });
      // Sort newest first
      cloudItems.sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(cloudItems));
      return cloudItems;
    } catch (err) {
      console.warn('Error reading watchlist from Firestore:', err);
    }
  }

  // Fallback to local cache
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
  const user = getCurrentUser();
  const currentList = await getWatchlist();
  const exists = currentList.some(
    (w) => String(w.mediaId) === String(item.mediaId) && w.mediaType === item.mediaType
  );

  let updatedList: WatchlistItem[];
  const docKey = `${item.mediaType}_${item.mediaId}`;

  if (exists) {
    updatedList = currentList.filter(
      (w) => !(String(w.mediaId) === String(item.mediaId) && w.mediaType === item.mediaType)
    );

    if (isFirebaseConfigured && db && user && user.uid && !user.uid.startsWith('guest_')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'watchlist', docKey));
      } catch (err) {
        console.warn('Error deleting watchlist doc in Firestore:', err);
      }
    }
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

    if (isFirebaseConfigured && db && user && user.uid && !user.uid.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'watchlist', docKey), newItem, { merge: true });
      } catch (err) {
        console.warn('Error saving watchlist doc in Firestore:', err);
      }
    }
  }

  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return !exists;
}

// Reviews Service (Cloud Firestore + Local Cache)
export async function getAllReviews(): Promise<UserReview[]> {
  // Try fetching from Cloud Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, 'reviews'));
      const cloudReviews: UserReview[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as UserReview;
        if (d && d.id && d.mediaId) {
          cloudReviews.push(d);
        }
      });
      // Sort newest first
      cloudReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localStorage.setItem('cinepulse_all_reviews', JSON.stringify(cloudReviews));
      return cloudReviews;
    } catch (err) {
      console.warn('Error fetching all reviews from Firestore:', err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem('cinepulse_all_reviews');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading all reviews from localStorage:', err);
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
    throw new Error('Devi effettuare l\'accesso per poter pubblicare una recensione.');
  }

  const cleanTitle = sanitizeInput(mediaTitle, 200) || 'Senza titolo';
  const cleanComment = sanitizeInput(comment, 3000);
  const cleanPoster = posterPath ? sanitizeInput(posterPath, 300) : null;
  const cleanUserName = sanitizeInput(user.displayName || user.email?.split('@')[0] || 'Curatore', 60);

  const reviewDocId = `${user.uid}_${mediaType}_${mediaId}`;
  const finalReview: UserReview = {
    id: reviewDocId,
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

  // 1. Save to Cloud Firestore for multi-device sync
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'reviews', reviewDocId), {
        ...finalReview,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Error saving review to Firestore:', err);
    }
  }

  // 2. Also save to local storage cache
  const allReviews = await getAllReviews();
  const existingIndex = allReviews.findIndex(
    (r) => r.id === reviewDocId || (r.userId === user.uid && Number(r.mediaId) === Number(mediaId) && r.mediaType === mediaType)
  );

  if (existingIndex >= 0) {
    allReviews[existingIndex] = finalReview;
  } else {
    allReviews.unshift(finalReview);
  }

  localStorage.setItem('cinepulse_all_reviews', JSON.stringify(allReviews));
  window.dispatchEvent(new CustomEvent('vault_updated'));
  return finalReview;
}
