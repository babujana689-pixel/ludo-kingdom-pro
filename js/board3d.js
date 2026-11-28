// js/board3d.js - LUDO ADDA 3D Board with Luxury Golden Crown Centerpiece
window.LudoBoard3D = (function () {
  let boardGroup = null;
  let piecesGroup = null;
  let piecesMap = {};
  let crownGroup = null;
  let glowRingMat = null;

  const COLORS = {
    red: 0xe62e2d,
    green: 0x16a34a,
    yellow: 0xfacc15,
    blue: 0x0ea5e9,
    tileLight: 0xf8fafc,
    tileBorder: 0x1e293b,
    gold: 0xd4af37,
    goldBright: 0xffdf6b,
    royalBlue: 0x0c1938,
    glowBlue: 0x38bdf8,
    wood: 0x111827
  };

  // Safe star positions matching existing board layout
  const STAR_CELLS = {
    "12,6": COLORS.red,
    "6,2": COLORS.green,
    "2,8": COLORS.yellow,
    "8,12": COLORS.blue,
    "13,8": COLORS.blue,
    "8,1": COLORS.red,
    "1,6": COLORS.green,
    "6,13": COLORS.yellow
  };

  // Home yard coordinates matching existing LudoEngine paths
  const HOME_SLOTS = {
    red:    [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
    green:  [[1.5, 1.5],  [1.5, 3.5],  [3.5, 1.5],  [3.5, 3.5]],
    yellow: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    blue:   [[10.5, 10.5],[10.5, 12.5],[12.5, 10.5],[12.5, 12.5]]
  };

  function disposeGroup(group) {
    if (!group) return;
    group.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((mat) => {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      }
    });
  }

  function gridToWorld(row, col) {
    return {
      x: col - 7,
      z: row - 7
    };
  }

  function getTileColor(r, c) {
    // 4 Corner Home Yards (6x6 each) — Green TL, Yellow TR, Blue BR, Red BL
    if (r <= 5 && c <= 5) return COLORS.green;
    if (r <= 5 && c >= 9) return COLORS.yellow;
    if (r >= 9 && c >= 9) return COLORS.blue;
    if (r >= 9 && c <= 5) return COLORS.red;

    // Red Start & Home Lane (bottom vertical lane)
    if (r === 13 && c === 6) return COLORS.red;
    if (c === 7 && r >= 9 && r <= 13) return COLORS.red;

    // Green Start & Home Lane (left horizontal lane)
    if (r === 6 && c === 1) return COLORS.green;
    if (r === 7 && c >= 1 && c <= 5) return COLORS.green;

    // Yellow Start & Home Lane (top vertical lane)
    if (r === 1 && c === 8) return COLORS.yellow;
    if (c === 7 && r >= 1 && r <= 5) return COLORS.yellow;

    // Blue Start & Home Lane (right horizontal lane)
    if (r === 8 && c === 13) return COLORS.blue;
    if (r === 7 && c >= 9 && c <= 13) return COLORS.blue;

    return COLORS.tileLight;
  }

  function createStarMesh(colorHex) {
    const shape = new THREE.Shape();
    const outerR = 0.28;
    const innerR = 0.12;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35 });
    return new THREE.Mesh(geo, mat);
  }

  // High-resolution engraved "LUDO ADDA" circular medallion texture
  function createRoyalEmblemTexture() {
    const size = 512;
    const cvs = document.createElement("canvas");
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext("2d");

    const cx = size / 2;
    const cy = size / 2;

    // Deep royal blue radial background with subtle blue & gold aura
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 248);
    bgGrad.addColorStop(0, "#172b5c");
    bgGrad.addColorStop(0.65, "#0b1530");
    bgGrad.addColorStop(0.92, "#102854");
    bgGrad.addColorStop(1, "#d4af37");
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 250, 0, Math.PI * 2);
    ctx.fill();

    // Outer & inner luxury gold filigree rings
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 234, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle decorative stars around perimeter
    ctx.fillStyle = "#fde047";
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const sx = cx + Math.cos(a) * 198;
      const sy = cy + Math.sin(a) * 198;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(56, 189, 248, 0.85)";
    ctx.shadowBlur = 14;

    ctx.fillStyle = "#ffe066";
    ctx.font = "900 36px Georgia, serif";
    ctx.fillText("LUDO ADDA", cx, cy + 114);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "800 22px sans-serif";
    ctx.fillText("★ ROYAL SOCIAL EDITION ★", cx, cy - 135);

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 2;
    return tex;
  }

  // Build Luxury 3D Centerpiece (4 Home Triangles + Golden Circular Platform + 3D Royal Crown + Blue/Gold Glow)
  function createRoyalCenterpiece() {
    const center = new THREE.Group();
    const half = 1.48;

    const cornerTris = [
      { color: COLORS.green,  pts: [[-half, -half], [0, 0], [-half, half]] },
      { color: COLORS.yellow, pts: [[-half, -half], [half, -half], [0, 0]] },
      { color: COLORS.blue,   pts: [[half, -half], [half, half], [0, 0]] },
      { color: COLORS.red,    pts: [[-half, half], [half, half], [0, 0]] }
    ];

    cornerTris.forEach((t) => {
      const shape = new THREE.Shape();
      shape.moveTo(t.pts[0][0], t.pts[0][1]);
      shape.lineTo(t.pts[1][0], t.pts[1][1]);
      shape.lineTo(t.pts[2][0], t.pts[2][1]);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.35, metalness: 0.15 })
      );
      mesh.position.y = 0.05;
      center.add(mesh);
    });

    const blueGlowDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.26, 1.32, 0.04, 36),
      new THREE.MeshBasicMaterial({
        color: COLORS.glowBlue,
        transparent: true,
        opacity: 0.32
      })
    );
    blueGlowDisc.position.y = 0.065;
    center.add(blueGlowDisc);

    const goldMat = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      roughness: 0.22,
      metalness: 0.85
    });
    const brightGoldMat = new THREE.MeshStandardMaterial({
      color: COLORS.goldBright,
      roughness: 0.18,
      metalness: 0.9,
      emissive: 0x5c4308,
      emissiveIntensity: 0.35
    });

    const platformBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.14, 1.22, 0.1, 36),
      goldMat
    );
    platformBase.position.y = 0.09;
    center.add(platformBase);

    glowRingMat = new THREE.MeshBasicMaterial({
      color: COLORS.glowBlue,
      transparent: true,
      opacity: 0.75
    });
    const blueRim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.028, 12, 36), glowRingMat);
    blueRim.rotation.x = Math.PI / 2;
    blueRim.position.y = 0.11;
    center.add(blueRim);

    const goldRim = new THREE.Mesh(new THREE.TorusGeometry(1.11, 0.038, 12, 36), brightGoldMat);
    goldRim.rotation.x = Math.PI / 2;
    goldRim.position.y = 0.145;
    center.add(goldRim);

    const emblemTex = createRoyalEmblemTexture();
    const topMedallion = new THREE.Mesh(
      new THREE.CylinderGeometry(1.07, 1.07, 0.03, 36),
      new THREE.MeshStandardMaterial({
        map: emblemTex,
        roughness: 0.28,
        metalness: 0.35
      })
    );
    topMedallion.position.y = 0.145;
    center.add(topMedallion);

    crownGroup = new THREE.Group();
    crownGroup.position.set(0, 0.17, -0.06);

    const velvetCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        roughness: 0.45,
        metalness: 0.2,
        emissive: 0x0c2461,
        emissiveIntensity: 0.45
      })
    );
    velvetCore.scale.set(1, 0.78, 1);
    velvetCore.position.y = 0.18;
    crownGroup.add(velvetCore);

    const crownBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.31, 0.14, 24),
      brightGoldMat
    );
    crownBand.position.y = 0.07;
    crownGroup.add(crownBand);

    const bandRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.025, 10, 24),
      goldMat
    );
    bandRing.rotation.x = Math.PI / 2;
    bandRing.position.y = 0.13;
    crownGroup.add(bandRing);

    const spireCount = 8;
    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35
    });

    for (let i = 0; i < spireCount; i++) {
      const angle = (i / spireCount) * Math.PI * 2;
      const isMainSpire = i % 2 === 0;
      const spireH = isMainSpire ? 0.26 : 0.18;
      const radius = 0.34;

      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(isMainSpire ? 0.085 : 0.065, spireH, 10),
        brightGoldMat
      );
      spire.position.set(
        Math.cos(angle) * radius,
        0.13 + spireH / 2,
        Math.sin(angle) * radius
      );
      spire.rotation.z = -Math.cos(angle) * 0.22;
      spire.rotation.x = Math.sin(angle) * 0.22;
      crownGroup.add(spire);

      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(isMainSpire ? 0.045 : 0.032, 10, 10),
        pearlMat
      );
      pearl.position.set(
        Math.cos(angle) * (radius + 0.03),
        0.14 + spireH,
        Math.sin(angle) * (radius + 0.03)
      );
      crownGroup.add(pearl);
    }

    const topFinial = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), brightGoldMat);
    topFinial.position.y = 0.44;
    crownGroup.add(topFinial);

    const royalGlowLight = new THREE.PointLight(0xffd166, 0.7, 5.5);
    royalGlowLight.position.set(0, 0.85, 0);
    crownGroup.add(royalGlowLight);

    center.add(crownGroup);
    return center;
  }

  function createPawnMesh(colorHex) {
    const pawn = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.22,
      metalness: 0.25
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      roughness: 0.2,
      metalness: 0.85
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.35, 0.12, 20), goldMat);
    base.position.y = 0.06;
    pawn.add(base);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.28, 0.52, 20), mat);
    body.position.y = 0.38;
    pawn.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 10, 20), goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.65;
    pawn.add(collar);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 20), mat);
    head.position.y = 0.82;
    pawn.add(head);

    return pawn;
  }

  function build(scene) {
    if (boardGroup) {
      scene.remove(boardGroup);
      disposeGroup(boardGroup);
      boardGroup = null;
      piecesGroup = null;
      crownGroup = null;
      glowRingMat = null;
    }

    boardGroup = new THREE.Group();

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(15.8, 0.55, 15.8),
      new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.4, metalness: 0.4 })
    );
    frame.position.y = -0.32;
    boardGroup.add(frame);

    const goldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(15.25, 0.2, 15.25),
      new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.25, metalness: 0.75 })
    );
    goldBorder.position.y = -0.1;
    boardGroup.add(goldBorder);

    const gridPlate = new THREE.Mesh(
      new THREE.BoxGeometry(15.04, 0.12, 15.04),
      new THREE.MeshStandardMaterial({ color: COLORS.tileBorder, roughness: 0.6 })
    );
    gridPlate.position.y = -0.02;
    boardGroup.add(gridPlate);

    const tileGeo = new THREE.BoxGeometry(0.94, 0.12, 0.94);

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;

        const inGreenPad = r >= 1 && r <= 4 && c >= 1 && c <= 4;
        const inYellowPad = r >= 1 && r <= 4 && c >= 10 && c <= 13;
        const inBluePad = r >= 10 && r <= 13 && c >= 10 && c <= 13;
        const inRedPad = r >= 10 && r <= 13 && c >= 1 && c <= 4;
        if (inGreenPad || inYellowPad || inBluePad || inRedPad) continue;

        const pos = gridToWorld(r, c);
        const tile = new THREE.Mesh(
          tileGeo,
          new THREE.MeshStandardMaterial({ color: getTileColor(r, c), roughness: 0.4 })
        );
        tile.position.set(pos.x, 0.01, pos.z);
        boardGroup.add(tile);

        const key = `${r},${c}`;
        if (STAR_CELLS[key]) {
          const star = createStarMesh(STAR_CELLS[key]);
          star.position.set(pos.x, 0.085, pos.z);
          boardGroup.add(star);
        }
      }
    }

    const padGeo = new THREE.BoxGeometry(3.92, 0.14, 3.92);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const yards = [
      { key: "green", r: 2.5, c: 2.5, color: COLORS.green },
      { key: "yellow", r: 2.5, c: 11.5, color: COLORS.yellow },
      { key: "blue", r: 11.5, c: 11.5, color: COLORS.blue },
      { key: "red", r: 11.5, c: 2.5, color: COLORS.red }
    ];

    yards.forEach((y) => {
      const p = gridToWorld(y.r, y.c);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(p.x, 0.02, p.z);
      boardGroup.add(pad);

      HOME_SLOTS[y.key].forEach((slot) => {
        const sp = gridToWorld(slot[0], slot[1]);
        const slotRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.42, 0.035, 10, 24),
          new THREE.MeshStandardMaterial({ color: y.color, roughness: 0.4 })
        );
        slotRim.rotation.x = Math.PI / 2;
        slotRim.position.set(sp.x, 0.1, sp.z);
        boardGroup.add(slotRim);
      });
    });

    boardGroup.add(createRoyalCenterpiece());

    piecesGroup = new THREE.Group();
    piecesMap = { red: [], green: [], yellow: [], blue: [] };

    Object.keys(HOME_SLOTS).forEach((colorKey) => {
      HOME_SLOTS[colorKey].forEach((slot, idx) => {
        const mesh = createPawnMesh(COLORS[colorKey]);
        const pos = gridToWorld(slot[0], slot[1]);
        mesh.position.set(pos.x, 0.11, pos.z);
        mesh.userData = { color: colorKey, index: idx };
        piecesGroup.add(mesh);
        piecesMap[colorKey].push(mesh);
      });
    });

    boardGroup.add(piecesGroup);
    boardGroup.visible = false;
    scene.add(boardGroup);
  }

  function showBoard(visible) {
    if (boardGroup) boardGroup.visible = visible;
  }

  function animate(time) {
    if (!boardGroup || !boardGroup.visible) return;
    if (glowRingMat) {
      glowRingMat.opacity = 0.55 + Math.sin(time * 3.2) * 0.25;
    }
  }

  return { build, showBoard, animate, gridToWorld, piecesMap };
})();
