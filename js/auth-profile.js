import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

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
      xp: 0,
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
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return await ensurePlayerProfile(res.user);
  } catch (err) {
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function loginWithFacebook() {
  try {
    const res = await signInWithPopup(auth, facebookProvider);
    return await ensurePlayerProfile(res.user);
  } catch (err) {
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, facebookProvider);
      return null;
    }
    throw err;
  }
}

export async function loginAsGuest() {
  try {
    const res = await signInAnonymously(auth);
    return await ensurePlayerProfile(res.user);
  } catch (err) {
    throw err;
  }
}

export async function logoutPlayer() {
  await signOut(auth);
}

export function watchAuthState(callback) {
  getRedirectResult(auth).catch((e) => console.error("Redirect auth error:", e));

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await ensurePlayerProfile(user);
        callback(user, profile);
      } catch (e) {
        console.error("Profile sync error:", e);
        callback(user, {
          uid: user.uid,
          name: user.displayName || "Royal Player",
          coins: 1000,
          level: 1,
          isGuest: user.isAnonymous
        });
      }
    } else {
      callback(null, null);
    }
  });
}
