import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

/**
 * Ensures session persists across reloads (local storage).
 * Call once at app start.
 */
export async function ensurePersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

/**
 * Smart Google sign-in:
 * 1) Try popup
 * 2) If popup is blocked, automatically fallback to redirect
 * 3) If coming back from redirect, return its result
 */
export async function signInWithGoogleSmart() {
  // If we're returning from redirect, capture it first:
  try {
    const redirectCred = await getRedirectResult(auth);
    if (redirectCred && redirectCred.user) return redirectCred;
  } catch (e) {
    // ignore, continue to popup attempt
    console.warn("getRedirectResult:", e?.code || e?.message || e);
  }

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (e) {
    // Common: auth/popup-blocked or user environment blocking third‑party cookies
    if (e && (e.code === "auth/popup-blocked" || e.code === "auth/popup-closed-by-user")) {
      // Try redirect as a fallback
      await signInWithRedirect(auth, googleProvider);
      // The page will redirect; function doesn't return a credential now.
      return null;
    }
    throw e;
  }
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
export function signOutUser() {
  return signOut(auth);
}
