// js/text-chat.js — Step 1: Room Lifecycle Module (Text Chat)
import { db } from "./firebase-config.js";
import {
  ref,
  query,
  limitToLast,
  onChildAdded,
  onValue,
  off,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

class LudoTextChatLifecycle {
  constructor() {
    this.activeRoomId = null;
    this.currentUid = null;
    this.messagesQuery = null;
    this.roomMembershipRef = null;
    this.childAddedCb = null;
    this.membershipCb = null;
    this.isAuthorizedMember = false;
    this.messageListeners = new Set();
  }

  onMessage(cb) {
    if (typeof cb === "function") {
      this.messageListeners.add(cb);
    }
    return () => this.messageListeners.delete(cb);
  }

  emitMessage(payload) {
    this.messageListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (_) {}
    });
  }

  async verifyMemberInRoom(roomId, uid) {
    if (!roomId || !uid) return false;
    try {
      const snap = await get(ref(db, `rooms/${roomId}/players/${uid}`));
      return snap.exists();
    } catch (_) {
      return false;
    }
  }

  async mountRoom(roomId, currentUid) {
    this.unmountRoom();

    const cleanRoomId = typeof roomId === "string" ? roomId.trim() : "";
    const cleanUid = typeof currentUid === "string" ? currentUid.trim() : "";
    if (!cleanRoomId || !cleanUid) {
      return false;
    }

    const isMember = await this.verifyMemberInRoom(cleanRoomId, cleanUid);
    if (!isMember) {
      this.isAuthorizedMember = false;
      return false;
    }

    this.activeRoomId = cleanRoomId;
    this.currentUid = cleanUid;
    this.isAuthorizedMember = true;

    // রুমের সদস্যত্ব বা রুমের অস্তিত্ব নজরে রাখা (রুম বাতিল বা বের হলে সাথে সাথে বন্ধ হবে)
    this.roomMembershipRef = ref(db, `rooms/${cleanRoomId}/players/${cleanUid}`);
    this.membershipCb = (snap) => {
      if (!snap.exists()) {
        this.unmountRoom();
      }
    };
    onValue(this.roomMembershipRef, this.membershipCb);

    // Spark Free Plan সাশ্রয়ে সাম্প্রতিক ৫০টি মেসেজ লোড
    this.messagesQuery = query(
      ref(db, `rooms/${cleanRoomId}/messages`),
      limitToLast(50)
    );
    this.childAddedCb = (snap) => {
      if (!this.isAuthorizedMember || this.activeRoomId !== cleanRoomId) return;
      const val = snap.val();
      if (!val || typeof val !== "object") return;
      this.emitMessage({
        id: snap.key,
        roomId: cleanRoomId,
        ...val
      });
    };
    onChildAdded(this.messagesQuery, this.childAddedCb);

    return true;
  }

  unmountRoom() {
    if (this.messagesQuery && this.childAddedCb) {
      try {
        off(this.messagesQuery, "child_added", this.childAddedCb);
      } catch (_) {}
    }
    if (this.roomMembershipRef && this.membershipCb) {
      try {
        off(this.roomMembershipRef, "value", this.membershipCb);
      } catch (_) {}
    }

    this.messagesQuery = null;
    this.roomMembershipRef = null;
    this.childAddedCb = null;
    this.membershipCb = null;
    this.activeRoomId = null;
    this.currentUid = null;
    this.isAuthorizedMember = false;
  }

  getStatus() {
    return {
      activeRoomId: this.activeRoomId,
      currentUid: this.currentUid,
      isAuthorizedMember: this.isAuthorizedMember
    };
  }
}

const instance = new LudoTextChatLifecycle();
window.LudoTextChat = instance;
export default instance;
