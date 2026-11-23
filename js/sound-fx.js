// js/sound-fx.js - 100% Offline Procedural Royal Music Loops & Realistic Sound Effects
window.LudoSound = (function () {
  let ctx = null;
  let bgmTimer = null;
  let currentScene = "none"; // "lobby" | "setup" | "board" | "none"
  let stepIndex = 0;

  // Persistent Audio Settings
  const STORAGE_KEY = "ludo_kingdom_audio_v1";
  let settings = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.45,
    sfxVolume: 0.85
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) settings = { ...settings, ...saved };
  } catch (e) {}

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function ensureCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  // Play single synthesized note for SFX
  function playSfxTone(freq, type, duration, baseVol, delay = 0, endFreq = null) {
    if (!settings.sfxEnabled || settings.sfxVolume <= 0) return;
    ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const vol = Math.max(0.001, baseVol * settings.sfxVolume);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Soft warm pad/harp tone for Background Music Loops
  function playBgmNote(freq, type, duration, baseVol) {
    if (!settings.musicEnabled || settings.musicVolume <= 0) return;
    ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = Math.max(0.0005, baseVol * settings.musicVolume);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Gentle attack & release for pleasant ambient music
    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 3 Distinct Royal Musical Scales & Sequences (Looping)
  const BGM_SCENES = {
    // 1. Lobby: Royal Fantasy Harp & Strings
    lobby: {
      intervalMs: 420,
      melody: [261.63, 329.63, 392.00, 493.88, 523.25, 493.88, 392.00, 329.63,
               293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23],
      bass:   [130.81, 0, 130.81, 0, 164.81, 0, 196.00, 0,
               146.83, 0, 146.83, 0, 174.61, 0, 196.00, 0],
      wave: "triangle",
      vol: 0.085
    },
    // 2. Offline Setup: Soft Magical Ambient Chimes
    setup: {
      intervalMs: 520,
      melody: [392.00, 0, 493.88, 587.33, 659.25, 0, 587.33, 493.88,
               349.23, 0, 440.00, 523.25, 587.33, 0, 523.25, 440.00],
      bass:   [196.00, 0, 0, 0, 164.81, 0, 0, 0,
               174.61, 0, 0, 0, 146.83, 0, 0, 0],
      wave: "sine",
      vol: 0.075
    },
    // 3. Game Board: Royal Adventure March
    board: {
      intervalMs: 360,
      melody: [329.63, 392.00, 440.00, 523.25, 493.88, 392.00, 329.63, 293.66,
               349.23, 440.00, 523.25, 587.33, 523.25, 493.88, 440.00, 392.00],
      bass:   [164.81, 0, 196.00, 0, 130.81, 0, 196.00, 0,
               174.61, 0, 220.00, 0, 196.00, 0, 146.83, 0],
      wave: "triangle",
      vol: 0.065
    }
  };

  function startMusicLoop(sceneName) {
    if (currentScene === sceneName && bgmTimer) return;
    stopMusicLoop();
    currentScene = sceneName;
    stepIndex = 0;

    const cfg = BGM_SCENES[sceneName];
    if (!cfg) return;

    const tick = () => {
      if (settings.musicEnabled && settings.musicVolume > 0 && ctx && ctx.state === "running") {
        const idx = stepIndex % cfg.melody.length;
        const mFreq = cfg.melody[idx];
        const bFreq = cfg.bass[idx];
        if (mFreq > 0) playBgmNote(mFreq, cfg.wave, (cfg.intervalMs / 1000) * 1.35, cfg.vol);
        if (bFreq > 0) playBgmNote(bFreq, "sine", (cfg.intervalMs / 1000) * 1.9, cfg.vol * 0.95);
        stepIndex++;
      }
    };

    bgmTimer = setInterval(tick, cfg.intervalMs);
  }

  function stopMusicLoop() {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    currentScene = "none";
  }

  // Unlock AudioContext on first user touch anywhere on Android
  function unlockOnGesture() {
    ensureCtx();
    if (currentScene !== "none" && !bgmTimer) {
      const target = currentScene;
      currentScene = "none";
      startMusicLoop(target);
    }
  }
  document.addEventListener("pointerdown", unlockOnGesture, { passive: true });
  document.addEventListener("touchstart", unlockOnGesture, { passive: true });

  return {
    // Music Scene Controllers
    playLobbyMusic() { startMusicLoop("lobby"); },
    playSetupMusic() { startMusicLoop("setup"); },
    playBoardMusic() { startMusicLoop("board"); },
    stopMusic() { stopMusicLoop(); },

    // Premium UI Button Click Sound
    click() {
      playSfxTone(780, "sine", 0.055, 0.16, 0, 1080);
    },

    // Match Start Fanfare
    start() {
      [392.0, 523.25, 659.25, 783.99].forEach((f, i) => playSfxTone(f, "triangle", 0.16, 0.22, i * 0.08));
    },

    // Realistic Multi-Tap Dice Tumbling Sound
    roll() {
      const clatter = [290, 380, 320, 440, 360, 520];
      clatter.forEach((f, i) => playSfxTone(f, "triangle", 0.055, 0.18, i * 0.048, f * 0.85));
    },

    // Soft Pawn Movement Hop Sound
    hop() {
      playSfxTone(520, "sine", 0.065, 0.16, 0, 680);
    },

    // Pawn Out of Home Spawn Sound
    spawn() {
      playSfxTone(440, "triangle", 0.12, 0.2, 0);
      playSfxTone(660, "triangle", 0.18, 0.22, 0.08);
    },

    // Safe Star Chime
    star() {
      [880.0, 1174.66, 1396.91, 1760.0].forEach((f, i) => playSfxTone(f, "sine", 0.22, 0.2, i * 0.055));
    },

    // Special Pawn Capture Blast + Return Slide
    capture() {
      playSfxTone(420, "sawtooth", 0.14, 0.28, 0, 140);
      playSfxTone(880, "sine", 0.45, 0.24, 0.1, 190);
      playSfxTone(220, "triangle", 0.35, 0.22, 0.18, 95);
    },

    // Pawn Paka (Reached Goal)
    home() {
      [587.33, 739.99, 880.0, 1174.66, 1479.98].forEach((f, i) => playSfxTone(f, "triangle", 0.22, 0.25, i * 0.07));
    },

    // Royal Victory Fanfare
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => playSfxTone(f, "triangle", 0.3, 0.28, i * 0.11));
    },

    // Settings API for Music & SFX Modal
    getSettings() {
      return { ...settings };
    },
    setMusicEnabled(val) {
      settings.musicEnabled = Boolean(val);
      saveSettings();
    },
    setSfxEnabled(val) {
      settings.sfxEnabled = Boolean(val);
      saveSettings();
    },
    setMusicVolume(val) {
      settings.musicVolume = Math.max(0, Math.min(1, Number(val)));
      saveSettings();
    },
    setSfxVolume(val) {
      settings.sfxVolume = Math.max(0, Math.min(1, Number(val)));
      saveSettings();
    }
  };
})();
