// js/main.js - LUDO ADDA Master Controller, 4-Corner 3D Dice, Private Chat UI & Audio Manager
(function () {
  const canvas = document.getElementById("game-canvas");
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b19);
  scene.fog = new THREE.FogExp2(0x070b19, 0.01);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 4.5, 9.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.92);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
  dirLight.position.set(8, 24, 10);
  scene.add(dirLight);

  const rimLight = new THREE.PointLight(0xd4af37, 0.85, 35);
  rimLight.position.set(-8, 12, -8);
  scene.add(rimLight);

  // Lobby 3D Hero Showcase (Animated 3D Dice + Royal Crown Ring)
  const lobbyGroup = new THREE.Group();
  lobbyGroup.position.set(0, 0.35, 0);

  const heroDiceGroup = new THREE.Group();
  heroDiceGroup.position.y = 0.85;

  const diceGeo = new THREE.BoxGeometry(1.55, 1.55, 1.55);
  const diceMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.18,
    metalness: 0.72,
    emissive: 0x3b2804,
    emissiveIntensity: 0.25
  });
  const lobbyDice = new THREE.Mesh(diceGeo, diceMat);
  heroDiceGroup.add(lobbyDice);

  const innerFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 1.62, 1.62),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    })
  );
  heroDiceGroup.add(innerFrame);
  lobbyGroup.add(heroDiceGroup);

  const ringGeo = new THREE.TorusGeometry(2.85, 0.065, 14, 56);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.85,
    roughness: 0.2
  });
  const lobbyRing = new THREE.Mesh(ringGeo, ringMat);
  lobbyRing.rotation.x = Math.PI / 2.25;
  lobbyRing.position.y = 0.25;
  lobbyGroup.add(lobbyRing);

  const outerAuraGeo = new THREE.RingGeometry(3.05, 3.22, 48);
  const outerAuraMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.22
  });
  const lobbyAura = new THREE.Mesh(outerAuraGeo, outerAuraMat);
  lobbyAura.rotation.x = -Math.PI / 2.25;
  lobbyAura.position.y = 0.2;
  lobbyGroup.add(lobbyAura);

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
    tex.anisotropy = 2;
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
      dRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

  // Board & Camera State
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
    camera.updateMatrixWorld();
  }

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
    if (!t) return;
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
    homeScreen?.classList.remove("active");
    gameHud?.classList.add("active");
    lobbyGroup.visible = false;
    if (window.LudoBoard3D) window.LudoBoard3D.showBoard(true);
    if (window.LudoEngine) window.LudoEngine.startMatch(modeOrConfig);
    if (window.LudoSound) window.LudoSound.playBoardMusic();
    const modeLabelEl = document.getElementById("match-mode-label");
    if (modeLabelEl) modeLabelEl.textContent = modeTitle;
    closeModal(true);
    setLockedBoardCamera();
    positionCornerPods();
  }

  function exitToLobby() {
    isBoardActive = false;
    gameHud?.classList.remove("active");
    homeScreen?.classList.add("active");
    if (window.LudoBoard3D) window.LudoBoard3D.showBoard(false);
    if (window.LudoSound) window.LudoSound.playLobbyMusic();
    lobbyGroup.visible = true;
    camera.position.set(0, 4.5, 9.5);
    camera.lookAt(0, 0, 0);
  }

  // Modal & Match Found Helpers
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");

  let matchFoundCountdownTimer = null;
  let matchFoundUnsubscribe = null;
  let matchFoundHasStarted = false;

  function clearMatchFoundCountdown() {
    if (matchFoundCountdownTimer) {
      clearInterval(matchFoundCountdownTimer);
      matchFoundCountdownTimer = null;
    }
    if (typeof matchFoundUnsubscribe === "function") {
      matchFoundUnsubscribe();
      matchFoundUnsubscribe = null;
    }
    matchFoundHasStarted = false;
  }

  function openModal(title, html) {
    if (window.LudoSound) window.LudoSound.click();
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = html;
    modalOverlay?.classList.remove("hidden");
  }

  function closeModal(skipMusicRestore = false) {
    clearMatchFoundCountdown();
    if (window.LudoTextChat && typeof window.LudoTextChat.unmountDirectChat === "function") {
      window.LudoTextChat.unmountDirectChat();
    }
    const card = modalOverlay?.querySelector(".modal-card");
    card?.classList.remove("chat-fullscreen-card");
    const modalHeader = document.querySelector(".modal-header, .royal-modal-header, #modal-header");
    const closeBtn = document.getElementById("btn-close-modal");
    if (modalHeader) modalHeader.style.display = "";
    if (closeBtn) closeBtn.style.display = "";
    modalOverlay?.classList.add("hidden");
    if (!skipMusicRestore && window.LudoSound) {
      if (isBoardActive) window.LudoSound.playBoardMusic();
      else window.LudoSound.playLobbyMusic();
    }
  }

  function escapeRoyalHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeRoyalColor(rawColor, idx = 0, maxPlayers = 2) {
    const allowed = maxPlayers === 4
      ? ["red", "green", "yellow", "blue"]
      : ["red", "yellow"];
    const c = String(rawColor || "").toLowerCase().trim();
    if (["red", "green", "yellow", "blue"].includes(c)) return c;
    return allowed[idx] || "red";
  }

  function render3DAvatarMarkup(player, colorKey) {
    const avatarUrl = typeof player?.avatar === "string" ? player.avatar.trim() : "";
    const crownBadge = player?.isHost
      ? `<span class="mf-avatar-3d-crown" aria-hidden="true">👑</span>`
      : "";

    if (avatarUrl) {
      return `
        <div class="mf-avatar-3d-wrap">
          ${crownBadge}
          <div class="mf-avatar-ring">
            <div class="mf-avatar-inner">
              <img src="${escapeRoyalHtml(avatarUrl)}" alt="${escapeRoyalHtml(player?.name || "Player")}" referrerpolicy="no-referrer" />
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="mf-avatar-3d-wrap">
        ${crownBadge}
        <div class="mf-avatar-ring">
          <div class="mf-avatar-inner" data-crest-color="${escapeRoyalHtml(colorKey)}">
            <span class="mf-avatar-crest" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 5L38 11V23C38 32.5 31.8 40.4 24 43C16.2 40.4 10 32.5 10 23V11L24 5Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2.4"/>
                <path d="M15 28L17.5 18L24 23L30.5 18L33 28H15Z" fill="#fde047" stroke="#fef08a" stroke-width="1.3" stroke-linejoin="round"/>
                <circle cx="24" cy="33" r="2.6" fill="#fffbeb"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function renderMatchFoundPlayerCard(player, index, maxPlayers) {
    const colorKey = normalizeRoyalColor(player?.color, index, maxPlayers);
    const colorLabel = colorKey.toUpperCase();
    const safeName = escapeRoyalHtml(player?.name || "Player");
    const isReady = Boolean(player?.ready);
    const levelText = typeof player?.level === "number" && player.level > 0
      ? `LVL ${player.level}`
      : (player?.tier ? escapeRoyalHtml(player.tier) : "");

    return `
      <div class="mf-player-card ${isReady ? "is-ready" : ""}" data-color="${escapeRoyalHtml(colorKey)}">
        ${render3DAvatarMarkup(player, colorKey)}
        <div class="mf-player-name">${safeName}</div>
        <div class="mf-player-meta">
          <span class="mf-meta-pill mf-color-pill" data-player-color="${escapeRoyalHtml(colorKey)}">${escapeRoyalHtml(colorLabel)}</span>
          ${levelText ? `<span class="mf-meta-pill">${levelText}</span>` : ""}
          <span class="mf-ready-tag ${isReady ? "ready-yes" : ""}">${isReady ? "READY" : "WAITING"}</span>
        </div>
      </div>
    `;
  }

  function showMatchFoundScreen(matchData, modeLabel, selectedMode, onComplete) {
    clearMatchFoundCountdown();

    const maxPlayers = matchData?.maxPlayers === 4 || selectedMode === "online-4p" ? 4 : 2;
    const rawPlayers = Array.isArray(matchData?.matchedPlayers)
      ? matchData.matchedPlayers
      : Object.values(matchData?.players || {}).filter((p) => p && p.uid);
    let players = rawPlayers.slice(0, maxPlayers);

    if (players.length < maxPlayers) return;

    const currentUid = window.auth?.currentUser?.uid || null;
    const totalSeconds = 5;
    let secondsLeft = totalSeconds;
    let countdownStarted = false;

    const modalHeader = document.querySelector(".modal-header, .royal-modal-header, #modal-header");
    const closeBtn = document.getElementById("btn-close-modal");
    if (modalHeader) modalHeader.style.display = "none";
    if (closeBtn) closeBtn.style.display = "none";

    const buildArenaMarkup = (list) => {
      if (maxPlayers === 4) {
        const topTwo = list.slice(0, 2);
        const bottomTwo = list.slice(2, 4);
        return `
          <div class="mf-arena-4p">
            <div class="mf-grid-4p">
              ${topTwo.map((p, idx) => renderMatchFoundPlayerCard(p, idx, 4)).join("")}
            </div>
            <div class="mf-vs-badge" aria-label="VS">VS</div>
            <div class="mf-grid-4p">
              ${bottomTwo.map((p, idx) => renderMatchFoundPlayerCard(p, idx + 2, 4)).join("")}
            </div>
          </div>
        `;
      }

      return `
        <div class="mf-arena-2p">
          ${renderMatchFoundPlayerCard(list[0], 0, 2)}
          <div class="mf-vs-badge" aria-label="VS">VS</div>
          ${renderMatchFoundPlayerCard(list[1], 1, 2)}
        </div>
      `;
    };

    const triggerStartMatch = async () => {
      if (matchFoundHasStarted) return;
      matchFoundHasStarted = true;
      if (matchFoundCountdownTimer) {
        clearInterval(matchFoundCountdownTimer);
        matchFoundCountdownTimer = null;
      }
      if (typeof matchFoundUnsubscribe === "function") {
        matchFoundUnsubscribe();
        matchFoundUnsubscribe = null;
      }
      if (modalHeader) modalHeader.style.display = "";
      if (closeBtn) closeBtn.style.display = "";

      if (matchData?.roomId && window.LudoOnlineRoom && typeof window.LudoOnlineRoom.startOnlineRoomMatch === "function") {
        await window.LudoOnlineRoom.startOnlineRoomMatch(matchData.roomId).catch(() => {});
      }

      if (typeof onComplete === "function") {
        onComplete({
          ...matchData,
          maxPlayers,
          matchedPlayers: players
        });
      }
    };

    const updateReadyAndTimerState = () => {
      const readyCount = players.filter((p) => Boolean(p?.ready)).length;
      const allReady = players.length >= maxPlayers && readyCount === maxPlayers;

      const me = currentUid ? players.find((p) => p.uid === currentUid) : null;
      const iAmReady = Boolean(me?.ready);

      const readyBtn = document.getElementById("mf-ready-btn");
      const readySummary = document.getElementById("mf-ready-summary");
      const labelEl = document.getElementById("mf-countdown-label");
      const timerEl = document.getElementById("mf-countdown-value");
      const barEl = document.getElementById("mf-countdown-bar");

      if (readyBtn) {
        readyBtn.disabled = !currentUid;
        readyBtn.classList.toggle("is-ready-state", iAmReady);
        readyBtn.textContent = iAmReady ? "✓ READY" : "READY";
      }

      if (readySummary) {
        readySummary.textContent = allReady
          ? `All ${maxPlayers}/${maxPlayers} players ready! Starting match...`
          : `Ready players: ${readyCount}/${maxPlayers}`;
      }

      if (allReady && !countdownStarted) {
        countdownStarted = true;
        secondsLeft = totalSeconds;
        if (labelEl) labelEl.textContent = "ALL PLAYERS READY — STARTING IN";
        if (timerEl) timerEl.textContent = `${secondsLeft}s`;
        if (barEl) barEl.style.width = "100%";

        matchFoundCountdownTimer = setInterval(() => {
          secondsLeft -= 1;
          const clamped = Math.max(0, secondsLeft);
          if (timerEl) timerEl.textContent = `${clamped}s`;
          if (barEl) {
            const pct = Math.max(0, Math.min(100, (clamped / totalSeconds) * 100));
            barEl.style.width = `${pct}%`;
          }
          if (secondsLeft <= 0) {
            triggerStartMatch();
          }
        }, 1000);
      } else if (!allReady) {
        if (matchFoundCountdownTimer) {
          clearInterval(matchFoundCountdownTimer);
          matchFoundCountdownTimer = null;
        }
        countdownStarted = false;
        secondsLeft = totalSeconds;
        if (labelEl) labelEl.textContent = "WAITING FOR ALL PLAYERS TO BE READY";
        if (timerEl) timerEl.textContent = `${totalSeconds}s`;
        if (barEl) barEl.style.width = "100%";
      }
    };

    const renderScreen = () => {
      openModal(
        "",
        `
        <div class="match-found-screen" id="match-found-screen">
          <h2 class="mf-banner-title">MATCH FOUND!</h2>
          <div class="mf-mode-badge">${escapeRoyalHtml(modeLabel || (maxPlayers === 4 ? "ONLINE 4P LIVE" : "ONLINE 2P LIVE"))}</div>
          ${buildArenaMarkup(players)}
          <div class="mf-ready-action-wrap">
            <button type="button" class="mf-ready-btn" id="mf-ready-btn">READY</button>
            <div class="mf-ready-summary" id="mf-ready-summary"></div>
          </div>
          <div class="mf-countdown-box">
            <div class="mf-countdown-label" id="mf-countdown-label">WAITING FOR ALL PLAYERS TO BE READY</div>
            <div class="mf-countdown-value" id="mf-countdown-value">${totalSeconds}s</div>
            <div class="mf-countdown-track" aria-hidden="true">
              <div class="mf-countdown-bar" id="mf-countdown-bar"></div>
            </div>
          </div>
        </div>
        `
      );

      const readyBtn = document.getElementById("mf-ready-btn");
      if (readyBtn) {
        readyBtn.addEventListener("click", async () => {
          if (!currentUid || matchFoundHasStarted) return;
          if (window.LudoSound) window.LudoSound.click();

          const me = players.find((p) => p.uid === currentUid);
          const nextReady = !Boolean(me?.ready);

          players = players.map((p) => (p.uid === currentUid ? { ...p, ready: nextReady } : p));
          renderScreen();

          if (matchData?.roomId && window.LudoOnlineRoom && typeof window.LudoOnlineRoom.setPlayerReady === "function") {
            await window.LudoOnlineRoom.setPlayerReady(matchData.roomId, nextReady).catch((err) => {
              showToast(err?.message || "Unable to update ready status");
            });
          }
        });
      }

      updateReadyAndTimerState();
    };

    renderScreen();

    if (matchData?.roomId && window.LudoOnlineRoom && typeof window.LudoOnlineRoom.subscribeToRoom === "function") {
      matchFoundUnsubscribe = window.LudoOnlineRoom.subscribeToRoom(matchData.roomId, (roomState) => {
        if (matchFoundHasStarted || !roomState) return;
        const updatedList = Array.isArray(roomState.matchedPlayers)
          ? roomState.matchedPlayers.slice(0, maxPlayers)
          : Object.values(roomState.players || {}).filter((p) => p && p.uid).slice(0, maxPlayers);

        if (updatedList.length >= maxPlayers) {
          players = updatedList;
          renderScreen();
        }

        if (roomState.status === "playing") {
          triggerStartMatch();
        }
      });
    }
  }

  document.getElementById("btn-close-modal")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    closeModal(false);
  });

  modalOverlay?.addEventListener("click", (e) => {
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

    openModal("👑 LUDO ADDA OFFLINE SETUP", `
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
        const container = modalBody?.querySelector(`[data-slot="${sc.key}"]`);
        if (!container) return;
        container.querySelectorAll(".role-pill").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.role === slotState[sc.key]);
        });
      });
    }

    modalBody?.querySelectorAll(".role-pill").forEach((btn) => {
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

    document.getElementById("btn-start-custom-offline")?.addEventListener("click", () => {
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
  // PART 2: PRIVATE-ONLY CHAT UI (1-TO-1 FRIENDS CHAT)
  // =========================================================
  const privateChatState = {
    selectedPeerUid: "",
    selectedPeerName: "",
    peerOnline: false,
    emojiBarOpen: false,
    menuOpen: false,
    renderedIdsByPeer: {}
  };

  function getKnownFriendsList() {
    const me = window.LudoTextChat?.resolveUid?.() || window.currentRoyalUser?.uid || "";
    const rawFriends = window.currentRoyalProfile?.friends;
    const list = [];

    if (Array.isArray(rawFriends)) {
      rawFriends.forEach((f, idx) => {
        if (typeof f === "string" && f.trim() && f.trim() !== me) {
          list.push({ uid: f.trim(), name: `Friend ${idx + 1}` });
        } else if (f && typeof f === "object" && f.uid && f.uid !== me) {
          list.push({ uid: String(f.uid), name: f.name || f.displayName || `Friend ${idx + 1}` });
        }
      });
    } else if (rawFriends && typeof rawFriends === "object") {
      Object.entries(rawFriends).forEach(([uid, info], idx) => {
        if (uid && uid !== me) {
          const nm = typeof info === "object" ? (info?.name || info?.displayName) : "";
          list.push({ uid, name: nm || `Friend ${idx + 1}` });
        }
      });
    }

    const roomPlayers = window.activeOnlineRoom?.players;
    if (roomPlayers && typeof roomPlayers === "object") {
      Object.values(roomPlayers).forEach((p) => {
        if (p?.uid && p.uid !== me && !list.some((item) => item.uid === p.uid)) {
          list.push({ uid: String(p.uid), name: p.name || "Player" });
        }
      });
    }

    return list;
  }

  function formatMessageTime(ts) {
    if (!ts) return "";
    const d = new Date(Number(ts));
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function appendPrivateMessageBubble(msg) {
    const box = document.getElementById("chat-messages-box");
    const peerUid = privateChatState.selectedPeerUid;
    if (!box || !msg || !peerUid) return;

    const me = window.LudoTextChat?.resolveUid?.() || "";
    const isMine = Boolean(me && msg.senderUid === me);
    const isForCurrentPeer =
      msg.peerUid === peerUid ||
      msg.senderUid === peerUid ||
      (isMine && (!msg.recipientUid || msg.recipientUid === peerUid));

    if (!isForCurrentPeer) return;

    if (!privateChatState.renderedIdsByPeer[peerUid]) {
      privateChatState.renderedIdsByPeer[peerUid] = new Set();
    }
    const dedupeKey = msg.id || `${msg.senderUid}_${msg.createdAt}_${msg.text}`;
    if (privateChatState.renderedIdsByPeer[peerUid].has(dedupeKey)) return;
    privateChatState.renderedIdsByPeer[peerUid].add(dedupeKey);

    const emptyNote = box.querySelector(".chat-empty-note");
    if (emptyNote) emptyNote.remove();

    const bubbleRow = document.createElement("div");
    bubbleRow.className = `chat-bubble-row ${isMine ? "right" : "left"}`;
    bubbleRow.innerHTML = `
      <div class="chat-bubble ${isMine ? "mine" : "peer"}">
        <div class="chat-bubble-text">${escapeRoyalHtml(msg.text || "")}</div>
        <div class="chat-bubble-time">${escapeRoyalHtml(formatMessageTime(msg.createdAt))}</div>
      </div>
    `;
    box.appendChild(bubbleRow);
    box.scrollTop = box.scrollHeight;
  }

  function updatePrivatePresenceUi(online) {
    privateChatState.peerOnline = Boolean(online);
    const dot = document.getElementById("chat-peer-dot");
    const label = document.getElementById("chat-peer-status-text");
    if (dot) dot.classList.toggle("online", privateChatState.peerOnline);
    if (label) label.textContent = privateChatState.peerOnline ? "Online" : "Offline";
  }

  async function mountSelectedFriendChat() {
    const chatApi = window.LudoTextChat;
    const box = document.getElementById("chat-messages-box");
    const peerUid = privateChatState.selectedPeerUid;

    if (box) {
      box.innerHTML = `<div class="chat-empty-note" style="color:#94a3b8;font-size:0.74rem;text-align:center;padding:14px;">${
        peerUid ? "Loading conversation..." : "Select a friend from the list to open private chat."
      }</div>`;
    }

    if (!peerUid || !chatApi) {
      updatePrivatePresenceUi(false);
      return;
    }

    privateChatState.renderedIdsByPeer[peerUid] = new Set();
    const status = await chatApi.getPeerOnlineStatus?.(peerUid);
    updatePrivatePresenceUi(Boolean(status?.online));
    await chatApi.mountDirectChat(peerUid);
  }

  async function openPrivateChatModal() {
    const friends = getKnownFriendsList();
    if (privateChatState.selectedPeerUid && !friends.some((f) => f.uid === privateChatState.selectedPeerUid)) {
      privateChatState.selectedPeerUid = "";
      privateChatState.selectedPeerName = "";
    }

    const hasSelectedFriend = Boolean(privateChatState.selectedPeerUid);
    if (!hasSelectedFriend) {
      privateChatState.emojiBarOpen = false;
      privateChatState.menuOpen = false;
    }

    const activeFriend = friends.find((f) => f.uid === privateChatState.selectedPeerUid);
    const peerName = activeFriend?.name || privateChatState.selectedPeerName || "Select Friend";
    const emojis = window.LudoTextChat?.getQuickEmojis?.() || ["😀", "😂", "😍", "🔥", "👑"];
    const isBlocked = hasSelectedFriend
      ? Boolean(window.LudoTextChat?.isUserBlocked?.(privateChatState.selectedPeerUid))
      : false;

    openModal("💬 PRIVATE CHAT", `
      <div class="chat-ui-wrap" id="ludo-private-chat-ui">
        <div class="royal-section-title" style="margin-bottom:2px;">Friends</div>
        <div class="chat-friends-strip" id="chat-friends-list">
          ${friends.length > 0
            ? friends.map((f) => `
              <button type="button" class="chat-friend-chip ${f.uid === privateChatState.selectedPeerUid ? "active" : ""}" data-peer-uid="${escapeRoyalHtml(f.uid)}" data-peer-name="${escapeRoyalHtml(f.name)}">
                <span class="chat-status-dot ${f.uid === privateChatState.selectedPeerUid && privateChatState.peerOnline ? "online" : ""}"></span>
                <span>${escapeRoyalHtml(f.name)}</span>
              </button>
            `).join("")
            : `<span style="font-size:0.72rem;color:#94a3b8;">No friends found yet.</span>`
          }
        </div>

        <div class="chat-thread-bar">
          <div class="chat-thread-peer">
            <span class="chat-status-dot ${hasSelectedFriend && privateChatState.peerOnline ? "online" : ""}" id="chat-peer-dot"></span>
            <div>
              <div id="chat-peer-name">${escapeRoyalHtml(peerName)}</div>
              <div style="font-size:0.65rem;color:#94a3b8;" id="chat-peer-status-text">${hasSelectedFriend ? (privateChatState.peerOnline ? "Online" : "Offline") : "Offline"}</div>
            </div>
          </div>

          <div class="chat-menu-wrap">
            <button type="button" class="chat-three-dot-btn" id="btn-chat-three-dot" aria-label="More options" ${!hasSelectedFriend ? "disabled" : ""}>⋮</button>
            <div class="chat-three-dot-menu ${hasSelectedFriend && privateChatState.menuOpen ? "" : "hidden"}" id="chat-three-dot-menu">
              <button type="button" class="chat-menu-item" id="btn-chat-block">${isBlocked ? "Unblock User" : "Block User"}</button>
              <button type="button" class="chat-menu-item danger" id="btn-chat-report">Report User</button>
            </div>
          </div>
        </div>

        <div class="chat-messages-box" id="chat-messages-box"></div>

        ${hasSelectedFriend ? `
          <div class="chat-emoji-bar ${privateChatState.emojiBarOpen ? "" : "hidden"}" id="chat-emoji-bar">
            ${emojis.map((em) => `<button type="button" class="chat-emoji-btn" data-emoji="${escapeRoyalHtml(em)}">${escapeRoyalHtml(em)}</button>`).join("")}
          </div>

          <div class="chat-composer-row" id="chat-composer-row">
            <button type="button" class="chat-emoji-toggle-btn" id="btn-chat-emoji-toggle" aria-label="Emojis">😊</button>
            <input type="text" class="chat-text-input" id="chat-message-input" maxlength="300" placeholder="Write a message..." />
            <button type="button" class="chat-send-btn" id="btn-chat-send">Send</button>
          </div>
        ` : ""}
      </div>
    `);

    modalOverlay?.querySelector(".modal-card")?.classList.add("chat-fullscreen-card");

    modalBody?.querySelectorAll(".chat-friend-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (window.LudoSound) window.LudoSound.click();
        privateChatState.selectedPeerUid = chip.dataset.peerUid || "";
        privateChatState.selectedPeerName = chip.dataset.peerName || "";
        privateChatState.menuOpen = false;
        privateChatState.emojiBarOpen = false;
        openPrivateChatModal();
      });
    });

    document.getElementById("btn-chat-three-dot")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!privateChatState.selectedPeerUid) return;
      privateChatState.menuOpen = !privateChatState.menuOpen;
      document.getElementById("chat-three-dot-menu")?.classList.toggle("hidden", !privateChatState.menuOpen);
    });

    document.getElementById("btn-chat-block")?.addEventListener("click", async () => {
      const target = privateChatState.selectedPeerUid;
      const api = window.LudoTextChat;
      if (!target || !api) return;
      privateChatState.menuOpen = false;
      if (api.isUserBlocked?.(target)) {
        const res = await api.unblockUser(target);
        if (res.ok) showToast("User unblocked.");
      } else {
        const res = await api.blockUser(target);
        if (res.ok) showToast("User blocked.");
      }
      openPrivateChatModal();
    });

    document.getElementById("btn-chat-report")?.addEventListener("click", async () => {
      const target = privateChatState.selectedPeerUid;
      const api = window.LudoTextChat;
      if (!target || !api) return;
      privateChatState.menuOpen = false;
      const res = await api.reportUser(target, "Reported from private chat");
      if (res.ok) {
        showToast("Report submitted.");
      } else {
        showToast(res.error || "Unable to submit report.");
      }
      document.getElementById("chat-three-dot-menu")?.classList.add("hidden");
    });

    document.getElementById("btn-chat-emoji-toggle")?.addEventListener("click", () => {
      privateChatState.emojiBarOpen = !privateChatState.emojiBarOpen;
      document.getElementById("chat-emoji-bar")?.classList.toggle("hidden", !privateChatState.emojiBarOpen);
    });

    modalBody?.querySelectorAll(".chat-emoji-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = document.getElementById("chat-message-input");
        if (!inp) return;
        inp.value = `${inp.value}${btn.dataset.emoji || ""}`.slice(0, 300);
        inp.focus();
      });
    });

    const handleSendPrivate = async () => {
      const inp = document.getElementById("chat-message-input");
      const api = window.LudoTextChat;
      if (!inp || !api) return;
      const text = inp.value.trim();
      if (!text) return;
      if (!privateChatState.selectedPeerUid) {
        showToast("Select a friend first.");
        return;
      }

      const senderName = window.currentRoyalProfile?.name || document.getElementById("display-name")?.textContent || "Player";
      const res = await api.sendDirectMessage(text, privateChatState.selectedPeerUid, senderName);
      if (!res.ok) {
        showToast(res.error || "Cannot send message.");
        return;
      }
      inp.value = "";
    };

    document.getElementById("btn-chat-send")?.addEventListener("click", handleSendPrivate);
    document.getElementById("chat-message-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSendPrivate();
      }
    });

    await mountSelectedFriendChat();
  }

  function bindPrivateChatRealtimeListeners() {
    const api = window.LudoTextChat;
    if (!api) return;

    api.onMessage((msg) => {
      if (msg?.channel !== "direct") return;
      const modalVisible = modalOverlay && !modalOverlay.classList.contains("hidden");
      if (modalVisible && privateChatState.selectedPeerUid) {
        appendPrivateMessageBubble(msg);
        if (msg.threadId) {
          api.clearUnread?.(`dm:${msg.threadId}`);
        }
      }
    });

    api.onPresenceChange((info) => {
      if (info?.peerUid && info.peerUid === privateChatState.selectedPeerUid) {
        updatePrivatePresenceUi(info.online);
      }
    });

    api.onUnreadChange(({ total }) => {
      const badge = document.getElementById("chat-unread-badge");
      if (!badge) return;
      const count = Number(total) || 0;
      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.classList.remove("hidden");
      } else {
        badge.textContent = "0";
        badge.classList.add("hidden");
      }
    });
  }

  bindPrivateChatRealtimeListeners();

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

    bgmBtn?.addEventListener("click", () => {
      if (!window.LudoSound) return;
      const next = !window.LudoSound.getSettings().musicEnabled;
      window.LudoSound.setMusicEnabled(next);
      bgmBtn.textContent = next ? "ON" : "OFF";
      bgmBtn.className = `toggle-pill-btn ${next ? "on" : "off"}`;
      window.LudoSound.click();
    });

    sfxBtn?.addEventListener("click", () => {
      if (!window.LudoSound) return;
      const next = !window.LudoSound.getSettings().sfxEnabled;
      window.LudoSound.setSfxEnabled(next);
      sfxBtn.textContent = next ? "ON" : "OFF";
      sfxBtn.className = `toggle-pill-btn ${next ? "on" : "off"}`;
      if (next) window.LudoSound.click();
    });

    bgmSlider?.addEventListener("input", (e) => {
      const pct = Number(e.target.value);
      const lbl = document.getElementById("label-bgm-vol");
      if (lbl) lbl.textContent = `${pct}%`;
      if (window.LudoSound) window.LudoSound.setMusicVolume(pct / 100);
    });

    sfxSlider?.addEventListener("input", (e) => {
      const pct = Number(e.target.value);
      const lbl = document.getElementById("label-sfx-vol");
      if (lbl) lbl.textContent = `${pct}%`;
      if (window.LudoSound) window.LudoSound.setSfxVolume(pct / 100);
    });

    document.getElementById("btn-test-royal-sound")?.addEventListener("click", () => {
      if (window.LudoSound) window.LudoSound.home();
    });
  }

  document.getElementById("btn-play-offline")?.addEventListener("click", openOfflineSetupModal);
  document.getElementById("btn-settings")?.addEventListener("click", openAudioSettingsModal);
  document.getElementById("btn-ingame-audio")?.addEventListener("click", openAudioSettingsModal);

  document.getElementById("btn-exit-match")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    if (window.LudoTextChat && typeof window.LudoTextChat.unmountDirectChat === "function") {
      window.LudoTextChat.unmountDirectChat();
    }
    exitToLobby();
  });

  document.getElementById("btn-reset-cam")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    setLockedBoardCamera();
    positionCornerPods();
    showToast("🎥 3D Board View Locked!");
  });

  document.getElementById("btn-play-online")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    openModal(
      "🌐 LUDO ADDA Online Matchmaking",
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
    modalBody?.querySelectorAll("#online-mode-select .pro-format-card").forEach((btn) => {
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
              closeModal(false);
              enter3DBoard(label, {
                mode: selectedOnlineMode,
                roomId: confirmedMatch?.roomId || null,
                online: true
              });
              showToast("🌐 Match Started — " + label + "!");
            }
          );
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
            closeModal(false);
            showToast("Matchmaking cancelled.");
          });
        }

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

  document.getElementById("btn-private-room")?.addEventListener("click", () => {
    openModal("🏰 Private LUDO ADDA Room", `
      <p style="color:#cbd5e1;font-size:0.85rem;line-height:1.5;">
        Create or join a Private Room with a Room Code, play with friends, and use in-room mic voice chat.
      </p>
    `);
  });

  document.getElementById("btn-voice-room")?.addEventListener("click", () => {
    openModal("🎙️ Public Gaming Voice Room", `
      <p style="color:#cbd5e1;font-size:0.85rem;line-height:1.5;">
        Join gaming voice rooms to talk mic-to-mic with players about Ludo and gaming. Phone calls are not part of LUDO ADDA.
      </p>
    `);
  });

  document.getElementById("nav-home")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    closeModal(false);
    showToast("🏠 LUDO ADDA Home");
  });

  document.getElementById("nav-game-rooms")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    openModal("🎮 Game Rooms", `
      <div class="setup-options">
        <button type="button" class="setup-btn" id="quick-open-offline">🎲 Offline Ludo & AI</button>
        <button type="button" class="setup-btn" id="quick-open-online">🌐 Online Ludo Matchmaking</button>
        <button type="button" class="setup-btn" id="quick-open-private">🏰 Private Room (Code + Room Mic)</button>
        <button type="button" class="setup-btn" id="quick-open-voice">🎙️ Public Gaming Voice Room</button>
      </div>
      <div id="earn-rewards-slot"></div>
    `);
    document.getElementById("quick-open-offline")?.addEventListener("click", () => openOfflineSetupModal());
    document.getElementById("quick-open-online")?.addEventListener("click", () => document.getElementById("btn-play-online")?.click());
    document.getElementById("quick-open-private")?.addEventListener("click", () => document.getElementById("btn-private-room")?.click());
    document.getElementById("quick-open-voice")?.addEventListener("click", () => document.getElementById("btn-voice-room")?.click());

    const rewardSlot = document.getElementById("earn-rewards-slot");
    renderEarnRewardsCard(rewardSlot, { completedAds: getCompletedAdsFromProfile() });
  });

  document.getElementById("btn-events")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    openModal("🏆 LUDO ADDA Events", `
      <p style="color:#cbd5e1;font-size:0.85rem;line-height:1.5;">
        Seasonal Ludo challenges and gaming room events will appear here as live event data is connected.
      </p>
    `);
  });

  document.getElementById("nav-chats")?.addEventListener("click", () => {
    if (window.LudoSound) window.LudoSound.click();
    openPrivateChatModal();
  });

  ["btn-daily", "btn-quests", "btn-alerts", "nav-friends"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        if (window.LudoSound) window.LudoSound.click();
        showToast("👑 LUDO ADDA Ready!");
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
      heroDiceGroup.position.y = 0.85 + Math.sin(t * 2.4) * 0.18;
      lobbyDice.rotation.x = t * 0.6;
      lobbyDice.rotation.y = t * 0.9;
      innerFrame.rotation.x = -t * 0.45;
      innerFrame.rotation.y = -t * 0.7;
      lobbyRing.rotation.z = t * 0.35;
      lobbyAura.rotation.z = -t * 0.25;
    } else {
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

  // =========================================================
  // PART 4: EARN REWARDS (GAME ROOMS) - LIVE PROGRESS & SSV BRIDGE
  // =========================================================
  const REWARD_MILESTONES = {
    targetAds: 20,
    firstMilestoneAds: 10,
    firstMilestoneCoins: 250,
    secondMilestoneExtraCoins: 250,
    secondMilestoneExtraDiamonds: 20
  };

  let latestRewardData = { completedAds: 0 };

  function getCurrentUserIdSafe() {
    if (typeof currentUser !== "undefined" && currentUser && currentUser.uid) {
      return currentUser.uid;
    }
    if (window.currentRoyalUser && window.currentRoyalUser.uid) {
      return window.currentRoyalUser.uid;
    }
    if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) {
      return firebase.auth().currentUser.uid;
    }
    return "";
  }

  function getCompletedAdsFromProfile() {
    const profile = window.currentRoyalProfile || {};
    const fromAdRewards = profile?.adRewards?.completedAds;
    if (typeof fromAdRewards === "number") return fromAdRewards;
    if (typeof profile?.completedAds === "number") return profile.completedAds;
    return Number(latestRewardData?.completedAds) || 0;
  }

  function createRewardSessionId(uid) {
    return `${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getRewardStatusText(completedAds) {
    const count = Number(completedAds) || 0;
    if (count >= 20) {
      return "20/20 সম্পন্ন! মোট 500 Coins + 20 Diamonds আনলক হয়েছে।";
    }
    if (count >= 10) {
      return `${count}/20 সম্পন্ন — 250 Coins পাওয়া গেছে। বাকি ${20 - count}টি অ্যাডে আরও 250 Coins + 20 Diamonds পাবেন।`;
    }
    return `${count}/20 সম্পন্ন — ${10 - count}টি অ্যাড দেখলেই 250 Coins পাবেন।`;
  }

  function renderEarnRewardsCard(containerEl, rewardData = {}) {
    if (!containerEl) return;

    const rawAds =
      typeof rewardData.completedAds === "number"
        ? rewardData.completedAds
        : getCompletedAdsFromProfile();

    latestRewardData = { ...latestRewardData, ...rewardData, completedAds: rawAds };

    const completedAds = Math.min(20, Math.max(0, Number(rawAds) || 0));
    const progressPercent = Math.round((completedAds / REWARD_MILESTONES.targetAds) * 100);
    const milestone1Done = completedAds >= 10;
    const milestone2Done = completedAds >= 20;

    containerEl.innerHTML = `
      <div id="earn-rewards-card" class="earn-rewards-box" style="padding:14px;border-radius:12px;background:#1b2234;color:#fff;margin-top:12px;border:1px solid rgba(250,204,21,0.35);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong>Earn Rewards</strong>
          <span id="reward-progress-count" style="color:#fde047;font-weight:800;">${completedAds} / 20 Ads</span>
        </div>

        <div style="width:100%;height:8px;background:#2f3a56;border-radius:999px;overflow:hidden;margin:10px 0;">
          <div id="reward-progress-bar" style="width:${progressPercent}%;height:100%;background:#22c55e;transition:width 0.25s ease;"></div>
        </div>

        <div style="font-size:13px;line-height:1.5;margin-bottom:10px;">
          <div>${milestone1Done ? "✅" : "⬜"} 10 Ads = <strong>250 Coins</strong></div>
          <div>${milestone2Done ? "✅" : "⬜"} 20 Ads = আরও <strong>250 Coins + 20 Diamonds</strong> (মোট <strong>500 Coins + 20 Diamonds</strong>)</div>
        </div>

        <p id="reward-status-text" style="font-size:12px;color:#cbd5e1;margin:0 0 12px 0;">
          ${getRewardStatusText(completedAds)}
        </p>

        <button id="watch-rewarded-ad-btn" type="button" ${milestone2Done ? "disabled" : ""}
          style="width:100%;padding:10px 14px;border:none;border-radius:8px;font-weight:700;cursor:pointer;background:${milestone2Done ? "#475569" : "#f59e0b"};color:#111827;">
          ${milestone2Done ? "সব রিওয়ার্ড সম্পন্ন (20/20)" : "Rewarded Ad দেখুন"}
        </button>
      </div>
    `;

    const btn = containerEl.querySelector("#watch-rewarded-ad-btn");
    if (btn && !milestone2Done) {
      btn.addEventListener("click", () => handleWatchRewardedAdClick(btn));
    }
  }

  function handleWatchRewardedAdClick(buttonEl) {
    const uid = getCurrentUserIdSafe();
    const statusEl = document.getElementById("reward-status-text");

    if (!uid) {
      if (statusEl) statusEl.textContent = "রিওয়ার্ড পেতে আগে অ্যাকাউন্টে লগইন বা গেস্ট আইডি তৈরি করুন।";
      return;
    }

    if (!window.LudoAdBridge || typeof window.LudoAdBridge.showRewardedAd !== "function") {
      if (statusEl) statusEl.textContent = "Rewarded Ad শুধু Android অ্যাপের ভেতরে কাজ করবে।";
      return;
    }

    const sessionId = createRewardSessionId(uid);
    if (buttonEl) buttonEl.disabled = true;
    if (statusEl) statusEl.textContent = "বিজ্ঞাপন লোড হচ্ছে...";

    try {
      window.LudoAdBridge.showRewardedAd(uid, sessionId);
    } catch (err) {
      if (buttonEl) buttonEl.disabled = false;
      if (statusEl) statusEl.textContent = "বিজ্ঞাপন চালু করা যায়নি, আবার চেষ্টা করুন।";
    }
  }

  window.renderEarnRewardsCard = renderEarnRewardsCard;

  window.addEventListener("ludo-profile-updated", () => {
    const slot = document.getElementById("earn-rewards-slot");
    if (slot) {
      renderEarnRewardsCard(slot, { completedAds: getCompletedAdsFromProfile() });
    }
  });

  // Native WebView Bridge Callbacks
  window.onNativeRewardedAdStatus = function (status) {
    const statusEl = document.getElementById("reward-status-text");
    if (!statusEl) return;
    if (status === "loading") statusEl.textContent = "Ad লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...";
    if (status === "showing") statusEl.textContent = "Ad চলছে...";
  };

  window.onNativeRewardedAdEarned = function () {
    const statusEl = document.getElementById("reward-status-text");
    if (statusEl) {
      statusEl.textContent = "Ad সম্পন্ন হয়েছে! সার্ভার (SSV) রিওয়ার্ড যাচাই করছে...";
    }
  };

  window.onNativeRewardedAdClosed = function (earnedReward) {
    const btn = document.getElementById("watch-rewarded-ad-btn");
    const statusEl = document.getElementById("reward-status-text");
    if (btn) btn.disabled = false;

    if (typeof refreshUserProfileAndRewards === "function") {
      refreshUserProfileAndRewards();
    } else if (!earnedReward && statusEl) {
      statusEl.textContent = "পুরো বিজ্ঞাপন না দেখায় রিওয়ার্ড যোগ হয়নি।";
    }
  };

  window.onNativeRewardedAdError = function (message) {
    const btn = document.getElementById("watch-rewarded-ad-btn");
    const statusEl = document.getElementById("reward-status-text");
    if (btn) btn.disabled = false;
    if (statusEl) {
      statusEl.textContent = message || "বিজ্ঞাপন দেখানো যায়নি, কিছুক্ষণ পর আবার চেষ্টা করুন।";
    }
  };
})();
