// js/text-chat.js — LUDO ADDA PRO Private Chat System (1-to-1 Friends Chat, Presence, Unread, Emoji, Block/Report — Text & Emoji Only)
import { auth, db } from "./firebase-config.js";
import {
  ref,
  query,
  limitToLast,
  onChildAdded,
  onValue,
  off,
  get,
  push,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const QUICK_EMOJIS = ["😀", "😂", "😍", "🔥", "👑", "😎", "👏", "🎉", "🤝", "🎲"];
const MAX_TEXT_LENGTH = 300;

function cleanStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function getDirectThreadId(uidA, uidB) {
  const a = cleanStr(uidA);
  const b = cleanStr(uidB);
  if (!a || !b) return "";
  return [a, b].sort().join("__");
}

class LudoPrivateChatManager {
  constructor() {
    this.currentUid = null;
    this.activePeerUid = null;
    this.activeThreadId = null;
    this.dmQuery = null;
    this.dmChildAddedCb = null;
    this.peerPresenceRef = null;
    this.peerPresenceCb = null;
    this.peerOnline = false;

    this.blockedUids = new Set();
    this.unreadCounts = {};
    this.seenMessageKeys = new Set();
    this.messageListeners = new Set();
    this.presenceListeners = new Set();
    this.unreadListeners = new Set();
  }

  getQuickEmojis() {
    return [...QUICK_EMOJIS];
  }

  resolveUid(explicitUid = null) {
    return cleanStr(explicitUid) || cleanStr(this.currentUid) || cleanStr(auth.currentUser?.uid) || "";
  }

  onMessage(cb) {
    if (typeof cb === "function") {
      this.messageListeners.add(cb);
    }
    return () => {
      this.messageListeners.delete(cb);
    };
  }

  onPresenceChange(cb) {
    if (typeof cb === "function") {
      this.presenceListeners.add(cb);
    }
    return () => {
      this.presenceListeners.delete(cb);
    };
  }

  onUnreadChange(cb) {
    if (typeof cb === "function") {
      this.unreadListeners.add(cb);
    }
    return () => {
      this.unreadListeners.delete(cb);
    };
  }

  emitMessage(payload) {
    if (payload?.senderUid && this.blockedUids.has(payload.senderUid)) return;
    this.messageListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (_) {}
    });
  }

  emitPresence(peerUid, online) {
    this.presenceListeners.forEach((cb) => {
      try {
        cb({ peerUid, online: Boolean(online) });
      } catch (_) {}
    });
  }

  emitUnread() {
    const total = Object.values(this.unreadCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);
    this.unreadListeners.forEach((cb) => {
      try {
        cb({ byThread: { ...this.unreadCounts }, total });
      } catch (_) {}
    });
  }

  clearUnread(threadKey) {
    const key = cleanStr(threadKey);
    if (!key) return;
    this.unreadCounts[key] = 0;
    this.emitUnread();
  }

  recordIncomingUnread(threadKey, senderUid) {
    const me = this.resolveUid();
    if (!senderUid || senderUid === me || this.blockedUids.has(senderUid)) return;
    this.unreadCounts[threadKey] = (Number(this.unreadCounts[threadKey]) || 0) + 1;
    this.emitUnread();
  }

  async setUserOnlineStatus(isOnline = true, explicitUid = null) {
    const uid = this.resolveUid(explicitUid);
    if (!uid) return false;
    try {
      await set(ref(db, `presence/${uid}`), {
        online: Boolean(isOnline),
        lastSeen: Date.now()
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  async getPeerOnlineStatus(peerUid) {
    const cleanPeer = cleanStr(peerUid);
    if (!cleanPeer) return { online: false, lastSeen: null };
    try {
      const snap = await get(ref(db, `presence/${cleanPeer}`));
      if (!snap.exists()) return { online: false, lastSeen: null };
      const val = snap.val() || {};
      return { online: Boolean(val.online), lastSeen: val.lastSeen || null };
    } catch (_) {
      return { online: false, lastSeen: null };
    }
  }

  async refreshBlockedList(explicitUid = null) {
    const uid = this.resolveUid(explicitUid);
    if (!uid) {
      this.blockedUids.clear();
      return [];
    }
    try {
      const snap = await get(ref(db, `users/${uid}/blockedUsers`));
      this.blockedUids.clear();
      if (snap.exists()) {
        const val = snap.val() || {};
        Object.keys(val).forEach((targetId) => {
          if (val[targetId]) this.blockedUids.add(targetId);
        });
      }
    } catch (_) {}
    return [...this.blockedUids];
  }

  isUserBlocked(targetUid) {
    const cleanTarget = cleanStr(targetUid);
    return Boolean(cleanTarget && this.blockedUids.has(cleanTarget));
  }

  async blockUser(targetUid, explicitUid = null) {
    const uid = this.resolveUid(explicitUid);
    const cleanTarget = cleanStr(targetUid);
    if (!uid || !cleanTarget || uid === cleanTarget) {
      return { ok: false, error: "Invalid user." };
    }
    try {
      await update(ref(db, `users/${uid}/blockedUsers`), {
        [cleanTarget]: true
      });
      this.blockedUids.add(cleanTarget);
      return { ok: true, blockedUid: cleanTarget };
    } catch (err) {
      return { ok: false, error: err?.message || "Failed to block user." };
    }
  }

  async unblockUser(targetUid, explicitUid = null) {
    const uid = this.resolveUid(explicitUid);
    const cleanTarget = cleanStr(targetUid);
    if (!uid || !cleanTarget) {
      return { ok: false, error: "Invalid user." };
    }
    try {
      await update(ref(db, `users/${uid}/blockedUsers`), {
        [cleanTarget]: null
      });
      this.blockedUids.delete(cleanTarget);
      return { ok: true, unblockedUid: cleanTarget };
    } catch (err) {
      return { ok: false, error: err?.message || "Failed to unblock user." };
    }
  }

  async reportUser(targetUid, reason = "Abusive or spam behavior", context = {}, explicitUid = null) {
    const uid = this.resolveUid(explicitUid);
    const cleanTarget = cleanStr(targetUid);
    const cleanReason = cleanStr(reason) || "Abusive or spam behavior";
    if (!uid || !cleanTarget) {
      return { ok: false, error: "Invalid report target." };
    }
    try {
      const reportRef = push(ref(db, "reports"));
      await set(reportRef, {
        reporterUid: uid,
        reportedUid: cleanTarget,
        reason: cleanReason.slice(0, 200),
        threadId: context.threadId || this.activeThreadId || null,
        createdAt: Date.now()
      });
      return { ok: true, reportId: reportRef.key };
    } catch (err) {
      return { ok: false, error: err?.message || "Failed to submit report." };
    }
  }

  async mountDirectChat(peerUid, currentUid = null) {
    this.unmountDirectChat();

    const me = this.resolveUid(currentUid);
    const peer = cleanStr(peerUid);
    if (!me || !peer || me === peer) {
      return false;
    }

    await this.refreshBlockedList(me);

    const threadId = getDirectThreadId(me, peer);
    this.currentUid = me;
    this.activePeerUid = peer;
    this.activeThreadId = threadId;
    this.clearUnread(`dm:${threadId}`);

    this.peerPresenceRef = ref(db, `presence/${peer}`);
    this.peerPresenceCb = (snap) => {
      const pVal = snap.exists() ? snap.val() : null;
      this.peerOnline = Boolean(pVal?.online);
      this.emitPresence(peer, this.peerOnline);
    };
    onValue(this.peerPresenceRef, this.peerPresenceCb);

    this.dmQuery = query(
      ref(db, `directMessages/${threadId}/messages`),
      limitToLast(50)
    );
    this.dmChildAddedCb = (snap) => {
      if (this.activeThreadId !== threadId) return;
      const val = snap.val();
      if (!val || typeof val !== "object") return;
      if (val.senderUid && this.blockedUids.has(val.senderUid)) return;

      const dedupeKey = `dm:${threadId}:${snap.key}`;
      if (!this.seenMessageKeys.has(dedupeKey)) {
        this.seenMessageKeys.add(dedupeKey);
        this.recordIncomingUnread(`dm:${threadId}`, val.senderUid);
      }

      this.emitMessage({
        id: snap.key,
        channel: "direct",
        threadId,
        peerUid: peer,
        ...val
      });
    };
    onChildAdded(this.dmQuery, this.dmChildAddedCb);

    return true;
  }

  async sendDirectMessage(textOrEmoji, peerUid = null, senderName = "") {
    const me = this.resolveUid();
    const target = cleanStr(peerUid) || this.activePeerUid;
    if (!me || !target || me === target) {
      return { ok: false, error: "Invalid chat recipient." };
    }
    if (this.isUserBlocked(target)) {
      return { ok: false, error: "Unblock user before sending messages." };
    }

    const cleanText = cleanStr(textOrEmoji).slice(0, MAX_TEXT_LENGTH);
    if (!cleanText) {
      return { ok: false, error: "Message cannot be empty." };
    }

    const threadId = getDirectThreadId(me, target);
    try {
      const msgRef = push(ref(db, `directMessages/${threadId}/messages`));
      const payload = {
        senderUid: me,
        recipientUid: target,
        senderName: cleanStr(senderName) || auth.currentUser?.displayName || "Player",
        text: cleanText,
        type: "text",
        createdAt: Date.now()
      };
      await set(msgRef, payload);
      return { ok: true, id: msgRef.key, threadId, ...payload };
    } catch (err) {
      return { ok: false, error: err?.message || "Failed to send private message." };
    }
  }

  unmountDirectChat() {
    if (this.dmQuery && this.dmChildAddedCb) {
      try {
        off(this.dmQuery, "child_added", this.dmChildAddedCb);
      } catch (_) {}
    }
    if (this.peerPresenceRef && this.peerPresenceCb) {
      try {
        off(this.peerPresenceRef, "value", this.peerPresenceCb);
      } catch (_) {}
    }

    this.dmQuery = null;
    this.dmChildAddedCb = null;
    this.peerPresenceRef = null;
    this.peerPresenceCb = null;
    this.activePeerUid = null;
    this.activeThreadId = null;
    this.peerOnline = false;
  }

  getStatus() {
    return {
      currentUid: this.resolveUid(),
      activePeerUid: this.activePeerUid,
      activeThreadId: this.activeThreadId,
      peerOnline: this.peerOnline,
      blockedCount: this.blockedUids.size,
      unreadCounts: { ...this.unreadCounts },
      supportsCalls: false,
      supportsMediaUpload: false
    };
  }
}

const instance = new LudoPrivateChatManager();

auth.onAuthStateChanged((user) => {
  if (user?.uid) {
    instance.currentUid = user.uid;
    instance.setUserOnlineStatus(true, user.uid);
    instance.refreshBlockedList(user.uid);
  }
});

window.addEventListener("beforeunload", () => {
  if (instance.currentUid) {
    instance.setUserOnlineStatus(false, instance.currentUid);
  }
});

window.LudoTextChat = instance;
export default instance;
