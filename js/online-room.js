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

// ৬-অক্ষরের প্রাইভেট রুম কোড জেনারেটর
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// বর্তমান ইউজারের তথ্য সংগ্রহ
function getCurrentPlayerInfo() {
  const user = auth.currentUser;
  const profile = window.currentRoyalProfile;
  if (!user) return null;
  return {
    uid: user.uid,
    name: profile?.name || user.displayName || `Player_${user.uid.slice(0, 5)}`,
    avatar: profile?.avatar || user.photoURL || "",
    ready: true,
    joinedAt: Date.now()
  };
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
    status: "waiting", // waiting | playing | finished
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
    if (room.status !== "waiting" || currentCount >= room.maxPlayers) {
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

// পাবলিক অনলাইন ম্যাচমেকিং (2P বা 4P)
export async function findOnlineMatch(maxPlayers = 2, onMatched) {
  const me = getCurrentPlayerInfo();
  if (!me) throw new Error("Please sign in first (Google, Facebook, or Guest).");

  const queuePath = `matchmaking/${maxPlayers}p`;
  const queueRef = ref(db, queuePath);
  const snap = await get(queueRef);

  if (snap.exists()) {
    const entries = snap.val();
    const openKey = Object.keys(entries).find(
      (k) => entries[k].uid !== me.uid && entries[k].status === "searching"
    );

    if (openKey) {
      const target = entries[openKey];
      const roomCode = target.roomId;
      await update(ref(db, `${queuePath}/${openKey}`), { status: "matched" });
      const joinedRoom = await joinPrivateRoom(roomCode);
      if (Object.keys(joinedRoom.players || {}).length >= maxPlayers) {
        await update(ref(db, `rooms/${roomCode}`), { status: "playing" });
      }
      onMatched(joinedRoom);
      return;
    }
  }

  // কেউ অপেক্ষায় না থাকলে নতুন রুম খুলে কিউতে অপেক্ষা করা
  const roomCode = generateRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const payload = buildRoomPayload(roomCode, me, maxPlayers, false);
  await set(roomRef, payload);

  const myQueueNode = push(queueRef);
  activeQueueRef = myQueueNode;
  await set(myQueueNode, {
    uid: me.uid,
    name: me.name,
    roomId: roomCode,
    status: "searching",
    createdAt: Date.now()
  });

  activeRoomId = roomCode;
  activeRoomRef = roomRef;
  onMatched(payload);
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

// হোস্ট কর্তৃক ম্যাচ শুরু করা
export async function startOnlineRoomMatch(roomId) {
  await update(ref(db, `rooms/${roomId}`), {
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
  }
  if (activeRoomRef) {
    off(activeRoomRef);
    activeRoomRef = null;
  }
  activeRoomId = null;
}
