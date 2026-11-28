// js/ludo-engine.js - LUDO ADDA Offline Engine (2/3/4 Players, AI, Turn, Capture & Podium)
window.LudoEngine = (function () {
  const MAIN_TRACK = [
    [13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    [7,0],[6,0],
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    [0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
    [7,14],[8,14],
    [8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],[14,6]
  ];

  const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };

  const HOME_LANES = {
    red:    [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
    green:  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    yellow: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]]
  };

  const HOME_SLOTS = {
    red:    [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
    green:  [[1.5, 1.5],  [1.5, 3.5],  [3.5, 1.5],  [3.5, 3.5]],
    yellow: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    blue:   [[10.5, 10.5],[10.5, 12.5],[12.5, 10.5],[12.5, 12.5]]
  };

  const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const STAR_ONLY_INDICES = new Set([8, 21, 34, 47]);

  const COLOR_BADGES = {
    red: "🔴 RED",
    green: "🟢 GREEN",
    yellow: "🟡 YELLOW",
    blue: "🔵 BLUE"
  };

  const RANK_LABELS = ["👑 1st (King)", "🥈 2nd", "🥉 3rd", "4th"];
  const ALL_COLORS = ["red", "green", "yellow", "blue"];

  let state = {
    activeColors: ["red", "green", "yellow", "blue"],
    aiColors: new Set(["green", "yellow", "blue"]),
    humanLabels: { red: "P1", green: "P2", yellow: "P3", blue: "P4" },
    turnIdx: 0,
    diceValue: 0,
    phase: "ROLL", // ROLL | MOVE | ANIMATING | OVER
    steps: {
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1]
    },
    winners: [],
    movablePawns: [],
    animatingPawns: new Set()
  };

  let onToast = () => {};
  let onDiceAnim = () => {};
  let pendingTimers = new Set();

  function scheduleTimer(fn, delay) {
    const id = setTimeout(() => {
      pendingTimers.delete(id);
      fn();
    }, delay);
    pendingTimers.add(id);
    return id;
  }

  function clearAllTimers() {
    pendingTimers.forEach((id) => clearTimeout(id));
    pendingTimers.clear();
  }

  function init(callbacks = {}) {
    if (callbacks.onToast) onToast = callbacks.onToast;
    if (callbacks.onDiceAnim) onDiceAnim = callbacks.onDiceAnim;
  }

  function startMatch(modeOrConfig) {
    clearAllTimers();
    let slotRoles = { red: "human", green: "ai", yellow: "ai", blue: "ai" };

    if (typeof modeOrConfig === "object" && modeOrConfig !== null) {
      slotRoles = { ...slotRoles, ...modeOrConfig };
    } else if (modeOrConfig === "1v1") {
      slotRoles = { red: "human", green: "off", yellow: "ai", blue: "off" };
    } else if (modeOrConfig === "2v2") {
      slotRoles = { red: "human", green: "ai", yellow: "human", blue: "ai" };
    } else if (modeOrConfig === "3v1") {
      slotRoles = { red: "human", green: "human", yellow: "human", blue: "ai" };
    } else if (modeOrConfig === "pass2") {
      slotRoles = { red: "human", green: "off", yellow: "human", blue: "off" };
    } else if (modeOrConfig === "pass3") {
      slotRoles = { red: "human", green: "human", yellow: "human", blue: "off" };
    } else if (modeOrConfig === "pass" || modeOrConfig === "pass4") {
      slotRoles = { red: "human", green: "human", yellow: "human", blue: "human" };
    }

    const active = [];
    const ais = new Set();
    let humanCount = 0;

    ALL_COLORS.forEach((c) => {
      const role = slotRoles[c] || "off";
      if (role !== "off") {
        active.push(c);
        if (role === "ai") {
          ais.add(c);
        } else {
          humanCount++;
          state.humanLabels[c] = `P${humanCount}`;
        }
      }
    });

    if (active.length < 2) {
      active.splice(0, active.length, "red", "yellow");
      ais.clear();
      ais.add("yellow");
      state.humanLabels.red = "P1";
    }

    state.activeColors = active;
    state.aiColors = ais;
    state.turnIdx = 0;
    state.diceValue = 0;
    state.phase = "ROLL";
    state.winners = [];
    state.movablePawns = [];
    state.animatingPawns.clear();
    state.steps = {
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1]
    };

    if (window.LudoSound) window.LudoSound.start();

    ALL_COLORS.forEach((c) => {
      const pod = document.getElementById(`hud-${c}`);
      const nameEl = document.getElementById(`name-${c}`);
      const isActive = state.activeColors.includes(c);

      if (pod) pod.classList.toggle("inactive-slot", !isActive);
      if (nameEl) {
        if (!isActive) {
          nameEl.textContent = COLOR_BADGES[c];
        } else {
          const tag = state.aiColors.has(c) ? "AI" : state.humanLabels[c];
          nameEl.textContent = `${COLOR_BADGES[c]} (${tag})`;
        }
      }

      const pawnMeshes = window.LudoBoard3D?.piecesMap?.[c];
      if (pawnMeshes) {
        pawnMeshes.forEach((m) => {
          if (m) m.visible = isActive;
        });
      }
    });

    syncAllPawnPositions();
    updateHUD();

    if (state.aiColors.has(currentColor())) {
      scheduleTimer(() => rollDice(currentColor()), 600);
    }
  }

  function getGridCoord(color, step, pawnIdx) {
    if (step === -1) return HOME_SLOTS[color][pawnIdx];
    if (step >= 0 && step <= 50) {
      const trackIdx = (START_INDEX[color] + step) % 52;
      return MAIN_TRACK[trackIdx];
    }
    const laneIdx = Math.min(5, step - 51);
    return HOME_LANES[color][laneIdx];
  }

  function syncAllPawnPositions() {
    if (!window.LudoBoard3D || !window.LudoBoard3D.piecesMap) return;

    const cellGroups = {};
    state.activeColors.forEach((color) => {
      state.steps[color].forEach((step, idx) => {
        if (state.animatingPawns.has(`${color}:${idx}`)) return;
        const coord = getGridCoord(color, step, idx);
        const key = `${coord[0]},${coord[1]}`;
        if (!cellGroups[key]) cellGroups[key] = [];
        cellGroups[key].push({ color, idx, coord, step });
      });
    });

    const offsets = [
      [0, 0],
      [-0.18, -0.18],
      [0.18, 0.18],
      [-0.18, 0.18],
      [0.18, -0.18]
    ];

    Object.values(cellGroups).forEach((group) => {
      const count = group.length;
      group.forEach((item, i) => {
        const mesh = window.LudoBoard3D.piecesMap[item.color]?.[item.idx];
        if (!mesh) return;
        const world = window.LudoBoard3D.gridToWorld(item.coord[0], item.coord[1]);
        const off = (count > 1 && item.step >= 0) ? offsets[(i % 4) + 1] : [0, 0];
        const s = (count > 1 && item.step >= 0) ? 0.82 : 1;
        mesh.position.set(world.x + off[0], 0.1, world.z + off[1]);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(s, s, s);
      });
    });
  }

  function currentColor() {
    return state.activeColors[state.turnIdx];
  }

  function getTurnState() {
    return {
      currentColor: currentColor(),
      phase: state.phase,
      isAI: state.aiColors.has(currentColor()),
      activeColors: state.activeColors
    };
  }

  function updateHUD() {
    const cur = currentColor();
    ALL_COLORS.forEach((c) => {
      const pod = document.getElementById(`hud-${c}`);
      const scoreEl = document.getElementById(`score-${c}`);
      const isActive = state.activeColors.includes(c);
      const winRank = state.winners.indexOf(c);

      if (pod) pod.classList.toggle("active-turn", state.phase !== "OVER" && c === cur);

      if (scoreEl) {
        if (!isActive) {
          scoreEl.textContent = "OFF";
          scoreEl.style.color = "";
        } else if (winRank !== -1) {
          scoreEl.textContent = RANK_LABELS[winRank];
          scoreEl.style.color = "#facc15";
        } else if (c === cur && state.phase === "ROLL") {
          scoreEl.textContent = state.aiColors.has(c) ? "Rolling..." : "Tap Dice";
          scoreEl.style.color = "#fde047";
        } else if (c === cur && state.phase === "MOVE") {
          scoreEl.textContent = `Rolled ${state.diceValue} • Move`;
          scoreEl.style.color = "#fde047";
        } else {
          const finished = state.steps[c].filter((s) => s === 56).length;
          scoreEl.textContent = `Home ${finished}/4`;
          scoreEl.style.color = "";
        }
      }
    });
  }

  function getMovablePawns(color, dice) {
    const valid = [];
    state.steps[color].forEach((step, idx) => {
      if (step === -1 && dice === 6) valid.push(idx);
      else if (step >= 0 && step + dice <= 56) valid.push(idx);
    });
    return valid;
  }

  function rollDice(requestedColor) {
    if (state.phase !== "ROLL") return;
    const cur = currentColor();
    if (requestedColor && requestedColor !== cur) return;

    state.phase = "ANIMATING";
    updateHUD();

    if (window.LudoSound) window.LudoSound.roll();
    const rolled = Math.floor(Math.random() * 6) + 1;
    state.diceValue = rolled;
    onDiceAnim(cur, rolled);

    scheduleTimer(() => {
      const movable = getMovablePawns(cur, rolled);
      state.movablePawns = movable;

      if (movable.length === 0) {
        onToast(`${COLOR_BADGES[cur]} rolled ${rolled} — No valid moves!`);
        scheduleTimer(() => nextTurn(false), 750);
        return;
      }

      state.phase = "MOVE";
      updateHUD();

      if (state.aiColors.has(cur)) {
        const chosen = chooseBestAIMove(cur, movable, rolled);
        scheduleTimer(() => executeMove(cur, chosen), 420);
      } else if (movable.length === 1) {
        scheduleTimer(() => executeMove(cur, movable[0]), 280);
      }
    }, 450);
  }

  function chooseBestAIMove(color, movable, dice) {
    for (const idx of movable) {
      if (state.steps[color][idx] + dice === 56) return idx;
    }
    for (const idx of movable) {
      const curStep = state.steps[color][idx];
      if (curStep >= 0 && curStep + dice <= 50) {
        const targetTrack = (START_INDEX[color] + curStep + dice) % 52;
        if (!SAFE_TRACK_INDICES.has(targetTrack)) {
          for (const opp of state.activeColors) {
            if (opp === color || state.winners.includes(opp)) continue;
            for (const oppStep of state.steps[opp]) {
              if (oppStep >= 0 && oppStep <= 50 && (START_INDEX[opp] + oppStep) % 52 === targetTrack) {
                return idx;
              }
            }
          }
        }
      }
    }
    for (const idx of movable) {
      const curStep = state.steps[color][idx];
      if (curStep >= 0 && curStep + dice <= 50) {
        const targetTrack = (START_INDEX[color] + curStep + dice) % 52;
        if (SAFE_TRACK_INDICES.has(targetTrack)) return idx;
      }
    }
    for (const idx of movable) {
      if (state.steps[color][idx] === -1) return idx;
    }
    return movable.sort((a, b) => state.steps[color][b] - state.steps[color][a])[0];
  }

  function handlePawnTap(color, pawnIdx) {
    if (state.phase !== "MOVE") return;
    const cur = currentColor();
    if (state.aiColors.has(cur) || color !== cur) return;
    if (!state.movablePawns.includes(pawnIdx)) {
      onToast("⚠️ Tap one of the bouncing pawns!");
      return;
    }
    executeMove(color, pawnIdx);
  }

  function animateSingleHop(mesh, fromPos, toPos, duration, onDone) {
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      mesh.position.x = fromPos.x + (toPos.x - fromPos.x) * ease;
      mesh.position.z = fromPos.z + (toPos.z - fromPos.z) * ease;

      const arc = Math.sin(p * Math.PI);
      mesh.position.y = 0.1 + arc * 0.48;

      const stretchY = 1 + arc * 0.16 - (1 - arc) * 0.06;
      const squashXZ = 1 / Math.sqrt(stretchY);
      mesh.scale.set(squashXZ, stretchY, squashXZ);

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        mesh.position.set(toPos.x, 0.1, toPos.z);
        mesh.scale.set(1, 1, 1);
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  function animateCaptureReturn(oppColor, oppIdx, onDone) {
    const key = `${oppColor}:${oppIdx}`;
    const mesh = window.LudoBoard3D?.piecesMap?.[oppColor]?.[oppIdx];
    const homeCoord = HOME_SLOTS[oppColor][oppIdx];
    const homeWorld = window.LudoBoard3D.gridToWorld(homeCoord[0], homeCoord[1]);

    if (!mesh) {
      state.steps[oppColor][oppIdx] = -1;
      onDone();
      return;
    }

    state.animatingPawns.add(key);
    const startPos = { x: mesh.position.x, z: mesh.position.z };
    const duration = 520;
    const start = performance.now();

    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);

      mesh.position.x = startPos.x + (homeWorld.x - startPos.x) * ease;
      mesh.position.z = startPos.z + (homeWorld.z - startPos.z) * ease;
      mesh.position.y = 0.1 + Math.sin(p * Math.PI) * 2.2;
      mesh.rotation.y = p * Math.PI * 6;
      mesh.rotation.z = Math.sin(p * Math.PI) * 0.45;

      const s = 1 + Math.sin(p * Math.PI) * 0.25;
      mesh.scale.set(s, s, s);

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        mesh.position.set(homeWorld.x, 0.1, homeWorld.z);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        state.steps[oppColor][oppIdx] = -1;
        state.animatingPawns.delete(key);
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  function executeMove(color, pawnIdx) {
    state.phase = "ANIMATING";
    state.movablePawns = [];
    const pawnKey = `${color}:${pawnIdx}`;
    state.animatingPawns.add(pawnKey);

    const oldStep = state.steps[color][pawnIdx];
    const targetStep = oldStep === -1 ? 0 : oldStep + state.diceValue;
    const mesh = window.LudoBoard3D?.piecesMap?.[color]?.[pawnIdx];

    const stepList = [];
    if (oldStep === -1) {
      stepList.push(0);
    } else {
      for (let s = oldStep + 1; s <= targetStep; s++) {
        stepList.push(s);
      }
    }

    let hopIndex = 0;
    function runNextHop() {
      if (hopIndex >= stepList.length) {
        state.steps[color][pawnIdx] = targetStep;
        state.animatingPawns.delete(pawnKey);
        finalizeMove(color, pawnIdx, targetStep, oldStep === -1);
        return;
      }

      const nextStepVal = stepList[hopIndex];
      const nextCoord = getGridCoord(color, nextStepVal, pawnIdx);
      const toWorld = window.LudoBoard3D.gridToWorld(nextCoord[0], nextCoord[1]);
      const fromPos = { x: mesh.position.x, z: mesh.position.z };

      if (window.LudoSound) {
        if (oldStep === -1 && hopIndex === 0) window.LudoSound.spawn();
        else window.LudoSound.hop();
      }

      const stepDuration = (oldStep === -1 && hopIndex === 0) ? 140 : 85;
      animateSingleHop(mesh, fromPos, { x: toWorld.x, z: toWorld.z }, stepDuration, () => {
        hopIndex++;
        runNextHop();
      });
    }

    if (mesh) {
      runNextHop();
    } else {
      state.steps[color][pawnIdx] = targetStep;
      state.animatingPawns.delete(pawnKey);
      finalizeMove(color, pawnIdx, targetStep, oldStep === -1);
    }
  }

  function showWinnerPodium() {
    const modalOverlay = document.getElementById("modal-overlay");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modalOverlay || !modalTitle || !modalBody) return;

    const rewards = ["+500 🟡", "+250 🟡", "+100 🟡", "+25 🟡"];
    const rowsHtml = state.winners.map((c, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(30,41,59,0.85);border:1px solid ${idx === 0 ? "#facc15" : "rgba(148,163,184,0.3)"};border-radius:12px;padding:10px 14px;margin-bottom:8px;">
        <span style="font-weight:800;color:${idx === 0 ? "#facc15" : "#f8fafc"};">${RANK_LABELS[idx]}</span>
        <span style="font-weight:700;color:#e2e8f0;">${COLOR_BADGES[c]}</span>
        <span style="font-weight:700;color:#fde047;">${rewards[idx] || ""}</span>
      </div>
    `).join("");

    modalTitle.textContent = "👑 LUDO ADDA ROYAL RESULTS";
    modalBody.innerHTML = `
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:2.4rem;">👑</div>
        <div style="font-size:1.05rem;font-weight:800;color:#facc15;">${COLOR_BADGES[state.winners[0]]} IS THE KING!</div>
      </div>
      ${rowsHtml}
      <button class="setup-btn" id="btn-podium-lobby" style="width:100%;margin-top:10px;justify-content:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:800;">
        ← Return to LUDO ADDA Lobby
      </button>
    `;
    modalOverlay.classList.remove("hidden");
    const backBtn = document.getElementById("btn-podium-lobby");
    if (backBtn) {
      backBtn.onclick = () => {
        clearAllTimers();
        modalOverlay.classList.add("hidden");
        document.getElementById("btn-exit-match")?.click();
      };
    }
  }

  function finalizeMove(color, pawnIdx, newStep, justSpawned) {
    let bonusTurn = state.diceValue === 6;
    const capturedList = [];
    let landedOnStar = false;

    if (newStep >= 0 && newStep <= 50) {
      const myTrackIdx = (START_INDEX[color] + newStep) % 52;
      if (STAR_ONLY_INDICES.has(myTrackIdx) || (!justSpawned && SAFE_TRACK_INDICES.has(myTrackIdx))) {
        landedOnStar = true;
      }
      if (!SAFE_TRACK_INDICES.has(myTrackIdx)) {
        state.activeColors.forEach((opp) => {
          if (opp === color || state.winners.includes(opp)) return;
          state.steps[opp].forEach((oppStep, oIdx) => {
            if (oppStep >= 0 && oppStep <= 50) {
              const oppTrackIdx = (START_INDEX[opp] + oppStep) % 52;
              if (oppTrackIdx === myTrackIdx) {
                capturedList.push({ opp, oIdx });
              }
            }
          });
        });
      }
    }

    const afterCaptures = () => {
      if (newStep === 56) {
        bonusTurn = true;
        if (window.LudoSound) window.LudoSound.home();
        onToast(`👑 ${COLOR_BADGES[color]} Pawn Paka! Bonus Roll!`);
      } else if (landedOnStar) {
        if (window.LudoSound) window.LudoSound.star();
        onToast(`⭐ ${COLOR_BADGES[color]} Safe in Star Zone!`);
      }

      syncAllPawnPositions();

      if (state.steps[color].every((s) => s === 56) && !state.winners.includes(color)) {
        state.winners.push(color);
        const rankIdx = state.winners.length - 1;
        if (window.LudoSound) window.LudoSound.win();

        const nameEl = document.getElementById(`name-${color}`);
        if (nameEl && rankIdx === 0) {
          nameEl.textContent = `👑 ${COLOR_BADGES[color]} KING`;
        }
        onToast(`${RANK_LABELS[rankIdx]} — ${COLOR_BADGES[color]} Finished!`);

        const maxWinners = Math.min(3, state.activeColors.length - 1);
        if (state.winners.length >= maxWinners) {
          state.activeColors.forEach((rem) => {
            if (!state.winners.includes(rem)) state.winners.push(rem);
          });
          state.phase = "OVER";
          updateHUD();
          scheduleTimer(() => showWinnerPodium(), 650);
          return;
        }
        bonusTurn = false;
      }

      scheduleTimer(() => nextTurn(bonusTurn), 260);
    };

    if (capturedList.length > 0) {
      bonusTurn = true;
      if (window.LudoSound) window.LudoSound.capture();
      onToast(`💥 ${COLOR_BADGES[color]} captured ${COLOR_BADGES[capturedList[0].opp]}! Bonus Roll!`);

      let completed = 0;
      capturedList.forEach(({ opp, oIdx }) => {
        animateCaptureReturn(opp, oIdx, () => {
          completed++;
          if (completed === capturedList.length) afterCaptures();
        });
      });
    } else {
      afterCaptures();
    }
  }

  function nextTurn(bonusTurn) {
    if (state.phase === "OVER") return;

    if (!bonusTurn || state.winners.includes(currentColor())) {
      let guard = 0;
      do {
        state.turnIdx = (state.turnIdx + 1) % state.activeColors.length;
        guard++;
      } while (state.winners.includes(currentColor()) && guard < 6);
    }

    state.phase = "ROLL";
    updateHUD();

    const cur = currentColor();
    if (state.aiColors.has(cur)) {
      scheduleTimer(() => rollDice(cur), 520);
    }
  }

  function animateHighlights(time) {
    if (!window.LudoBoard3D || !window.LudoBoard3D.piecesMap) return;
    const cur = currentColor();
    state.activeColors.forEach((color) => {
      const meshes = window.LudoBoard3D.piecesMap[color];
      if (!meshes) return;
      meshes.forEach((mesh, idx) => {
        if (!mesh || state.animatingPawns.has(`${color}:${idx}`)) return;
        const isHighlighted = state.phase === "MOVE" && color === cur && state.movablePawns.includes(idx);
        if (isHighlighted) {
          const pulse = 1.16 + Math.sin(time * 9) * 0.1;
          mesh.scale.set(pulse, pulse, pulse);
          mesh.position.y = 0.2 + Math.abs(Math.sin(time * 7)) * 0.2;
        } else {
          mesh.position.y = 0.1;
        }
      });
    });
  }

  return { init, startMatch, rollDice, handlePawnTap, animateHighlights, getTurnState };
})();
