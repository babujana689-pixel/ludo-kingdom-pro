// Authentication & Royal Player Profile Manager
import {
  auth,
  db,
  googleProvider,
  facebookProvider
} from "./firebase-config.js";
import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

async function ensurePlayerProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);

  if (!snap.exists()) {
    const newProfile = {
      uid: user.uid,
      name: user.displayName || `Royal_${user.uid.slice(0, 5)}`,
      avatar: user.photoURL || "",
      coins: 1000,
      gems: 25,
      level: 1,
      wins: 0,
      isGuest: user.isAnonymous || false,
      createdAt: Date.now()
    };
    await set(userRef, newProfile);
    return newProfile;
  } else {
    const existing = snap.val();
    await update(userRef, { lastLogin: Date.now() });
    return existing;
  }
}

export async function loginWithGoogle() {
  const res = await signInWithPopup(auth, googleProvider);
  return await ensurePlayerProfile(res.user);
}

export async function loginWithFacebook() {
  const res = await signInWithPopup(auth, facebookProvider);
  return await ensurePlayerProfile(res.user);
}

export async function loginAsGuest() {
  const res = await signInAnonymously(auth);
  return await ensurePlayerProfile(res.user);
}

export async function logoutPlayer() {
  await signOut(auth);
}

export function watchAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await ensurePlayerProfile(user);
        callback(user, profile);
      } catch (err) {
        console.error("Database profile fallback:", err);
        callback(user, {
          uid: user.uid,
          name: user.displayName || `Royal_${user.uid.slice(0, 5)}`,
          avatar: user.photoURL || "",
          coins: 1000,
          gems: 25,
          level: 1,
          wins: 0,
          isGuest: user.isAnonymous || false
        });
      }
    } else {
      callback(null, null);
    }
  });
}
