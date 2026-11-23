// Authentication & Player Profile Manager for Ludo Kingdom Pro
import { auth, db, googleProvider, facebookProvider } from "./firebase-config.js";
import {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ডিফল্ট ইউজার প্রোফাইল তৈরি বা লোড করার ফাংশন
async function ensurePlayerProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);

  const defaultName = user.displayName || `Player_${user.uid.slice(0, 5)}`;
  const defaultAvatar = user.photoURL || "";

  if (!snapshot.exists()) {
    const newProfile = {
      uid: user.uid,
      name: defaultName,
      avatar: defaultAvatar,
      isGuest: user.isAnonymous,
      coins: 1000,
      wins: 0,
      matches: 0,
      level: 1,
      createdAt: Date.now(),
      lastLogin: Date.now()
    };
    await set(userRef, newProfile);
    return newProfile;
  } else {
    const existing = snapshot.val();
    await update(userRef, {
      lastLogin: Date.now(),
      name: user.displayName || existing.name,
      avatar: user.photoURL || existing.avatar
    });
    return { ...existing, name: user.displayName || existing.name };
  }
}

// Google দিয়ে লগইন
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return await ensurePlayerProfile(result.user);
}

// Facebook দিয়ে লগইন
export async function loginWithFacebook() {
  const result = await signInWithPopup(auth, facebookProvider);
  return await ensurePlayerProfile(result.user);
}

// Guest (Anonymous) হিসেবে খেলা
export async function loginAsGuest() {
  const result = await signInAnonymously(auth);
  return await ensurePlayerProfile(result.user);
}

// লগআউট
export async function logoutPlayer() {
  await signOut(auth);
}

// লগইন অবস্থা পর্যবেক্ষণ
export function watchAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await ensurePlayerProfile(user);
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
}
