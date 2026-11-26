// Online Matchmaking & Private Room Controller for Ludo Kingdom Pro
import { auth, db } from "./firebase-config.js";
import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  off,
  push
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const COLOR_ORDER_2P = ["red", "yellow"];
const COLOR_ORDER_4P = ["red", "green", "yellow", "blue"];

let activeRoomId = null;
let activeRoomRef = null;
let activeQueueRef = null;
let activeQueueKey = null;
let activeQueuePath = null;

// ৬-অক্ষরের প্রাইভেট রুম কোড জেনারেটর
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// বর্তমান ইউজারের তথ্য সংগ্রহ (শুধুমাত্র সত্যিকারের প্রোফাইল তথ্য)
function getCurrentPlayerInfo() {
  const user = auth.currentUser;
  const profile = window.currentRoyalProfile;
  if (!user) return null;
  return {
    uid: user.uid,
    name: profile?.name || user.displayName || `Player_${user.uid.slice(0, 5)}`,
    avatar: profile?.avatar || user.photoURL || "",
    level: typeof profile?.level === "number" ? profile.level : null,
    tier: typeof profile?.tier === "string" && profile.tier.trim() ? profile.tier.trim() : null,
    ready: true,
    joinedAt: Date.now()
  };
}

// রুমের প্লেয়ারদের সাজানো তালিকা তৈরি
function getMatchedPlayersList(roomData) {
  const playersObj = roomData?.players || {};
  const list = Object.values(playersObj).filter((p) => p && p.uid);
  list.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  return list;
}

// নতুন রুম অবজেক্ট তৈরি
function buildRoomPayload(roomId, hostPlayer, maxPlayers, isPrivate) {
  const colors = maxPlayers === 2 ? COLOR_ORDER_2P : COLOR_ORDER_4P;
  const players = {};
  players[hostPlayer.uid] = {
    ...hostPlayer,
    color: colors[0],
    isHost: true
  };

  return {
    roomId,
    isPrivate,
    maxPlayers,
    status: "waiting", // waiting | matched | playing | finished
    hostUid: hostPlayer.uid,
    turnColor: colors[0],
    lastDice: 0,
    lastMove: null,
    createdAt: Date.now(),
    players
  };
}

// প্রাইভেট রুম তৈরি করা
export async function createPrivateRoom(maxPlayers = 4) {
  const me = getCurrentPlayerInfo();
  if (!me) throw new Error("Please sign in first (Google, Facebook, or Guest).");

  const roomCode = generateRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const payload = buildRoomPayload(roomCode, me, maxPlayers, true);
  await set(roomRef, payload);

  activeRoomId = roomCode;
  activeRoomRef = roomRef;
  return payload;
}

// কোড দিয়ে প্রাইভেট রুমে জয়েন করা
export async function joinPrivateRoom(roomCodeInput) {
  const me = getCurrentPlayerInfo();
  if (!me) throw new Error("Please sign in first (Google, Facebook, or Guest).");

  const roomCode = roomCodeInput.trim().toUpperCase();
  if (roomCode.length < 4) throw new Error("Enter a valid room code.");

  const roomRef = ref(db, `rooms/${roomCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error("Room not found! Check the code.");

  const room = snap.val();
  const players = room.players || {};
  const currentCount = Object.keys(players).length;

  if (!players[me.uid]) {
    if ((room.status !== "waiting" && room.status !== "matched") || currentCount >= room.maxPlayers) {
      throw new Error("This room is already full or in progress.");
    }
    const colors = room.maxPlayers === 2 ? COLOR_ORDER_2P : COLOR_ORDER_4P;
    const assignedColor = colors[currentCount] || "blue";

    await update(ref(db, `rooms/${roomCode}/players/${me.uid}`), {
      ...me,
      color: assignedColor,
      isHost: false
    });
  }

  activeRoomId = roomCode;
  activeRoomRef = roomRef;
  const updatedSnap = await get(roomRef);
  return updatedSnap.val();
}

// ম্যাচমেকিং কিউ বা রুম বাতিল করা
export async function cancelMatchmaking() {
  await leaveOnlineRoom();
}

// পাবলিক অনলাইন ম্যাচমেকিং (2P বা 4P — শুধুমাত্র সত্যিকারের প্লেয়ার ও State অনুযায়ী)
export async function findOnlineMatch(maxPlayers = 2, callbacks = {}) {
  const me = getCurrentPlayerInfo();
  if (!me) {
    throw new Error("Please sign in first (Google, Facebook, or Guest).");
  }

  const targetCount = maxPlayers === 4 ? 4 : 2;
  let hasEmittedMatchFound = false;

  // পূর্বের কোনো অসম্পূর্ণ কিউ বা লিসেনার থাকলে পরিষ্কার করা
  await leaveOnlineRoom();

  const queuePath = `matchmaking/${targetCount}p`;
  const queueRef = ref(db, queuePath);
  const snap = await get(queueRef);

  const emitMatchFoundIfReady = async (roomData) => {
    if (hasEmittedMatchFound || !roomData) return;
    const matchedPlayers = getMatchedPlayersList(roomData);
    if (matchedPlayers.length < targetCount) return;

    hasEmittedMatchFound = true;

    if (roomData.status === "waiting") {
      await update(ref(db, `rooms/${roomData.roomId}`), {
        status: "matched",
        matchedAt: Date.now()
      }).catch(() => {});
    }

    const matchPayload = {
      ...roomData,
      maxPlayers: targetCount,
      matchedPlayers
    };

    if (typeof callbacks.onStatusChange === "function") {
      callbacks.onStatusChange("matched", matchPayload);
    }
    if (typeof callbacks.onMatchFound === "function") {
      callbacks.onMatchFound(matchPayload);
    } else if (typeof callbacks.onMatched === "function") {
      callbacks.onMatched(matchPayload);
    }
  };

  if (snap.exists()) {
    const entries = snap.val();
    const openKey = Object.keys(entries).find(
      (k) =>
        entries[k] &&
        entries[k].uid !== me.uid &&
        entries[k].status === "searching" &&
        entries[k].roomId
    );

    if (openKey) {
      const target = entries[openKey];
      const roomCode = target.roomId;

      await update(ref(db, `${queuePath}/${openKey}`), {
        status: "matched",
        matchedBy: me.uid
      });

      const joinedRoom = await joinPrivateRoom(roomCode);
      const currentPlayers = getMatchedPlayersList(joinedRoom);

      if (currentPlayers.length >= targetCount) {
        await update(ref(db, `rooms/${roomCode}`), {
          status: "matched",
          matchedAt: Date.now()
        });
        await emitMatchFoundIfReady({ ...joinedRoom, status: "matched" });
        return {
          ...joinedRoom,
          maxPlayers: targetCount,
          matchedPlayers: currentPlayers
        };
      }
    }
  }

  // প্রয়োজনীয় সংখ্যক প্লেয়ার না পাওয়া গেলে নতুন রুম তৈরি করে 'searching' অবস্থায় কিউতে রাখা
  const roomCode = generateRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const payload = buildRoomPayload(roomCode, me, targetCount, false);
  await set(roomRef, payload);

  const myQueueNode = push(queueRef);
  activeQueueRef = myQueueNode;
  activeQueueKey = myQueueNode.key;
  activeQueuePath = queuePath;

  await set(myQueueNode, {
    uid: me.uid,
    name: me.name,
    roomId: roomCode,
    status: "searching",
    createdAt: Date.now()
  });

  activeRoomId = roomCode;
  activeRoomRef = roomRef;

  if (typeof callbacks.onStatusChange === "function") {
    callbacks.onStatusChange("searching", {
      ...payload,
      matchedPlayers: getMatchedPlayersList(payload)
    });
  }

  const handleRoomUpdate = async (roomSnap) => {
    if (!roomSnap.exists()) return;
    const roomData = roomSnap.val();
    const matchedPlayers = getMatchedPlayersList(roomData);

    if (matchedPlayers.length >= targetCount) {
      if (activeQueueRef) {
        await remove(activeQueueRef).catch(() => {});
        activeQueueRef = null;
      }
      await emitMatchFoundIfReady(roomData);
    }
  };

  onValue(roomRef, handleRoomUpdate);
  return payload;
}

// রুমের রিয়েল-টাইম আপডেট শোনা
export function subscribeToRoom(roomId, callback) {
  const roomRef = ref(db, `rooms/${roomId}`);
  activeRoomId = roomId;
  activeRoomRef = roomRef;
  onValue(roomRef, (snap) => {
    if (snap.exists()) {
      callback(snap.val());
    }
  });
}

// ম্যাচ শুরু করা (কাউন্টডাউন শেষে বা অনুমোদিত অবস্থায়)
export async function startOnlineRoomMatch(roomId) {
  if (!roomId) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const roomData = snap.val();
  const required = roomData.maxPlayers === 4 ? 4 : 2;
  const playersCount = Object.keys(roomData.players || {}).length;
  if (playersCount < required) return;

  await update(roomRef, {
    status: "playing",
    startedAt: Date.now()
  });
}

// ছক্কা ও চালের তথ্য সার্ভারে পাঠানো
export async function pushRoomMove(roomId, moveData) {
  await update(ref(db, `rooms/${roomId}`), {
    ...moveData,
    updatedAt: Date.now()
  });
}

// রুম বা ম্যাচমেকিং ছেড়ে বের হওয়া
export async function leaveOnlineRoom() {
  if (activeQueueRef) {
    await remove(activeQueueRef).catch(() => {});
    activeQueueRef = null;
  } else if (activeQueuePath && activeQueueKey) {
    await remove(ref(db, `${activeQueuePath}/${activeQueueKey}`)).catch(() => {});
  }
  activeQueueKey = null;
  activeQueuePath = null;

  if (activeRoomRef) {
    off(activeRoomRef);
    activeRoomRef = null;
  }
  activeRoomId = null;
}

window.LudoOnlineRoom = {
  ...(window.LudoOnlineRoom || {}),
  findOnlineMatch,
  cancelMatchmaking,
  leaveOnlineRoom,
  subscribeToRoom,
  startOnlineRoomMatch,
  pushRoomMove
};
