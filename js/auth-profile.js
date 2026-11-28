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

function createDefaultProfile(user) {
  const safeUid = user?.uid || "guest";
  return {
    uid: safeUid,
    name: user?.displayName || `Royal_${safeUid.slice(0, 5)}`,
    avatar: user?.photoURL || "",
    coins: 1000,
    gems: 25,
    xp: 0,
    level: 1,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    bestStreak: 0,
    favoriteMode: "online_2p",
    equipped: {
      diceSkin: "classic_gold",
      tokenSkin: "royal_dome",
      boardTheme: "royal_navy"
    },
    privacy: {
      showOnlineStatus: true,
      showLastSeen: true,
      allowFriendRequests: true
    },
    isGuest: Boolean(user?.isAnonymous),
    createdAt: Date.now(),
    lastLogin: Date.now()
  };
}

async function ensurePlayerProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  const now = Date.now();

  if (!snap.exists()) {
    const newProfile = createDefaultProfile(user);
    await set(userRef, newProfile);
    return newProfile;
  }

  const existing = snap.val() || {};
  const defaults = createDefaultProfile(user);
  const mergedProfile = {
    ...defaults,
    ...existing,
    uid: user.uid,
    name: existing.name || user.displayName || defaults.name,
    avatar: existing.avatar ?? user.photoURL ?? "",
    equipped: {
      ...defaults.equipped,
      ...(existing.equipped || {})
    },
    privacy: {
      ...defaults.privacy,
      ...(existing.privacy || {})
    },
    isGuest: Boolean(user.isAnonymous),
    lastLogin: now
  };

  const patch = { lastLogin: now };
  if (typeof existing.matchesPlayed !== "number") patch.matchesPlayed = mergedProfile.matchesPlayed;
  if (typeof existing.losses !== "number") patch.losses = mergedProfile.losses;
  if (typeof existing.bestStreak !== "number") patch.bestStreak = mergedProfile.bestStreak;
  if (!existing.favoriteMode) patch.favoriteMode = mergedProfile.favoriteMode;
  if (!existing.equipped) patch.equipped = mergedProfile.equipped;
  if (!existing.privacy) patch.privacy = mergedProfile.privacy;

  await update(userRef, patch);
  return mergedProfile;
}

export async function loginWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return await ensurePlayerProfile(res.user);
  } catch (err) {
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/operation-not-supported-in-this-environment"
    ) {
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
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, facebookProvider);
      return null;
    }
    throw err;
  }
}

export async function loginAsGuest() {
  const res = await signInAnonymously(auth);
  return await ensurePlayerProfile(res.user);
}

export async function logoutPlayer() {
  await signOut(auth);
}

export function watchAuthState(callback) {
  getRedirectResult(auth).catch((e) => console.error("Redirect auth error:", e));

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }

    try {
      const profile = await ensurePlayerProfile(user);
      callback(user, profile);
    } catch (e) {
      console.error("Profile sync error:", e);
      callback(user, createDefaultProfile(user));
    }
  });
}
