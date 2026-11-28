// functions/index.js - AdMob SSV Reward Verification for LUDO ADDA PRO
const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      "https://ludo-kingdom-pro-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 10
});

const ADMOB_VERIFIER_KEYS_URL =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedPublicKeys = null;
let cachedAt = 0;

async function getAdMobPublicKeys(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedPublicKeys && now - cachedAt < KEY_CACHE_TTL_MS) {
    return cachedPublicKeys;
  }

  const res = await fetch(ADMOB_VERIFIER_KEYS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch AdMob verifier keys: ${res.status}`);
  }

  const data = await res.json();
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  if (keys.length === 0) {
    throw new Error("AdMob verifier keys list is empty.");
  }

  cachedPublicKeys = keys;
  cachedAt = now;
  return keys;
}

/**
 * AdMob SSV query string verification:
 * All query parameters except `signature` and `key_id`, sorted alphabetically
 * by key name and joined with `&`, verified with ECDSA SHA-256 against `signature` (base64url/base64).
 */
async function verifyAdMobSsvSignature(queryObj) {
  const signature = String(queryObj.signature || "").trim();
  const keyId = queryObj.key_id;

  if (!signature) {
    return { valid: false, reason: "Missing signature parameter" };
  }

  const unsignedEntries = Object.keys(queryObj)
    .filter((k) => k !== "signature" && k !== "key_id")
    .sort()
    .map((k) => `${k}=${queryObj[k]}`);

  const payloadToVerify = Buffer.from(unsignedEntries.join("&"), "utf8");

  let normalizedSig;
  try {
    const cleanB64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (cleanB64.length % 4)) % 4;
    normalizedSig = Buffer.from(cleanB64 + "=".repeat(padLen), "base64");
  } catch (_) {
    return { valid: false, reason: "Invalid signature encoding" };
  }

  let keys = await getAdMobPublicKeys(false);
  if (keyId !== undefined && !keys.some((k) => String(k.keyId) === String(keyId))) {
    keys = await getAdMobPublicKeys(true);
  }

  const candidates =
    keyId !== undefined
      ? keys.filter((k) => String(k.keyId) === String(keyId))
      : keys;

  for (const keyItem of candidates) {
    if (!keyItem?.pem) continue;
    try {
      const isVerified = crypto.verify(
        "sha256",
        payloadToVerify,
        {
          key: keyItem.pem,
          dsaEncoding: "ieee-p1363"
        },
        normalizedSig
      );
      if (isVerified) {
        return { valid: true };
      }
    } catch (_) {
      // Try next candidate key
    }
  }

  return { valid: false, reason: "Signature verification failed" };
}

function extractUidFromRequest(queryObj, bodyObj) {
  const directUserId = String(queryObj.user_id || bodyObj?.userId || "").trim();
  if (directUserId) return directUserId;

  const rawCustom = String(queryObj.custom_data || bodyObj?.customData || "").trim();
  if (!rawCustom) return "";

  try {
    const parsed = JSON.parse(rawCustom);
    if (parsed && typeof parsed.uid === "string" && parsed.uid.trim()) {
      return parsed.uid.trim();
    }
  } catch (_) {
    // Plain string custom_data fallback if formatted as uid:...
    if (rawCustom.startsWith("uid:")) {
      return rawCustom.slice(4).trim();
    }
  }

  return "";
}

function extractTransactionId(queryObj, bodyObj) {
  const txId = String(
    queryObj.transaction_id || bodyObj?.transactionId || ""
  ).trim();
  return txId;
}

exports.admobSsvReward = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const queryObj = req.query || {};
    const bodyObj =
      typeof req.body === "object" && req.body !== null ? req.body : {};

    // 1. Verify AdMob SSV signature
    const sigCheck = await verifyAdMobSsvSignature(queryObj);
    if (!sigCheck.valid) {
      logger.warn("Invalid AdMob SSV signature", { reason: sigCheck.reason });
      res.status(401).json({ ok: false, error: "Invalid SSV signature" });
      return;
    }

    // 2. Extract user ID and unique transaction ID
    const uid = extractUidFromRequest(queryObj, bodyObj);
    const transactionId = extractTransactionId(queryObj, bodyObj);

    if (!uid || !transactionId) {
      res.status(400).json({
        ok: false,
        error: "Missing user_id/custom_data or transaction_id"
      });
      return;
    }

    // Sanitize transaction ID for RTDB key safety
    const safeTxKey = transactionId.replace(/[.#$/[\]]/g, "_");
    const db = admin.database();
    const txRef = db.ref(`adTransactions/${safeTxKey}`);

    // 3. Atomic transaction on adTransactions/{safeTxKey} to prevent duplicate ad credit
    let duplicateTx = false;
    const txResult = await txRef.transaction((currentTx) => {
      if (currentTx !== null) {
        duplicateTx = true;
        return; // Abort transaction
      }
      return {
        transactionId,
        uid,
        adNetwork: String(queryObj.ad_network || ""),
        adUnit: String(queryObj.ad_unit || ""),
        rewardItem: String(queryObj.reward_item || ""),
        rewardAmount: Number(queryObj.reward_amount || 0),
        processedAt: admin.database.ServerValue.TIMESTAMP
      };
    });

    if (duplicateTx || !txResult.committed) {
      res.status(200).json({
        ok: true,
        duplicate: true,
        message: "Transaction already processed"
      });
      return;
    }

    // 4. Atomic transaction on users/{uid} for ad count & milestone rewards
    const userRef = db.ref(`users/${uid}`);
    let outcome = {
      completedAds: 0,
      coins: 0,
      gems: 0,
      claimed10Now: false,
      claimed20Now: false,
      claimed: { ads10: false, ads20: false }
    };

    const userTxResult = await userRef.transaction((userData) => {
      if (!userData || typeof userData !== "object") {
        userData = {
          uid,
          coins: 1000,
          gems: 25
        };
      }

      const adRewards =
        userData.adRewards && typeof userData.adRewards === "object"
          ? userData.adRewards
          : {};

      const claimed =
        adRewards.claimed && typeof adRewards.claimed === "object"
          ? adRewards.claimed
          : {};

      const prevAds =
        typeof adRewards.completedAds === "number"
          ? Math.max(0, Math.min(20, Math.floor(adRewards.completedAds)))
          : 0;

      const nextAds = Math.min(20, prevAds + 1);

      let coins = typeof userData.coins === "number" ? userData.coins : 0;
      let gems = typeof userData.gems === "number" ? userData.gems : 0;

      let ads10Claimed = Boolean(claimed.ads10);
      let ads20Claimed = Boolean(claimed.ads20);

      let claimed10Now = false;
      let claimed20Now = false;

      // Milestone 1: 10 verified ads -> +250 Coins (once)
      if (nextAds >= 10 && !ads10Claimed) {
        ads10Claimed = true;
        claimed10Now = true;
        coins += 250;
      }

      // Milestone 2: 20 verified ads -> +250 Coins + 20 Diamonds (once)
      // Total across 20 ads = 500 Coins + 20 Diamonds
      if (nextAds >= 20 && !ads20Claimed) {
        ads20Claimed = true;
        claimed20Now = true;
        coins += 250;
        gems += 20;
      }

      userData.coins = coins;
      userData.gems = gems;
      userData.adRewards = {
        ...adRewards,
        completedAds: nextAds,
        lastTransactionId: transactionId,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
        claimed: {
          ads10: ads10Claimed,
          ads20: ads20Claimed
        }
      };

      outcome = {
        completedAds: nextAds,
        coins,
        gems,
        claimed10Now,
        claimed20Now,
        claimed: {
          ads10: ads10Claimed,
          ads20: ads20Claimed
        }
      };

      return userData;
    });

    if (!userTxResult.committed) {
      res.status(500).json({
        ok: false,
        error: "Failed to update user reward progress"
      });
      return;
    }

    res.status(200).json({
      ok: true,
      duplicate: false,
      ...outcome
    });
  } catch (err) {
    logger.error("admobSsvReward error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});
