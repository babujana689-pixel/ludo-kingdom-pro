// js/main.js - Master Controller, Premium Dark Navy & Royal Gold UI, 4-Corner 3D Dice & Audio Manager
(function () {
  const canvas = document.getElementById("game-canvas");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b19);
  scene.fog = new THREE.FogExp2(0x070b19, 0.01);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 4.5, 9.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.92);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
  dirLight.position.set(8, 24, 10);
  scene.add(dirLight);

  const rimLight = new THREE.PointLight(0xd4af37, 0.85, 35);
  rimLight.position.set(-8, 12, -8);
  scene.add(rimLight);

  // Lobby 3D Showcase Group
  const lobbyGroup = new THREE.Group();
  const diceGeo = new THREE.BoxGeometry(2.0, 2.0, 2.0);
  const diceMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.65
  });
  const lobbyDice = new THREE.Mesh(diceGeo, diceMat);
  lobbyDice.position.y = 1.2;
  lobbyGroup.add(lobbyDice);

  const ringGeo = new THREE.TorusGeometry(3.8, 0.08, 12, 48);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
  const lobbyRing = new THREE.Mesh(ringGeo, ringMat);
  lobbyRing.rotation.x = Math.PI / 2;
  lobbyGroup.add(lobbyRing);
  scene.add(lobbyGroup);

  // Start Lobby Royal Fantasy Music
  if (window.LudoSound) window.LudoSound.playLobbyMusic();

  // =========================================================
  // 4 PREMIUM GLOSSY 3D DICE WITH ACCURATE 1-6 PIPS (DOTS)
  // =========================================================
  const DICE_THEMES = {
    red:    { base: "#dc2626", dark: "#7f1d1d", border: "#fde047", pip: "#ffffff" },
    green:  { base: "#16a34a", dark: "#14532d", border: "#fde047", pip: "#ffffff" },
    yellow: { base: "#eab308", dark: "#854d0e", border: "#ffffff", pip: "#0f172a" },
    blue:   { base: "#0284c7", dark: "#0c4a6e", border: "#fde047", pip: "#ffffff" }
  };

  function createDiceFaceTexture(faceNum, theme) {
    const size = 256;
    const cvs = document.createElement("canvas");
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, theme.base);
    grad.addColorStop(1, theme.dark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, size - 20, size - 20);

    const sheen = ctx.createRadialGradient(55, 55, 5, 65, 65, 110);
    sheen.addColorStop(0, "rgba(255,255,255,0.42)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, size, size);

    const pipCoords = {
      1: [[128, 128]],
      2: [[72, 72], [184, 184]],
      3: [[68, 68], [128, 128], [188, 188]],
      4: [[74, 74], [182, 74], [74, 182], [182, 182]],
      5: [[72, 72], [184, 72], [128, 128], [72, 184], [184, 184]],
      6: [[76, 62], [180, 62], [76, 128], [180, 128], [76, 194], [180, 194]]
    };

    const r = faceNum === 1 ? 30 : 21;
    (pipCoords[faceNum] || pipCoords[6]).forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py + 3, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.pip;
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 4;
    return tex;
  }

  const FACE_ORDER = [3, 4, 1, 6, 2, 5];
  const FACE_TARGET_ROT = {
    1: { x: 0,            z: 0 },
    6: { x: Math.PI,      z: 0 },
    2: { x: -Math.PI / 2, z: 0 },
    5: { x: Math.PI / 2,  z: 0 },
    3: { x: 0,            z: Math.PI / 2 },
    4: { x: 0,            z: -Math.PI / 2 }
  };

  const cornerDiceWidgets = {};

  function init4CornerGlossyDice() {
    ["red", "green", "yellow", "blue"].forEach((color) => {
      const slotEl = document.getElementById(`dice-slot-${color}`);
      if (!slotEl) return;

      const dScene = new THREE.Scene();
      const dCam = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      dCam.position.set(0, 3.1, 0.45);
      dCam.lookAt(0, 0, 0);

      dScene.add(new THREE.AmbientLight(0xffffff, 1.05));
      const dDir = new THREE.DirectionalLight(0xffffff, 0.9);
      dDir.position.set(2, 5, 3);
      dScene.add(dDir);

      const theme = DICE_THEMES[color];
      const mats = FACE_ORDER.map((num) => new THREE.MeshStandardMaterial({
        map: createDiceFaceTexture(num, theme),
        roughness: 0.18,
        metalness: 0.22
      }));

      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.38, 1.38), mats);
      dScene.add(cube);

      const dRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      dRenderer.setSize(42, 42);
      dRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      slotEl.innerHTML = "";
      slotEl.appendChild(dRenderer.domElement);

      cornerDiceWidgets[color] = {
        scene: dScene,
        camera: dCam,
        renderer: dRenderer,
        mesh: cube,
        rolling: false,
        rollStart: 0,
        rollDuration: 430,
        targetValue: 6
      };
    });
  }
  init4CornerGlossyDice();

  function trigger3DDiceRoll(color, rolledValue) {
    const w = cornerDiceWidgets[color];
    if (!w) return;
    w.rolling = true;
    w.rollStart = performance.now();
    w.targetValue = rolledValue;
  }

  function updateAndRenderCornerDice(now, time) {
    const turnInfo = window.LudoEngine ? window.LudoEngine.getTurnState() : null;

    ["red", "green", "yellow", "blue"].forEach((color) => {
      const w = cornerDiceWidgets[color];
      if (!w) return;

      const isCurrentTurn = turnInfo && turnInfo.phase !== "OVER" && turnInfo.currentColor === color;

      if (w.rolling) {
        const p = Math.min(1, (now - w.rollStart) / w.rollDuration);
        const ease = 1 - Math.pow(1 - p, 3);
        const target = FACE_TARGET_ROT[w.targetValue] || { x: 0, z: 0 };

        w.mesh.rotation.x = target.x + (1 - ease) * Math.PI * 6;
        w.mesh.rotation.y = (1 - ease) * Math.PI * 4;
        w.mesh.rotation.z = target.z + (1 - ease) * Math.PI * 4;

        const bounceScale = 1 + Math.sin(p * Math.PI) * 0.22;
        w.mesh.scale.set(bounceScale, bounceScale, bounceScale);

        if (p >= 1) {
          w.rolling = false;
          w.mesh.rotation.set(target.x, 0, target.z);
          w.mesh.scale.set(1, 1, 1);
        }
      } else if (isCurrentTurn && turnInfo.phase === "ROLL") {
        const s = 1.04 + Math.sin(time * 6) * 0.05;
        w.mesh.scale.set(s, s, s);
        w.mesh.rotation.y = Math.sin(time * 4) * 0.16;
      } else {
        w.mesh.scale.set(0.95, 0.95, 0.95);
        w.mesh.rotation.y = 0;
      }

      w.renderer.render(w.scene, w.camera);
    });
  }

  // Position the 4 Corner Pods precisely above Green/Yellow Homes and below Red/Blue Homes
  function positionCornerPods() {
    if (!isBoardActive) return;
    const rect = canvas.getBoundingClientRect();

    function projectBoardPoint(bx, bz) {
      const v = new THREE.Vector3(bx, 0.15, bz);
      v.project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-v.y * 0.5 + 0.5) * rect.height + rect.top
      };
    }

    const topEdge = projectBoardPoint(0, -7.85);
    const botEdge = projectBoardPoint(0, 7.85);
    const leftEdge = projectBoardPoint(-7.7, 0);
    const rightEdge = projectBoardPoint(7.7, 0);

    const padX = Math.max(8, leftEdge.x);
    const rightOffset = Math.max(8, window.innerWidth - rightEdge.x);

    const greenPod = document.getElementById("hud-green");
    const yellowPod = document.getElementById("hud-yellow");
    const redPod = document.getElementById("hud-red");
    const bluePod = document.getElementById("hud-blue");

    if (greenPod) {
      greenPod.style.left = `${padX}px`;
      greenPod.style.top = `${Math.max(54, topEdge.y - 62)}px`;
    }
    if (yellowPod) {
      yellowPod.style.right = `${rightOffset}px`;
      yellowPod.style.top = `${Math.max(54, topEdge.y - 62)}px`;
    }
    if (redPod) {
      redPod.style.left = `${padX}px`;
      redPod.style.top = `${Math.min(window.innerHeight - 66, botEdge.y + 8)}px`;
    }
    if (bluePod) {
      bluePod.style.right = `${rightOffset}px`;
      bluePod.style.top = `${Math.min(window.innerHeight - 66, botEdge.y + 8)}px`;
    }
  }

  // Build 3D Board & Sync Live Pawn References
  let boardBuilt = false;
  function syncPawnReferences() {
    if (!window.LudoBoard3D) return;
    const map = { red: [], green: [], yellow: [], blue: [] };
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.color && typeof obj.userData.index === "number") {
        const c = obj.userData.color;
        if (map[c]) map[c][obj.userData.index] = obj;
      }
    });
    window.LudoBoard3D.piecesMap = map;
  }

  function ensureBoardBuilt() {
    if (!boardBuilt && window.LudoBoard3D) {
      window.LudoBoard3D.build(scene);
      boardBuilt = true;
    }
    syncPawnReferences();
  }
  ensureBoardBuilt();

  // Toast Helper
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add("hidden"), 2300);
  }

  // Initialize Ludo Rules Engine
  if (window.LudoEngine) {
    window.LudoEngine.init({
      onToast: showToast,
      onDiceAnim: (color, rolledValue) => {
        trigger3DDiceRoll(color, rolledValue);
      }
    });
  }

  // Locked Top-Down 3D Angle & Auto-Fit Full Board Size
  let isBoardActive = false;
  const LOCKED_CAM_ANGLE = 0;
  const LOCKED_CAM_PITCH = 0.14;
  let touchStartPos = { x: 0, y: 0 };

  function setLockedBoardCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const vFovRad = (camera.fov * Math.PI) / 180;
    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

    const boardSpan = 16.4;
    const distWidth = (boardSpan / 2) / Math.tan(hFovRad / 2);
    const distHeight = (boardSpan / 2) / Math.tan(vFovRad / 2) * 1.44;
    const camDist = Math.max(distWidth, distHeight, 25.5);

    camera.position.x = camDist * Math.sin(LOCKED_CAM_PITCH) * Math.sin(LOCKED_CAM_ANGLE);
    camera.position.y = camDist * Math.cos(LOCKED_CAM_PITCH);
    camera.position.z = camDist * Math.sin(LOCKED_CAM_PITCH) * Math.cos(LOCKED_CAM_ANGLE);
    camera.lookAt(0, 0, 0.1);
  }

  // Smart Touch Detection
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
  const worldHitPoint = new THREE.Vector3();

  function detectPawnTap(clientX, clientY) {
    if (!isBoardActive || !window.LudoEngine) return;
    syncPawnReferences();
    const map = window.LudoBoard3D?.piecesMap;
    if (!map) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const allPawns = [];
    ["red", "green", "yellow", "blue"].forEach((c) => {
      (map[c] || []).forEach((group) => {
        if (group && group.visible && group.children) allPawns.push(...group.children);
      });
    });

    const hits = raycaster.intersectObjects(allPawns, false);
    if (hits.length > 0) {
      const pawnGroup = hits[0].object.parent;
      if (pawnGroup && pawnGroup.userData) {
        window.LudoEngine.handlePawnTap(pawnGroup.userData.color, pawnGroup.userData.index);
        return;
      }
    }

    if (raycaster.ray.intersectPlane(boardPlane, worldHitPoint)) {
      let bestPawn = null;
      let minDist = 2.2;
      ["red", "green", "yellow", "blue"].forEach((c) => {
        (map[c] || []).forEach((group, idx) => {
          if (!group || !group.visible) return;
          const d = Math.hypot(group.position.x - worldHitPoint.x, group.position.z - worldHitPoint.z);
          if (d < minDist) {
            minDist = d;
            bestPawn = { color: c, index: idx };
          }
        });
      });

      if (bestPawn) {
        window.LudoEngine.handlePawnTap(bestPawn.color, bestPawn.index);
      }
    }
  }

  document.addEventListener("touchstart", (e) => {
    if (!isBoardActive) return;
    if (e.touches.length === 1) {
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (!isBoardActive || e.changedTouches.length !== 1) return;
    if (e.target.closest("button, .modal-card, .corner-pod, .hud-top")) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    if (Math.hypot(endX - touchStartPos.x, endY - touchStartPos.y) < 25) {
      detectPawnTap(endX, endY);
    }
  });

  document.addEventListener("click", (e) => {
    if (!isBoardActive) return;
    if (e.target.closest("button, .modal-card, .corner-pod, .hud-top")) return;
    detectPawnTap(e.clientX, e.clientY);
  });

  // Bind Tap Events on Each of the 4 Corner Dice Pods
  ["red", "green", "yellow", "blue"].forEach((color) => {
    const pod = document.getElementById(`hud-${color}`);
    if (!pod) return;
    pod.addEventListener("click", () => {
      if (!isBoardActive || !window.LudoEngine) return;
      const turn = window.LudoEngine.getTurnState();
      if (turn.isAI) return;
      if (turn.currentColor !== color) {
        showToast(`⏳ Wait for ${turn.currentColor.toUpperCase()}'s turn!`);
        return;
      }
      if (turn.phase === "ROLL") {
        window.LudoEngine.rollDice(color);
      }
    });
  });

  // Screen Switching
  const homeScreen = document.getElementById("home-screen");
  const gameHud = document.getElementById("game-hud");

  function enter3DBoard(modeTitle, modeOrConfig) {
    ensureBoardBuilt();
    isBoardActive = true;
    homeScreen.classList.remove("active");
    gameHud.classList.add("active");
    lobbyGroup.visible = false;
    if (window.LudoBoard3D) window.LudoBoard3D.showBoard(true);
    if (window.LudoEngine) window.LudoEngine.startMatch(modeOrConfig);
    if (window.LudoSound) window.LudoSound.playBoardMusic();
    document.getElementById("match-mode-label").textContent = modeTitle;
    closeModal(true);
    setLockedBoardCamera();
    camera.updateMatrixWorld();
    positionCornerPods();
  }

  function exitToLobby() {
    isBoardActive = false;
    gameHud.classList.remove("active");
    homeScreen.classList.add("active");
    if (window.LudoBoard3D) window.LudoBoard3D.showBoard(false);
    if (window.LudoSound) window.LudoSound.playLobbyMusic();
    lobbyGroup.visible = true;
    camera.position.set(0, 4.5, 9.5);
    camera.lookAt(0, 0, 0);
  }

  // Modal Helpers
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  let activeMatchFoundTimer = null;

  function clearMatchFoundCountdown() {
    if (activeMatchFoundTimer) {
      clearInterval(activeMatchFoundTimer);
      activeMatchFoundTimer = null;
    }
  }

  function openModal(title, html) {
    clearMatchFoundCountdown();
    if (window.LudoSound) window.LudoSound.click();
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modalOverlay.classList.remove("hidden");
  }

  function closeModal(skipMusicRestore = false) {
    clearMatchFoundCountdown();
    modalOverlay.classList.add("hidden");
    if (!skipMusicRestore && window.LudoSound) {
      if (isBoardActive) window.LudoSound.playBoardMusic();
      else window.LudoSound.playLobbyMusic();
    }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMatchFoundPlayerCard(player, index) {
    const safeName = escapeHtml(player.name || `Player ${index + 1}`);
    const initial = safeName.charAt(0).toUpperCase() || "P";
    const hasAvatar = typeof player.avatar === "string" && player.avatar.trim().length > 0;
    const avatarHtml = hasAvatar
      ? `<img src="${escapeHtml(player.avatar)}" alt="${safeName}" referrerpolicy="no-referrer" />`
      : `<span>${escapeHtml(initial)}</span>`;

    const metaPills = [];
    if (player.color) {
      metaPills.push(`<span class="mf-meta-pill">${escapeHtml(String(player.color).toUpperCase())}</span>`);
    }
    if (typeof player.level === "number") {
      metaPills.push(`<span class="mf-meta-pill">LVL ${player.level}</span>`);
    }
    if (player.tier) {
      metaPills.push(`<span class="mf-meta-pill">${escapeHtml(player.tier)}</span>`);
    }

    return `
      <div class="mf-player-card">
        <div class="mf-avatar-ring">
          <div class="mf-avatar-inner">
            ${avatarHtml}
          </div>
        </div>
        <div class="mf-player-name" title="${safeName}">${safeName}</div>
        ${metaPills.length ? `<div class="mf-player-meta">${metaPills.join("")}</div>` : ""}
      </div>
    `;
  }

  function showMatchFoundScreen(matchData, modeLabel, modeKey, onComplete) {
    const maxPlayers = matchData?.maxPlayers === 4 ? 4 : 2;
    const playersObj = matchData?.players || {};
    const matchedPlayers = Array.isArray(matchData?.matchedPlayers) && matchData.matchedPlayers.length
      ? matchData.matchedPlayers.slice(0, maxPlayers)
      : Object.values(playersObj)
          .filter((p) => p && p.uid)
          .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
          .slice(0, maxPlayers);

    if (matchedPlayers.length < maxPlayers) return;

    const cardsHtml = matchedPlayers.map((p, idx) => renderMatchFoundPlayerCard(p, idx)).join("");
    const arenaHtml = maxPlayers === 4
      ? `
        <div class="mf-arena-4p">
          <div class="mf-grid-4p">${cardsHtml}</div>
          <div class="mf-vs-badge" aria-hidden="true">VS</div>
        </div>
      `
      : `
        <div class="mf-arena-2p">
          ${renderMatchFoundPlayerCard(matchedPlayers[0], 0)}
          <div class="mf-vs-badge" aria-hidden="true">VS</div>
          ${renderMatchFoundPlayerCard(matchedPlayers[1], 1)}
        </div>
      `;

    let secondsLeft = 5;

    openModal(
      "🏆 MATCH FOUND!",
      `
      <div class="match-found-screen">
        <h2 class="mf-banner-title">MATCH FOUND!</h2>
        <div class="mf-mode-badge">${escapeHtml(modeLabel)}</div>
        ${arenaHtml}
        <div class="mf-countdown-box">
          <div class="mf-countdown-label">Match Starting Automatically</div>
          <div class="mf-countdown-value" id="mf-countdown-timer">${secondsLeft}s</div>
        </div>
      </div>
      `
    );

    const timerEl = document.getElementById("mf-countdown-timer");
    clearMatchFoundCountdown();

    activeMatchFoundTimer = setInterval(async () => {
      secondsLeft -= 1;
      if (timerEl) {
        timerEl.textContent = `${Math.max(0, secondsLeft)}s`;
      }

      if (secondsLeft <= 0) {
        clearMatchFoundCountdown();
        if (window.LudoOnlineRoom && typeof window.LudoOnlineRoom.startOnlineRoomMatch === "function" && matchData?.roomId) {
          await window.LudoOnlineRoom.startOnlineRoomMatch(matchData.roomId).catch(() => {});
        }
        if (typeof onComplete === "function") {
          onComplete(matchData);
        }
      }
    }, 1000);
  }

  document.getElementById("btn-close-modal").addEventListener("click", () => {
        if (window.LudoSound) window.LudoSound.click();
    closeModal(false);
  });
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal(false);
  });

  // =========================================================
  // PART 1: PREMIUM DARK NAVY & ROYAL GOLD OFFLINE SETUP UI
  // =========================================================
  function openOfflineSetupModal() {
    if (window.LudoSound) window.LudoSound.playSetupMusic();

    const slotState = { red: "human", green: "ai", yellow: "ai", blue: "ai" };
    let selectedPresetId = "p-1v3";

    const presets = [
      { id: "p-1v3",   icon: "🤖", label: "1 Player + 3 AI",   title: "1P + 3 AI",       slots: { red: "human", green: "ai",    yellow: "ai",    blue: "ai" } },
      { id: "p-2v2",   icon: "⚔️", label: "2 Players + 2 AI",  title: "2P + 2 AI",       slots: { red: "human", green: "ai",    yellow: "human", blue: "ai" } },
      { id: "p-3v1",   icon: "🛡️", label: "3 Players + 1 AI",  title: "3P + 1 AI",       slots: { red: "human", green: "human", yellow: "human", blue: "ai" } },
      { id: "p-pass2", icon: "👥", label: "2 Friends Offline", title: "2 Friends",       slots: { red: "human", green: "off",   yellow: "human", blue: "off" } },
      { id: "p-pass3", icon: "👑", label: "3 Friends Offline", title: "3 Friends",       slots: { red: "human", green: "human", yellow: "human", blue: "off" } },
      { id: "p-pass4", icon: "🏰", label: "4 Friends Offline", title: "4 Friends",       slots: { red: "human", green: "human", yellow: "human", blue: "human" } }
    ];

    const slotColors = [
      { key: "red",    dot: "#ef4444", text: "#ff5a5f", name: "RED" },
      { key: "green",  dot: "#22c55e", text: "#4ade80", name: "GREEN" },
      { key: "yellow", dot: "#facc15", text: "#facc15", name: "YELLOW" },
      { key: "blue",   dot: "#38bdf8", text: "#38bdf8", name: "BLUE" }
    ];

    openModal("👑 OFFLINE KINGDOM SETUP", `
      <div class="royal-section-title">⚡ QUICK MODES</div>
      <div class="quick-modes-grid">
        ${presets.map((p) => `
          <button type="button" class="quick-mode-card" id="${p.id}">
            <span class="qm-icon">${p.icon}</span>
            <span>${p.label}</span>
          </button>
        `).join("")}
      </div>

      <div class="royal-section-title">🎭 CUSTOM PLAYER SLOTS</div>
      <div class="slot-list">
        ${slotColors.map((sc) => `
          <div class="slot-row">
            <div class="slot-color-info" style="color:${sc.text};">
              <span class="slot-dot" style="background:${sc.dot};"></span>
              <span>${sc.name}</span>
            </div>
            <div class="role-switch-group" data-slot="${sc.key}">
              <button type="button" class="role-pill" data-role="human">Human</button>
              <button type="button" class="role-pill" data-role="ai">AI</button>
              <button type="button" class="role-pill" data-role="off">OFF</button>
            </div>
          </div>
        `).join("")}
      </div>

      <button type="button" class="golden-start-btn" id="btn-start-custom-offline">
        <span>🎲</span>
        <span>START GAME</span>
      </button>
    `);

    function refreshSetupUI() {
      presets.forEach((p) => {
        const el = document.getElementById(p.id);
        if (el) el.classList.toggle("selected-preset", p.id === selectedPresetId);
      });

      slotColors.forEach((sc) => {
        const container = modalBody.querySelector(`[data-slot="${sc.key}"]`);
        if (!container) return;
        container.querySelectorAll(".role-pill").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.role === slotState[sc.key]);
        });
      });
    }

    modalBody.querySelectorAll(".role-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.LudoSound) window.LudoSound.click();
        selectedPresetId = "";
        const colorKey = btn.parentElement.dataset.slot;
        slotState[colorKey] = btn.dataset.role;
        refreshSetupUI();
      });
    });

    presets.forEach((p) => {
      const btn = document.getElementById(p.id);
      if (btn) {
        btn.addEventListener("click", () => {
          if (window.LudoSound) window.LudoSound.click();
          selectedPresetId = p.id;
          Object.assign(slotState, p.slots);
          refreshSetupUI();
        });
      }
    });

    document.getElementById("btn-start-custom-offline").addEventListener("click", () => {
      const entries = Object.values(slotState);
      const humans = entries.filter((r) => r === "human").length;
      const ais = entries.filter((r) => r === "ai").length;
      const total = humans + ais;

      if (total < 2) {
        showToast("⚠️ Select at least 2 active players!");
        return;
      }
      if (humans === 0) {
        showToast("⚠️ Select at least 1 Human player!");
        return;
      }

      const activePreset = presets.find((p) => p.id === selectedPresetId);
      const title = activePreset
        ? activePreset.title
        : (ais === 0 ? `${humans} Friends` : `${humans}P + ${ais} AI`);

      enter3DBoard(title, { ...slotState });
    });

    refreshSetupUI();
  }

  // =========================================================
  // PART 3: ROYAL MUSIC & SOUND EFFECTS SETTINGS MODAL
  // =========================================================
  function openAudioSettingsModal() {
    const s = window.LudoSound ? window.LudoSound.getSettings() : {
      musicEnabled: true,
      sfxEnabled: true,
      musicVolume: 0.45,
      sfxVolume: 0.85
    };

    openModal("🎵 ROYAL AUDIO SETTINGS", `
      <div class="audio-setting-card">
        <div class="audio-row-top">
          <span>🎼 Background Music (Loop)</span>
          <button type="button" class="toggle-pill-btn ${s.musicEnabled ? "on" : "off"}" id="toggle-bgm-btn">
            ${s.musicEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:0.76rem;color:#94a3b8;font-weight:700;">Volume</span>
          <input type="range" min="0" max="100" value="${Math.round(s.musicVolume * 100)}" class="royal-slider" id="slider-bgm-vol" />
          <span id="label-bgm-vol" style="font-size:0.78rem;color:#facc15;font-weight:800;min-width:34px;text-align:right;">${Math.round(s.musicVolume * 100)}%</span>
        </div>
      </div>

      <div class="audio-setting-card">
        <div class="audio-row-top">
          <span>🎲 Dice & Game Sound FX</span>
          <button type="button" class="toggle-pill-btn ${s.sfxEnabled ? "on" : "off"}" id="toggle-sfx-btn">
            ${s.sfxEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:0.76rem;color:#94a3b8;font-weight:700;">Volume</span>
          <input type="range" min="0" max="100" value="${Math.round(s.sfxVolume * 100)}" class="royal-slider" id="slider-sfx-vol" />
          <span id="label-sfx-vol" style="font-size:0.78rem;color:#facc15;font-weight:800;min-width:34px;text-align:right;">${Math.round(s.sfxVolume * 100)}%</span>
        </div>
      </div>

      <button type="button" class="golden-start-btn" id="btn-test-royal-sound" style="margin-top:4px;">
        <span>🔔</span>
        <span>TEST ROYAL AUDIO</span>
      </button>
    `);

    const bgmBtn = document.getElementById("toggle-bgm-btn");
    const sfxBtn = document.getElementById("toggle-sfx-btn");
    const bgmSlider = document.getElementById("slider-bgm-vol");
    const sfxSlider = document.getElementById("slider-sfx-vol");

    bgmBtn.addEventListener("click", () => {
      if (!window.LudoSound) return;
      const next = !window.LudoSound.getSettings().musicEnabled;
      window.LudoSound.setMusicEnabled(next);
      bgmBtn.textContent = next ? "ON" : "OFF";
      bgmBtn.className = `toggle-pill-btn ${next ? "on" : "off"}`;
      window.LudoSound.click();
    });

    sfxBtn.addEventListener("click", () => {
      if (!window.LudoSound) return;
      const next = !window.LudoSound.getSettings().sfxEnabled;
      window.LudoSound.setSfxEnabled(next);
      sfxBtn.textContent = next ? "ON" : "OFF";
      sfxBtn.className = `toggle-pill-btn ${next ? "on" : "off"}`;
      if (next) window.LudoSound.click();
    });

    bgmSlider.addEventListener("input", (e) => {
      const pct = Number(e.target.value);
      document.getElementById("label-bgm-vol").textContent = `${pct}%`;
      if (window.LudoSound) window.LudoSound.setMusicVolume(pct / 100);
    });

    sfxSlider.addEventListener("input", (e) => {
      const pct = Number(e.target.value);
      document.getElementById("label-sfx-vol").textContent = `${pct}%`;
      if (window.LudoSound) window.LudoSound.setSfxVolume(pct / 100);
    });

    document.getElementById("btn-test-royal-sound").addEventListener("click", () => {
      if (window.LudoSound) window.LudoSound.home();
    });
  }

  document.getElementById("btn-play-offline").addEventListener("click", openOfflineSetupModal);
  document.getElementById("btn-settings").addEventListener("click", openAudioSettingsModal);
  document.getElementById("btn-ingame-audio").addEventListener("click", openAudioSettingsModal);

  document.getElementById("btn-exit-match").addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    exitToLobby();
  });

  document.getElementById("btn-reset-cam").addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    setLockedBoardCamera();
    positionCornerPods();
    showToast("🎥 3D Board View Locked!");
  });

  document.getElementById("btn-play-online").addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    openModal(
      "🌐 Online Matchmaking",
      `
      <div class="royal-section-title">SELECT MATCH FORMAT</div>
      <div class="pro-match-grid" id="online-mode-select">
        <button type="button" class="pro-format-card active" data-mode="online-2p">
          <span>⚔️</span>
          <strong>2 Players Live</strong>
          <small>1v1 Duel Arena</small>
        </button>
        <button type="button" class="pro-format-card" data-mode="online-4p">
          <span>👑</span>
          <strong>4 Players Live</strong>
          <small>Royal 4-Player Table</small>
        </button>
      </div>
      <div class="pro-status-note">
        Real-time matchmaking queue with live opponents only.
      </div>
      <button type="button" class="pro-cta-btn" id="btn-start-online-match">
        🚀 FIND MATCH
      </button>
    `
    );

    let selectedOnlineMode = "online-2p";
    modalBody.querySelectorAll("#online-mode-select .pro-format-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.LudoSound) window.LudoSound.click();
        modalBody.querySelectorAll("#online-mode-select .pro-format-card").forEach((b) => {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        selectedOnlineMode = btn.dataset.mode;
      });
    });

    const startOnlineBtn = document.getElementById("btn-start-online-match");
    if (startOnlineBtn) {
      startOnlineBtn.addEventListener("click", async () => {
        if (window.LudoSound) window.LudoSound.click();
        const maxPlayers = selectedOnlineMode === "online-4p" ? 4 : 2;
        const label = maxPlayers === 4 ? "Online 4P Live" : "Online 2P Live";

        openModal(
          "🔍 Finding Match",
          `
          <div class="pro-search-box">
            <div class="pro-search-loader-wrap" aria-hidden="true">
              <div class="pro-search-orbit"></div>
              <div class="pro-search-spinner"></div>
              <div class="pro-search-core-dot"></div>
            </div>
            <div class="pro-search-status" id="pro-search-status-text">
              Searching for ${maxPlayers} Players match...
            </div>
            <div class="pro-loading-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <button type="button" class="pro-cancel-btn" id="btn-cancel-matchmaking">
              ✕ Cancel
            </button>
          </div>
          `
        );

        let isCancelled = false;
        let isMatchFound = false;

        const cancelBtn = document.getElementById("btn-cancel-matchmaking");
        const statusEl = document.getElementById("pro-search-status-text");

        const closeCurrentModal = () => {
          if (typeof closeModal === "function") {
            closeModal(false);
          } else {
            clearMatchFoundCountdown();
            const activeModal = document.querySelector(".modal.active, .royal-modal.active, #modal-overlay.active");
            if (activeModal) activeModal.classList.remove("active");
          }
        };

        if (cancelBtn) {
          cancelBtn.addEventListener("click", async () => {
            if (isMatchFound) return;
            isCancelled = true;
            if (window.LudoSound) window.LudoSound.click();
            if (statusEl) statusEl.textContent = "Cancelling search...";
            if (window.LudoOnlineRoom) {
              if (typeof window.LudoOnlineRoom.cancelMatchmaking === "function") {
                await window.LudoOnlineRoom.cancelMatchmaking().catch(() => {});
              } else if (typeof window.LudoOnlineRoom.leaveOnlineRoom === "function") {
                await window.LudoOnlineRoom.leaveOnlineRoom().catch(() => {});
              }
            }
            closeCurrentModal();
            showToast("Matchmaking cancelled.");
          });
        }

        const handleRealMatchFound = (matchData) => {
          if (isCancelled || isMatchFound) return;
          const playersList = Array.isArray(matchData?.matchedPlayers)
            ? matchData.matchedPlayers
            : Object.values(matchData?.players || {}).filter((p) => p && p.uid);

          if (playersList.length < maxPlayers) return;
          isMatchFound = true;

          showMatchFoundScreen(
            {
              ...matchData,
              maxPlayers,
              matchedPlayers: playersList.slice(0, maxPlayers)
            },
            label,
            selectedOnlineMode,
            (confirmedMatch) => {
              if (isCancelled) return;
              closeCurrentModal();
              enter3DBoard(label, {
                mode: selectedOnlineMode,
                roomId: confirmedMatch?.roomId || null,
                online: true
              });
              showToast("🌐 Match Started — " + label + "!");
            }
          );
        };

        try {
          if (window.LudoOnlineRoom && typeof window.LudoOnlineRoom.findOnlineMatch === "function") {
            await window.LudoOnlineRoom.findOnlineMatch(maxPlayers, {
              onStatusChange: (state, info) => {
                if (isCancelled || isMatchFound || !statusEl) return;
                if (state === "searching") {
                  const currentCount = Array.isArray(info?.matchedPlayers) ? info.matchedPlayers.length : 1;
                  statusEl.textContent = `Searching for ${maxPlayers} Players match (${currentCount}/${maxPlayers} joined)...`;
                } else if (state === "matched") {
                  handleRealMatchFound(info);
                }
              },
              onMatchFound: handleRealMatchFound,
              onMatched: handleRealMatchFound
            });
          } else if (statusEl) {
            statusEl.textContent = "Online matchmaking service is not connected.";
          }
        } catch (err) {
          if (isCancelled) return;
          if (statusEl) {
            statusEl.textContent = err?.message || "Unable to start matchmaking.";
          }
          showToast(err?.message || "Matchmaking error");
        }
      });
    }
  });

  document.getElementById("btn-private-room").addEventListener("click", () => {
    openModal("🏰 Private Royal Room", `
      <p style="color:#cbd5e1;font-size:0.85rem;line-height:1.5;">
        6-Digit Room Code & Live WebRTC Voice Chat unlock in <b>Phase 2 & 3</b>.
      </p>
    `);
  });

  document.getElementById("btn-daily").addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.home();
    showToast("🎁 Daily Bonus: +200 Coins Claimed!");
  });

  ["btn-quests", "btn-friends", "btn-alerts", "btn-leaderboard", "btn-skins", "btn-vip", "btn-history", "btn-profile"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        if (window.LudoSound) window.LudoSound.click();
        showToast("👑 Royal Feature Ready!");
      });
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (isBoardActive) {
      setLockedBoardCamera();
      positionCornerPods();
    }
  });

  // Render Loop
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const t = clock.getElapsedTime();

    if (!isBoardActive) {
      lobbyDice.rotation.x = t * 0.6;
      lobbyDice.rotation.y = t * 0.9;
      lobbyRing.rotation.z = t * 0.3;
    } else {
      setLockedBoardCamera();
      positionCornerPods();
      updateAndRenderCornerDice(now, t);
      if (window.LudoBoard3D && window.LudoBoard3D.animate) {
        window.LudoBoard3D.animate(t);
      }
      if (window.LudoEngine) {
        window.LudoEngine.animateHighlights(t);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  if (typeof getActivePlayerProfile === "function" && typeof renderOnlineProfileBanner === "function") {
    const playerProfile = getActivePlayerProfile();
    const profileBannerHtml = renderOnlineProfileBanner(playerProfile);
  }
})();
