import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const isValidConfigValue = (val) => Boolean(val && typeof val === 'string' && !val.includes('...') && !val.includes('your-app') && !val.includes('<') && val.trim().length > 5);

const getEnvOrFallback = (envVal, fallback) => (isValidConfigValue(envVal) ? envVal.trim() : fallback);

const firebaseConfig = {
  apiKey: getEnvOrFallback(import.meta.env.VITE_FIREBASE_API_KEY, 'AIzaSyCbWNv121IVjGaF8QmixZG-75Z34b9MaKM'),
  authDomain: getEnvOrFallback(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'sims-d9539.firebaseapp.com'),
  projectId: getEnvOrFallback(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'sims-d9539'),
  storageBucket: getEnvOrFallback(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'sims-d9539.firebasestorage.app'),
  messagingSenderId: getEnvOrFallback(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, '447602041483'),
  appId: getEnvOrFallback(import.meta.env.VITE_FIREBASE_APP_ID, '1:447602041483:web:f35551c39f7ef42276aa8e'),
  measurementId: getEnvOrFallback(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, 'G-TH1WT81KR1'),
};

// Initialize Firebase singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);

export { signInWithPopup, signOut };
export default app;
