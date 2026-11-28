// js/skin-shop.js — LUDO ADDA PRO Cone Skin Shop (7 Categories, Unique Cone Designs, Large Preview & Game Sync)
import { auth, db } from "./firebase-config.js";
import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const FREE_CONE_IDS = [
  "cone_free_classic",
  "cone_free_matte",
  "cone_free_pastel",
  "cone_free_striped"
];

const PLAYER_COLORS = ["#ef4444", "#22c55e", "#facc15", "#0ea5e9"];
const PAGE_SIZE = 8;

const ROYAL_TITLES = [
  "Royal Crown Cone", "King Cone", "Golden Royal Cone", "Knight Cone", "Warrior Cone",
  "Luxury Cone", "Emperor Cone", "Royal Flame Cone", "Silver Crown Cone", "Dark King Cone",
  "Sultan Cone", "Majesty Cone", "Imperial Gold Cone", "Valor Knight Cone", "Sovereign Cone",
  "Monarch Cone", "Palace Guard Cone", "Crown Jewel Cone", "Ruler Cone", "Noble Crest Cone"
];

const CRYSTAL_TITLES = [
  "Ruby Crystal Cone", "Emerald Crystal Cone", "Sapphire Crystal Cone", "Diamond Crystal Cone",
  "Rainbow Crystal Cone", "Ice Crystal Cone", "Magic Crystal Cone", "Galaxy Crystal Cone",
  "Purple Crystal Cone", "Fire Crystal Cone", "Amethyst Prism Cone", "Aqua Quartz Cone",
  "Solar Topaz Cone", "Frost Gem Cone", "Crimson Shard Cone", "Celestial Gem Cone"
];

const STAR_TITLES = [
  "Golden Star Cone", "Silver Star Cone", "Rainbow Star Cone", "Shooting Star Cone",
  "Cosmic Star Cone", "Royal Star Cone", "Fire Star Cone", "Galaxy Star Cone",
  "Nova Star Cone", "Solar Flare Star Cone", "Astral Star Cone", "Comet Star Cone"
];

const EMOJI_TITLES = [
  "Cool Emoji Cone", "Funny Emoji Cone", "Love Emoji Cone", "Devil Emoji Cone",
  "Fire Emoji Cone", "King Emoji Cone", "Crazy Emoji Cone", "Ice Emoji Cone",
  "Star Emoji Cone", "Skull Emoji Cone", "Wink Emoji Cone", "Champ Emoji Cone"
];

const NEON_TITLES = [
  "Neon Red Cone", "Neon Green Cone", "Neon Blue Cone", "Neon Gold Cone",
  "Neon Pink Cone", "Rainbow Neon Cone", "Electric Neon Cone", "Cyber Neon Cone",
  "Plasma Neon Cone", "Galaxy Neon Cone", "Laser Cyan Cone", "Pulse Magenta Cone"
];

const PALETTE_SETS = [
  ["#ef4444", "#22c55e", "#facc15", "#0ea5e9"],
  ["#e11d48", "#10b981", "#f59e0b", "#38bdf8"],
  ["#dc2626", "#16a34a", "#eab308", "#2563eb"],
  ["#fb7185", "#4ade80", "#fde047", "#60a5fa"],
  ["#f43f5e", "#2dd4bf", "#facc15", "#818cf8"]
];

function buildCatalog() {
  const list = [];

  list.push({
    id: "cone_free_classic",
    name: "Classic Cone",
    category: "FREE",
    tabKey: "FREE",
    rarity: "Free",
    currency: "free",
    price: 0,
    style: "classic",
    anim: "none",
    colors: PLAYER_COLORS
  });
  list.push({
    id: "cone_free_matte",
    name: "Matte Cone",
    category: "FREE",
    tabKey: "FREE",
    rarity: "Free",
    currency: "free",
    price: 0,
    style: "matte",
    anim: "none",
    colors: ["#dc2626", "#16a34a", "#eab308", "#0284c7"]
  });
  list.push({
    id: "cone_free_pastel",
    name: "Pastel Cone",
    category: "FREE",
    tabKey: "FREE",
    rarity: "Free",
    currency: "free",
    price: 0,
    style: "pastel",
    anim: "none",
    colors: ["#fda4af", "#86efac", "#fde047", "#93c5fd"]
  });
  list.push({
    id: "cone_free_striped",
    name: "Striped Cone",
    category: "FREE",
    tabKey: "FREE",
    rarity: "Free",
    currency: "free",
    price: 0,
    style: "striped",
    anim: "none",
    colors: ["#f87171", "#4ade80", "#facc15", "#38bdf8"]
  });

  for (let i = 0; i < 100; i++) {
    const baseName = ROYAL_TITLES[i % ROYAL_TITLES.length];
    const rankNum = i + 1;
    const displayName = i < ROYAL_TITLES.length ? baseName : `${baseName} Mk.${Math.floor(i / ROYAL_TITLES.length) + 1}`;
    const price = 150 + i * 35;
    const tabKey = i % 2 === 0 ? "COINS" : "ROYAL";
    list.push({
      id: `cone_royal_${rankNum}`,
      name: displayName,
      category: "ROYAL",
      tabKey,
      rarity: i < 10 ? "Royal Core" : (i < 50 ? "Royal Crest" : "Royal Sovereign"),
      currency: "coins",
      price,
      style: "royal",
      anim: i % 3 === 0 ? "crown_gleam" : "royal_pulse",
      colors: PALETTE_SETS[i % PALETTE_SETS.length]
    });
  }

  for (let i = 0; i < 300; i++) {
    const baseName = CRYSTAL_TITLES[i % CRYSTAL_TITLES.length];
    const rankNum = i + 1;
    const displayName = i < CRYSTAL_TITLES.length ? baseName : `${baseName} #${rankNum}`;
    const price = 300 + (i % 45) * 10;
    list.push({
      id: `cone_crystal_${rankNum}`,
      name: displayName,
      category: "CRYSTAL",
      tabKey: "CRYSTAL",
      rarity: "Diamond Crystal",
      currency: "diamonds",
      price,
      style: "crystal",
      anim: i % 2 === 0 ? "crystal_shimmer" : "facet_glint",
      colors: i % 7 === 4 ? ["#ff2a55", "#22ff66", "#ffe600", "#00d2ff"] : PALETTE_SETS[i % PALETTE_SETS.length]
    });
  }

  for (let i = 0; i < 300; i++) {
    const baseName = STAR_TITLES[i % STAR_TITLES.length];
    const rankNum = i + 1;
    const displayName = i < STAR_TITLES.length ? baseName : `${baseName} #${rankNum}`;
    const price = 320 + (i % 45) * 10;
    list.push({
      id: `cone_star_${rankNum}`,
      name: displayName,
      category: "STAR",
      tabKey: "STAR",
      rarity: "Diamond Star",
      currency: "diamonds",
      price,
      style: "star",
      anim: i % 2 === 0 ? "star_twinkle" : "star_orbit",
      colors: PALETTE_SETS[i % PALETTE_SETS.length]
    });
  }

  for (let i = 0; i < 300; i++) {
    const baseName = EMOJI_TITLES[i % EMOJI_TITLES.length];
    const rankNum = i + 1;
    const displayName = i < EMOJI_TITLES.length ? baseName : `${baseName} #${rankNum}`;
    const price = 340 + (i % 45) * 10;
    list.push({
      id: `cone_emoji_${rankNum}`,
      name: displayName,
      category: "EMOJI",
      tabKey: "EMOJI",
      rarity: "Diamond Emoji",
      currency: "diamonds",
      price,
      style: "emoji",
      anim: "emoji_bounce",
      colors: PALETTE_SETS[i % PALETTE_SETS.length]
    });
  }

  for (let i = 0; i < 300; i++) {
    const baseName = NEON_TITLES[i % NEON_TITLES.length];
    const rankNum = i + 1;
    const displayName = i < NEON_TITLES.length ? baseName : `${baseName} #${rankNum}`;
    const price = 360 + (i % 45) * 10;
    list.push({
      id: `cone_neon_${rankNum}`,
      name: displayName,
      category: "NEON",
      tabKey: "NEON",
      rarity: "Diamond Neon",
      currency: "diamonds",
      price,
      style: "neon",
      anim: "neon_glow",
      colors: i % 5 === 0 ? ["#ff2a55", "#22ff66", "#ffe600", "#00d2ff"] : PALETTE_SETS[i % PALETTE_SETS.length]
    });
  }

  return list;
}

const CONE_CATALOG = buildCatalog();
const STORAGE_KEY = "ludo_adda_pro_cones_v1";

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDefaultOwnedMap() {
  const map = {};
  FREE_CONE_IDS.forEach((id) => {
    map[id] = true;
  });
  return map;
}

function loadState() {
  const fallback = {
    coins: 1000,
    gems: 25,
    ownedSkins: getDefaultOwnedMap(),
    equippedCone: "cone_free_classic"
  };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw) return fallback;
    const owned = { ...getDefaultOwnedMap(), ...(raw.ownedSkins || {}) };
    const equipped = CONE_CATALOG.some((c) => c.id === raw.equippedCone)
      ? raw.equippedCone
      : "cone_free_classic";
    return {
      coins: typeof raw.coins === "number" ? raw.coins : fallback.coins,
      gems: typeof raw.gems === "number" ? raw.gems : fallback.gems,
      ownedSkins: owned,
      equippedCone: equipped
    };
  } catch (_) {
    return fallback;
  }
}

let state = loadState();
let activeTab = "FREE";
let currentPage = 1;
let previewConeId = null;
let previewMode = false;
let pendingConfirm = null;
const activeShopPurchases = new Set();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function syncHeaderBalances() {
  const coinEl = document.getElementById("coin-balance");
  const gemEl = document.getElementById("gem-balance");
  if (coinEl) coinEl.textContent = Number(state.coins || 0).toLocaleString("en-IN");
  if (gemEl) gemEl.textContent = Number(state.gems || 0).toLocaleString("en-IN");
  if (window.currentRoyalProfile) {
    window.currentRoyalProfile.coins = state.coins;
    window.currentRoyalProfile.gems = state.gems;
    window.currentRoyalProfile.ownedCones = state.ownedSkins;
    window.currentRoyalProfile.equippedCone = state.equippedCone;
  }
  window.dispatchEvent(new Event("ludo-profile-updated"));
}

async function hydrateUserFromFirebase() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const snap = await get(ref(db, `users/${uid}`));
    if (!snap.exists()) return;
    const data = snap.val() || {};
    if (typeof data.coins === "number") state.coins = data.coins;
    if (typeof data.gems === "number") state.gems = data.gems;
    if (data.ownedCones && typeof data.ownedCones === "object") {
      state.ownedSkins = { ...getDefaultOwnedMap(), ...data.ownedCones };
    }
    if (typeof data.equippedCone === "string" && CONE_CATALOG.some((c) => c.id === data.equippedCone)) {
      state.equippedCone = data.equippedCone;
    }
    saveState();
    syncHeaderBalances();
  } catch (_) {}
}

async function persistPatch(patch) {
  saveState();
  syncHeaderBalances();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await update(ref(db, `users/${uid}`), patch);
  } catch (_) {}
}

function getConeById(id) {
  return CONE_CATALOG.find((c) => c.id === id) || CONE_CATALOG[0];
}

function isOwned(coneId) {
  return Boolean(FREE_CONE_IDS.includes(coneId) || state.ownedSkins?.[coneId]);
}

function isApplied(coneId) {
  return state.equippedCone === coneId;
}

function getStatusText(coneId) {
  if (isApplied(coneId)) return "APPLIED";
  if (isOwned(coneId)) return "OWNED";
  return "LOCKED";
}

function getPriceText(cone) {
  if (cone.currency === "free" || cone.price === 0) return "FREE";
  if (cone.currency === "diamonds") return `💎 ${Number(cone.price).toLocaleString("en-IN")}`;
  return `🪙 ${Number(cone.price).toLocaleString("en-IN")}`;
}

function getItemsForTab(tab) {
  if (tab === "COINS") {
    return CONE_CATALOG.filter((c) => c.currency === "coins");
  }
  return CONE_CATALOG.filter((c) => c.tabKey === tab);
}

function getActiveTheme() {
  const activeCone = getConeById(state.equippedCone);
  return {
    cone: activeCone,
    tokens: activeCone,
    colors: activeCone.colors
  };
}

function notifyConeApplied() {
  const theme = getActiveTheme();
  window.dispatchEvent(new CustomEvent("ludo-cone-applied", { detail: theme }));
  window.dispatchEvent(new CustomEvent("ludo-skin-applied", { detail: theme }));
  if (window.LudoBoard3D && typeof window.LudoBoard3D.applyTheme === "function") {
    try {
      window.LudoBoard3D.applyTheme(theme);
    } catch (_) {}
  }
}

function renderSingleConeSvg(cone, colorHex, xCenter, yBase, scale = 1, idx = 0) {
  const numMatch = String(cone.id || "").match(/(\d+)$/);
  const variant = numMatch ? Number(numMatch[1]) : (idx + 1);
  const slot = (variant + idx) % 12;

  const widthFactor = 0.84 + ((variant * 7 + idx * 3) % 5) * 0.08;
  const heightFactor = 0.88 + ((variant * 5 + idx * 2) % 4) * 0.08;
  const w = 22 * scale * widthFactor;
  const h = 34 * scale * heightFactor;

  const topNarrow = 0.12 + ((variant + idx) % 4) * 0.04;
  const xLeft = xCenter - w * 0.44;
  const xRight = xCenter + w * 0.44;
  const xTopLeft = xCenter - w * topNarrow;
  const xTopRight = xCenter + w * topNarrow;
  const yTop = yBase - h;

  const distinctPalette = [
    "#ff3b5c", "#10b981", "#facc15", "#0ea5e9",
    "#a855f7", "#f97316", "#14b8a6", "#ec4899",
    "#84cc16", "#6366f1", "#eab308", "#06b6d4"
  ];
  const cardTone = distinctPalette[(variant * 3 + idx * 2) % distinctPalette.length];
  const trimTone = distinctPalette[(variant * 5 + idx + 4) % distinctPalette.length];
  const gradId = `cg_${String(cone.id || "c").replace(/[^a-zA-Z0-9_]/g, "_")}_${idx}_${variant}`;

  let detailSvg = "";
  let strokeColor = "#ffffff";
  let strokeWidth = 1.1 * scale;

  if (cone.style === "matte") {
    strokeColor = "none";
    strokeWidth = 0;
    if (slot % 3 === 0) {
      detailSvg = `<rect x="${xCenter - w * 0.34}" y="${yBase - h * 0.38}" width="${w * 0.68}" height="${3.2 * scale}" rx="${1.5 * scale}" fill="${trimTone}" opacity="0.8"/>`;
    } else if (slot % 3 === 1) {
      detailSvg = `<circle cx="${xCenter}" cy="${yBase - h * 0.52}" r="${3.4 * scale}" fill="#0f172a" opacity="0.45"/>`;
    } else {
      detailSvg = `<polygon points="${xCenter - w * 0.25},${yBase - h * 0.25} ${xCenter + w * 0.25},${yBase - h * 0.25} ${xCenter},${yBase - h * 0.55}" fill="#ffffff" opacity="0.35"/>`;
    }
  } else if (cone.style === "pastel") {
    strokeColor = trimTone;
    strokeWidth = 1.3 * scale;
    if (slot % 2 === 0) {
      detailSvg = `<circle cx="${xCenter}" cy="${yTop - 3.5 * scale}" r="${4 * scale}" fill="${trimTone}" stroke="#ffffff" stroke-width="${0.9 * scale}"/>`;
    } else {
      detailSvg = `<rect x="${xCenter - w * 0.25}" y="${yTop - 4 * scale}" width="${w * 0.5}" height="${4 * scale}" rx="${2 * scale}" fill="${trimTone}"/>`;
    }
  } else if (cone.style === "striped") {
    const yA = yBase - h * (0.24 + (slot % 4) * 0.05);
    const yB = yBase - h * (0.52 + (slot % 3) * 0.07);
    detailSvg = `
      <line x1="${xLeft + 1.5 * scale}" y1="${yA}" x2="${xRight - 1.5 * scale}" y2="${yA}" stroke="${trimTone}" stroke-width="${2.4 * scale}" stroke-linecap="round"/>
      <line x1="${xTopLeft + 1 * scale}" y1="${yB}" x2="${xTopRight - 1 * scale}" y2="${yB}" stroke="#ffffff" stroke-width="${1.8 * scale}" stroke-linecap="round"/>
    `;
  } else if (cone.style === "royal") {
    if (slot === 0) {
      detailSvg = `
        <polygon points="${xCenter - w * 0.36},${yTop + 2 * scale} ${xCenter - w * 0.24},${yTop - 9 * scale} ${xCenter},${yTop - 2 * scale} ${xCenter + w * 0.24},${yTop - 9 * scale} ${xCenter + w * 0.36},${yTop + 2 * scale}" fill="#facc15" stroke="#ffffff" stroke-width="${0.85 * scale}"/>
        <circle cx="${xCenter}" cy="${yTop - 5.5 * scale}" r="${1.7 * scale}" fill="#ef4444"/>
      `;
    } else if (slot === 1) {
      detailSvg = `
        <polygon points="${xCenter},${yTop - 10 * scale} ${xCenter + w * 0.34},${yTop + 2 * scale} ${xCenter - w * 0.34},${yTop + 2 * scale}" fill="#fde047" stroke="#f97316" stroke-width="${0.9 * scale}"/>
        <circle cx="${xCenter}" cy="${yTop - 2.5 * scale}" r="${2.1 * scale}" fill="#0ea5e9"/>
      `;
    } else if (slot === 2) {
      detailSvg = `
        <rect x="${xCenter - w * 0.32}" y="${yTop - 5.5 * scale}" width="${w * 0.64}" height="${5.5 * scale}" rx="${1.5 * scale}" fill="#eab308" stroke="#fef08a" stroke-width="${0.7 * scale}"/>
        <circle cx="${xCenter - w * 0.16}" cy="${yTop - 2.7 * scale}" r="${1.3 * scale}" fill="#22c55e"/>
        <circle cx="${xCenter + w * 0.16}" cy="${yTop - 2.7 * scale}" r="${1.3 * scale}" fill="#ec4899"/>
      `;
    } else {
      detailSvg = `
        <path d="M${xCenter - w * 0.36},${yTop + 1 * scale} L${xCenter - w * 0.3},${yTop - 7.5 * scale} L${xCenter - w * 0.12},${yTop - 2.5 * scale} L${xCenter},${yTop - 9.5 * scale} L${xCenter + w * 0.12},${yTop - 2.5 * scale} L${xCenter + w * 0.3},${yTop - 7.5 * scale} L${xCenter + w * 0.36},${yTop + 1 * scale} Z" fill="#fef08a" stroke="#d97706" stroke-width="${0.8 * scale}"/>
      `;
    }
  } else if (cone.style === "crystal") {
    if (slot === 0) {
      detailSvg = `
        <polygon points="${xCenter},${yTop - 9.5 * scale} ${xCenter + w * 0.36},${yTop + 2 * scale} ${xCenter},${yTop + 8 * scale} ${xCenter - w * 0.36},${yTop + 2 * scale}" fill="#ffffff" opacity="0.72"/>
        <line x1="${xCenter}" y1="${yTop - 9 * scale}" x2="${xCenter}" y2="${yBase - 2 * scale}" stroke="#ffffff" stroke-width="${1.2 * scale}"/>
      `;
    } else if (slot === 1) {
      detailSvg = `
        <polygon points="${xTopLeft},${yTop} ${xRight},${yBase - h * 0.35} ${xLeft},${yBase - h * 0.35}" fill="#e0f2fe" opacity="0.65"/>
        <line x1="${xLeft}" y1="${yBase - h * 0.5}" x2="${xRight}" y2="${yBase - h * 0.5}" stroke="#ffffff" stroke-width="${1.3 * scale}"/>
      `;
    } else if (slot === 2) {
      detailSvg = `
        <polygon points="${xCenter},${yBase - h * 0.72} ${xCenter + w * 0.25},${yBase - h * 0.45} ${xCenter},${yBase - h * 0.18} ${xCenter - w * 0.25},${yBase - h * 0.45}" fill="${trimTone}" stroke="#ffffff" stroke-width="${0.9 * scale}"/>
      `;
    } else {
      detailSvg = `
        <polygon points="${xCenter},${yTop - 10 * scale} ${xCenter + w * 0.28},${yTop + 1 * scale} ${xCenter - w * 0.28},${yTop + 1 * scale}" fill="#ffffff" opacity="0.85"/>
        <line x1="${xCenter - w * 0.2}" y1="${yBase - h * 0.3}" x2="${xCenter + w * 0.2}" y2="${yBase - h * 0.7}" stroke="#ffffff" stroke-width="${1.1 * scale}" opacity="0.7"/>
      `;
    }
  } else if (cone.style === "star") {
    const sy = yTop - 4.8 * scale;
    const sr = (6.5 + (slot % 4) * 1.1) * scale;
    const rot = (variant * 29 + idx * 15) % 72;
    const starFill = slot % 2 === 0 ? "#facc15" : trimTone;
    detailSvg = `
      <g transform="rotate(${rot} ${xCenter} ${sy})">
        <polygon points="${xCenter},${sy - sr} ${xCenter + sr * 0.36},${sy - sr * 0.3} ${xCenter + sr},${sy - sr * 0.2} ${xCenter + sr * 0.5},${sy + sr * 0.3} ${xCenter + sr * 0.62},${sy + sr} ${xCenter},${sy + sr * 0.65} ${xCenter - sr * 0.62},${sy + sr} ${xCenter - sr * 0.5},${sy + sr * 0.3} ${xCenter - sr},${sy - sr * 0.2} ${xCenter - sr * 0.36},${sy - sr * 0.3}" fill="${starFill}" stroke="#ffffff" stroke-width="${0.8 * scale}"/>
      </g>
    `;
  } else if (cone.style === "emoji") {
    const ey = yBase - h * 0.46;
    const faceType = (variant + idx) % 6;
    if (faceType === 0) {
      detailSvg = `
        <rect x="${xCenter - w * 0.3}" y="${ey - 2.2 * scale}" width="${w * 0.26}" height="${3.4 * scale}" rx="${1 * scale}" fill="#0f172a"/>
        <rect x="${xCenter + w * 0.04}" y="${ey - 2.2 * scale}" width="${w * 0.26}" height="${3.4 * scale}" rx="${1 * scale}" fill="#0f172a"/>
        <line x1="${xCenter - w * 0.04}" y1="${ey - 0.5 * scale}" x2="${xCenter + w * 0.04}" y2="${ey - 0.5 * scale}" stroke="#0f172a" stroke-width="${1.4 * scale}"/>
        <path d="M${xCenter - w * 0.16},${ey + 6.5 * scale} Q${xCenter},${ey + 9.5 * scale} ${xCenter + w * 0.16},${ey + 6.5 * scale}" stroke="#0f172a" stroke-width="${1.5 * scale}" fill="none"/>
      `;
    } else if (faceType === 1) {
      detailSvg = `
        <circle cx="${xCenter - w * 0.16}" cy="${ey}" r="${2.1 * scale}" fill="#0f172a"/>
        <circle cx="${xCenter + w * 0.16}" cy="${ey}" r="${2.1 * scale}" fill="#0f172a"/>
        <ellipse cx="${xCenter}" cy="${ey + 6.8 * scale}" rx="${3.6 * scale}" ry="${2.8 * scale}" fill="#0f172a"/>
      `;
    } else if (faceType === 2) {
      detailSvg = `
        <path d="M${xCenter - w * 0.24},${ey - 1.2 * scale} L${xCenter - w * 0.1},${ey + 0.8 * scale} L${xCenter - w * 0.24},${ey + 2.8 * scale}" stroke="#0f172a" stroke-width="${1.5 * scale}" fill="none"/>
        <circle cx="${xCenter + w * 0.16}" cy="${ey}" r="${2.1 * scale}" fill="#0f172a"/>
        <path d="M${xCenter - w * 0.16},${ey + 6.2 * scale} Q${xCenter},${ey + 10.2 * scale} ${xCenter + w * 0.16},${ey + 6.2 * scale}" stroke="#0f172a" stroke-width="${1.5 * scale}" fill="none"/>
      `;
    } else if (faceType === 3) {
      detailSvg = `
        <line x1="${xCenter - w * 0.26}" y1="${ey - 3.2 * scale}" x2="${xCenter - w * 0.06}" y2="${ey - 0.2 * scale}" stroke="#0f172a" stroke-width="${1.6 * scale}"/>
        <line x1="${xCenter + w * 0.26}" y1="${ey - 3.2 * scale}" x2="${xCenter + w * 0.06}" y2="${ey - 0.2 * scale}" stroke="#0f172a" stroke-width="${1.6 * scale}"/>
        <circle cx="${xCenter - w * 0.15}" cy="${ey + 1.2 * scale}" r="${1.7 * scale}" fill="#0f172a"/>
        <circle cx="${xCenter + w * 0.15}" cy="${ey + 1.2 * scale}" r="${1.7 * scale}" fill="#0f172a"/>
        <path d="M${xCenter - w * 0.16},${ey + 7.2 * scale} L${xCenter + w * 0.16},${ey + 7.2 * scale}" stroke="#0f172a" stroke-width="${1.6 * scale}"/>
      `;
    } else if (faceType === 4) {
      detailSvg = `
        <circle cx="${xCenter - w * 0.16}" cy="${ey}" r="${2.3 * scale}" fill="#0f172a"/>
        <circle cx="${xCenter + w * 0.16}" cy="${ey}" r="${2.3 * scale}" fill="#0f172a"/>
        <circle cx="${xCenter - w * 0.13}" cy="${ey - 0.8 * scale}" r="${0.8 * scale}" fill="#ffffff"/>
        <circle cx="${xCenter + w * 0.19}" cy="${ey - 0.8 * scale}" r="${0.8 * scale}" fill="#ffffff"/>
        <path d="M${xCenter - w * 0.18},${ey + 5.8 * scale} Q${xCenter},${ey + 10 * scale} ${xCenter + w * 0.18},${ey + 5.8 * scale}" stroke="#0f172a" stroke-width="${1.6 * scale}" fill="none"/>
      `;
    } else {
      detailSvg = `
        <circle cx="${xCenter - w * 0.16}" cy="${ey}" r="${1.9 * scale}" fill="#0f172a"/>
        <circle cx="${xCenter + w * 0.16}" cy="${ey}" r="${1.9 * scale}" fill="#0f172a"/>
        <path d="M${xCenter - w * 0.14},${ey + 6.8 * scale} Q${xCenter + w * 0.04},${ey + 8.5 * scale} ${xCenter + w * 0.18},${ey + 5.5 * scale}" stroke="#0f172a" stroke-width="${1.6 * scale}" fill="none"/>
      `;
    }
  } else if (cone.style === "neon") {
    strokeColor = trimTone;
    strokeWidth = 1.6 * scale;
    if (slot % 3 === 0) {
      detailSvg = `<ellipse cx="${xCenter}" cy="${yBase - h * 0.45}" rx="${w * 0.25}" ry="${2.4 * scale}" fill="none" stroke="#ffffff" stroke-width="${1.2 * scale}"/>`;
    } else if (slot % 3 === 1) {
      detailSvg = `<line x1="${xCenter}" y1="${yTop + 2 * scale}" x2="${xCenter}" y2="${yBase - 2 * scale}" stroke="#ffffff" stroke-width="${1.3 * scale}" opacity="0.85"/>`;
    } else {
      detailSvg = `<rect x="${xCenter - w * 0.22}" y="${yBase - h * 0.62}" width="${w * 0.44}" height="${2.2 * scale}" fill="${trimTone}"/>`;
    }
  }

  const glowPx = (4.5 + (slot % 4) * 1.4) * scale;
  const glowColor = cone.style === "neon" ? trimTone : cardTone;
  const filterAttr = cone.style === "neon"
    ? `filter="drop-shadow(0 0 ${glowPx}px ${glowColor})"`
    : (cone.style === "crystal" || cone.style === "royal" || cone.style === "star")
      ? `filter="drop-shadow(0 0 ${3 * scale}px ${glowColor})"`
      : "";

  return `
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${esc(colorHex)}"/>
        <stop offset="100%" stop-color="${esc(cardTone)}" stop-opacity="0.86"/>
      </linearGradient>
    </defs>
    <g data-cone-idx="${idx}" ${filterAttr}>
      <path d="M${xLeft},${yBase} L${xTopLeft},${yTop} L${xTopRight},${yTop} L${xRight},${yBase} Z" fill="url(#${gradId})" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
      <ellipse cx="${xCenter}" cy="${yBase}" rx="${w * 0.54}" ry="${3.6 * scale}" fill="${esc(colorHex)}" stroke="${trimTone}" stroke-width="${1.1 * scale}"/>
      ${detailSvg}
    </g>
  `;
}

function renderConeSetPreview(cone, large = false) {
  const cols = cone.colors || PLAYER_COLORS;
  const animClass = cone.anim && cone.anim !== "none" ? `ss-anim-${cone.anim}` : "";
  const sizeClass = large ? "lg" : "sm";
  const viewBox = large ? "0 0 220 96" : "0 0 152 68";
  const scale = large ? 1.55 : 1.05;
  const cxBase = large ? 34 : 23;
  const gap = large ? 50 : 35;
  const yFloor = large ? 76 : 54;

  return `
    <div class="ss-cone-stage ${sizeClass} ${esc(animClass)}">
      <svg class="ss-cone-svg" viewBox="${viewBox}" aria-label="${esc(cone.name)} preview">
        <ellipse cx="${large ? 110 : 76}" cy="${yFloor + 3 * scale}" rx="${large ? 96 : 66}" ry="${large ? 7 : 5}" fill="rgba(250,204,21,0.16)" stroke="rgba(250,204,21,0.45)" stroke-width="1"/>
        ${[0, 1, 2, 3].map((idx) => renderSingleConeSvg(
          cone,
          cols[idx % cols.length],
          cxBase + idx * gap,
          yFloor,
          scale,
          idx
        )).join("")}
      </svg>
    </div>
  `;
}

function renderLargePreviewScreen(cone) {
  const owned = isOwned(cone.id);
  const applied = isApplied(cone.id);

  return `
    <div class="ss-preview-screen">
      <div class="ss-preview-top">
        <span class="ss-badge">${esc(cone.category)}</span>
        <span class="ss-status ${applied ? "applied" : (owned ? "owned" : "locked")}">${esc(getStatusText(cone.id))}</span>
      </div>

      ${renderConeSetPreview(cone, true)}

      <div class="ss-preview-title">${esc(cone.name)}</div>
      <div class="ss-preview-meta">
        <span>Category: <strong>${esc(cone.category)}</strong></span>
        <span>Price: <strong>${esc(getPriceText(cone))}</strong></span>
      </div>

      <div class="ss-actions" style="margin-top:10px;">
        <button type="button" class="ss-btn-sub" id="ss-preview-back">← Back</button>
        ${!owned
          ? `<button type="button" class="ss-btn-main" data-ss-unlock="${esc(cone.id)}">Unlock</button>`
          : `<button type="button" class="ss-btn-main ${applied ? "applied" : ""}" data-ss-apply="${esc(cone.id)}">${applied ? "Applied" : "Apply"}</button>`
        }
      </div>
    </div>
  `;
}

function renderConfirmScreen(info) {
  return `
    <div class="ss-confirm-box">
      <div class="ss-badge">${esc(info.cone.category)} • CONFIRM PURCHASE</div>
      <div class="ss-preview-title" style="margin-top:4px;">${esc(info.cone.name)}</div>
      <p class="ss-confirm-text">
        Unlock this cone for <strong>${esc(getPriceText(info.cone))}</strong>? Once unlocked, it stays owned permanently on your account.
      </p>
      <div class="ss-actions">
        <button type="button" class="ss-btn-sub" id="ss-confirm-cancel">Cancel</button>
        <button type="button" class="ss-btn-main" id="ss-confirm-yes">Confirm Unlock</button>
      </div>
    </div>
  `;
}

function renderConeCard(cone) {
  const owned = isOwned(cone.id);
  const applied = isApplied(cone.id);

  return `
    <div class="ss-card ${applied ? "is-applied" : ""}" data-cat="${esc(cone.category)}">
      <div class="ss-card-top">
        <span class="ss-badge">${esc(cone.category)}</span>
        <span class="ss-status ${applied ? "applied" : (owned ? "owned" : "locked")}">${esc(getStatusText(cone.id))}</span>
      </div>

      ${renderConeSetPreview(cone, false)}

      <div class="ss-name">${esc(cone.name)}</div>
      <div class="ss-price">${esc(getPriceText(cone))}</div>

      <div class="ss-actions">
        <button type="button" class="ss-btn-sub" data-ss-preview="${esc(cone.id)}">Preview</button>
        ${!owned
          ? `<button type="button" class="ss-btn-main" data-ss-unlock="${esc(cone.id)}">Unlock</button>`
          : `<button type="button" class="ss-btn-main ${applied ? "applied" : ""}" data-ss-apply="${esc(cone.id)}">${applied ? "Applied" : "Apply"}</button>`
        }
      </div>
    </div>
  `;
}

function renderShopView() {
  if (pendingConfirm) {
    return renderConfirmScreen(pendingConfirm);
  }
  if (previewMode && previewConeId) {
    return renderLargePreviewScreen(getConeById(previewConeId));
  }

  const tabs = ["FREE", "COINS", "ROYAL", "CRYSTAL", "STAR", "EMOJI", "NEON"];
  const allMatching = getItemsForTab(activeTab);
  const totalPages = Math.max(1, Math.ceil(allMatching.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allMatching.slice(startIdx, startIdx + PAGE_SIZE);

  return `
    <div class="ss-wallet-bar">
      <span>🪙 ${Number(state.coins || 0).toLocaleString("en-IN")} Coins</span>
      <span>💎 ${Number(state.gems || 0).toLocaleString("en-IN")} Diamonds</span>
    </div>

    <div class="ss-tabs" role="tablist" aria-label="Cone Categories">
      ${tabs.map((tab) => `
        <button type="button" class="ss-tab ${activeTab === tab ? "active" : ""}" data-ss-tab="${tab}">${tab}</button>
      `).join("")}
    </div>

    <div class="ss-grid">
      ${pageItems.map(renderConeCard).join("")}
    </div>

    ${totalPages > 1 ? `
      <div class="ss-pagination">
        <button type="button" class="ss-btn-sub" id="ss-prev-page" ${currentPage <= 1 ? "disabled" : ""}>← Prev</button>
        <span class="ss-page-info">Page ${currentPage} / ${totalPages} (${allMatching.length})</span>
        <button type="button" class="ss-btn-sub" id="ss-next-page" ${currentPage >= totalPages ? "disabled" : ""}>Next →</button>
      </div>
    ` : ""}
  `;
}

async function executeUnlock(coneId) {
  const cone = getConeById(coneId);
  if (!cone) return;

  if (isOwned(cone.id)) {
    await executeApply(cone.id);
    return;
  }

  const uid = auth.currentUser?.uid || "";
  const lockKey = `${uid || "guest"}_${cone.id}`;
  if (activeShopPurchases.has(lockKey)) {
    window.showToast?.("আগের কেনাকাটার অনুরোধ প্রসেস হচ্ছে...");
    return;
  }

  if (cone.currency === "diamonds" && (state.gems || 0) < cone.price) {
    window.showToast?.("পর্যাপ্ত Diamonds নেই।");
    return;
  }
  if (cone.currency === "coins" && (state.coins || 0) < cone.price) {
    window.showToast?.("পর্যাপ্ত Coins নেই।");
    return;
  }

  activeShopPurchases.add(lockKey);
  try {
    if (typeof window.processServerSkinPurchase === "function") {
      const res = await window.processServerSkinPurchase({
        uid,
        skinId: cone.id,
        price: Number(cone.price) || 0,
        currency: cone.currency || "coins"
      });
      if (!res || !res.success) {
        window.showToast?.(res?.message || "স্কিন কেনা যায়নি।");
        return;
      }
      await hydrateUserFromFirebase();
    } else {
      if (cone.currency === "diamonds") {
        state.gems = Math.max(0, (state.gems || 0) - cone.price);
      } else if (cone.currency === "coins") {
        state.coins = Math.max(0, (state.coins || 0) - cone.price);
      }
      state.ownedSkins[cone.id] = true;
      await persistPatch({
        coins: state.coins,
        gems: state.gems,
        [`ownedCones/${cone.id}`]: true
      });
    }

    window.showToast?.(`${cone.name} unlocked!`);
    openSkinShop();
  } finally {
    activeShopPurchases.delete(lockKey);
  }
}

function handleUnlockClick(coneId) {
  const cone = getConeById(coneId);
  if (!cone) return;

  if (isOwned(cone.id)) {
    executeApply(cone.id);
    return;
  }

  if (cone.currency === "diamonds") {
    if ((state.gems || 0) < cone.price) {
      window.showToast?.("পর্যাপ্ত Diamonds নেই।");
      return;
    }
    if (cone.price >= 350) {
      pendingConfirm = { coneId: cone.id, cone };
      openSkinShop();
      return;
    }
  } else if (cone.currency === "coins") {
    if ((state.coins || 0) < cone.price) {
      window.showToast?.("পর্যাপ্ত Coins নেই।");
      return;
    }
    if (cone.price >= 1500) {
      pendingConfirm = { coneId: cone.id, cone };
      openSkinShop();
      return;
    }
  }

  executeUnlock(cone.id);
}

async function executeApply(coneId) {
  const cone = getConeById(coneId);
  if (!cone || !isOwned(cone.id)) return;

  state.equippedCone = cone.id;
  await persistPatch({
    equippedCone: cone.id
  });

  notifyConeApplied();
  window.showToast?.(`${cone.name} applied!`);
  openSkinShop();
}

function bindEvents(bodyEl) {
  bodyEl.querySelectorAll("[data-ss-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.LudoSound?.click();
      activeTab = btn.dataset.ssTab;
      currentPage = 1;
      previewMode = false;
      pendingConfirm = null;
      openSkinShop();
    });
  });

  bodyEl.querySelector("#ss-prev-page")?.addEventListener("click", () => {
    if (currentPage > 1) {
      window.LudoSound?.click();
      currentPage -= 1;
      openSkinShop();
    }
  });

  bodyEl.querySelector("#ss-next-page")?.addEventListener("click", () => {
    window.LudoSound?.click();
    currentPage += 1;
    openSkinShop();
  });

  bodyEl.querySelectorAll("[data-ss-preview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.LudoSound?.click();
      previewConeId = btn.dataset.ssPreview;
      previewMode = true;
      pendingConfirm = null;
      openSkinShop();
    });
  });

  bodyEl.querySelector("#ss-preview-back")?.addEventListener("click", () => {
    window.LudoSound?.click();
    previewMode = false;
    openSkinShop();
  });

  bodyEl.querySelectorAll("[data-ss-unlock]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.LudoSound?.click();
      handleUnlockClick(btn.dataset.ssUnlock);
    });
  });

  bodyEl.querySelectorAll("[data-ss-apply]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.LudoSound?.click();
      executeApply(btn.dataset.ssApply);
    });
  });

  bodyEl.querySelector("#ss-confirm-cancel")?.addEventListener("click", () => {
    window.LudoSound?.click();
    pendingConfirm = null;
    openSkinShop();
  });

  bodyEl.querySelector("#ss-confirm-yes")?.addEventListener("click", () => {
    window.LudoSound?.click();
    const targetId = pendingConfirm?.coneId;
    pendingConfirm = null;
    if (targetId) executeUnlock(targetId);
  });
}

export async function openSkinShop(initialTab) {
  if (initialTab && ["FREE", "COINS", "ROYAL", "CRYSTAL", "STAR", "EMOJI", "NEON"].includes(initialTab)) {
    activeTab = initialTab;
    currentPage = 1;
  }

  await hydrateUserFromFirebase();

  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  if (!modalOverlay || !modalTitle || !modalBody) return;

  window.LudoSound?.click();
  modalTitle.textContent = previewMode ? "👑 CONE PREVIEW" : "🎨 LUDO ADDA PRO CONE SHOP";
  modalBody.innerHTML = renderShopView();
  modalOverlay.classList.remove("hidden");
  bindEvents(modalBody);
}

auth.onAuthStateChanged(() => {
  hydrateUserFromFirebase().then(() => notifyConeApplied());
});

window.addEventListener("DOMContentLoaded", () => {
  syncHeaderBalances();
  notifyConeApplied();
});

window.LudoSkinShop = {
  openSkinShop,
  hydrateFromFirebase: hydrateUserFromFirebase,
  getActiveTheme,
  getEquippedCone: () => getConeById(state.equippedCone),
  getCatalog: () => CONE_CATALOG,
  getState: () => ({ ...state })
};
