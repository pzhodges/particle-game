const canvas = document.querySelector(".particle-canvas");
const context = canvas.getContext("2d");
const controls = {
  panel: document.querySelector(".control-panel"),
  panelBody: document.querySelector(".control-panel__body"),
  toggle: document.querySelector(".control-panel__toggle"),
  experience: document.querySelector("#experience"),
  difficulty: document.querySelector("#difficulty"),
  mode: document.querySelector("#mode"),
  particleCount: document.querySelector("#particleCount"),
  speed: document.querySelector("#speed"),
  attraction: document.querySelector("#attraction"),
  trail: document.querySelector("#trail"),
  randomize: document.querySelector(".randomize-button"),
  reset: document.querySelector(".reset-button"),
  values: document.querySelectorAll("[data-value-for]")
};

const gameUi = {
  mode: document.querySelector("[data-game-mode]"),
  difficulty: document.querySelector("[data-game-difficulty]"),
  level: document.querySelector("[data-game-level]"),
  progress: document.querySelector("[data-game-progress]"),
  status: document.querySelector("[data-game-status]")
};

const pointer = {
  x: 0,
  y: 0,
  previousX: 0,
  previousY: 0,
  vx: 0,
  vy: 0,
  active: false,
  isDown: false,
  sensitivity: 1
};

const gravityWell = {
  active: false,
  x: 0,
  y: 0,
  charge: 0,
  releaseFlash: 0,
  radius: 0
};

const target = {
  x: 0,
  y: 0,
  radius: 120,
  pulse: 0,
  capturePulse: 0
};

const gameState = {
  experience: "levels",
  difficulty: "normal",
  level: 1,
  capturedCount: 0,
  won: false,
  winTimer: 0
};

const ripples = [];
const particles = [];

const settings = {
  experience: "levels",
  difficulty: "normal",
  mode: "aurora",
  particleCount: 240,
  maxSpeed: 0.78,
  drift: 0.024,
  pointerRadius: 210,
  pointerForce: 0.38,
  orbitStrength: 0.22,
  rippleStrength: 12.5,
  trailAlpha: 0.1,
  bloomBoost: 1.2,
  streakBoost: 1,
  turbulence: 0.9,
  flowStrength: 0.75,
  backdropStrength: 1.15,
  paletteBase: 178,
  hueRange: 145,
  voidBias: 0.02
};

const defaultSettings = { ...settings };
let audioContext;
const modeDefaults = {
  aurora: {
    mode: "aurora",
    particleCount: 240,
    maxSpeed: 0.78,
    drift: 0.024,
    pointerRadius: 210,
    pointerForce: 0.38,
    orbitStrength: 0.22,
    rippleStrength: 12.5,
    trailAlpha: 0.1,
    bloomBoost: 1.2,
    streakBoost: 1,
    turbulence: 0.9,
    flowStrength: 0.75,
    backdropStrength: 1.15,
    paletteBase: 178,
    hueRange: 145,
    voidBias: 0.02
  },
  plasma: {
    mode: "plasma",
    particleCount: 280,
    maxSpeed: 1.18,
    drift: 0.04,
    pointerRadius: 200,
    pointerForce: 0.52,
    orbitStrength: 0.28,
    rippleStrength: 16.5,
    trailAlpha: 0.125,
    bloomBoost: 1.35,
    streakBoost: 1.15,
    turbulence: 1.6,
    flowStrength: 0.95,
    backdropStrength: 1.25,
    paletteBase: 320,
    hueRange: 230,
    voidBias: 0
  },
  warp: {
    mode: "warp",
    particleCount: 220,
    maxSpeed: 1.5,
    drift: 0.032,
    pointerRadius: 180,
    pointerForce: 0.32,
    orbitStrength: 0.14,
    rippleStrength: 18.5,
    trailAlpha: 0.07,
    bloomBoost: 1.18,
    streakBoost: 1.9,
    turbulence: 0.75,
    flowStrength: 0.42,
    backdropStrength: 0.85,
    paletteBase: 210,
    hueRange: 90,
    voidBias: 0
  },
  void: {
    mode: "void",
    particleCount: 150,
    maxSpeed: 0.42,
    drift: 0.012,
    pointerRadius: 240,
    pointerForce: 0.22,
    orbitStrength: 0.16,
    rippleStrength: 9,
    trailAlpha: 0.16,
    bloomBoost: 0.6,
    streakBoost: 0.5,
    turbulence: 0.35,
    flowStrength: 0.28,
    backdropStrength: 0.35,
    paletteBase: 218,
    hueRange: 45,
    voidBias: 0.5
  }
};

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let animationFrame = 0;
let particleTarget = settings.particleCount;
let isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.depth = 0.5 + Math.random() * 1.2;
    this.vx = (Math.random() - 0.5) * settings.maxSpeed * this.depth;
    this.vy = (Math.random() - 0.5) * settings.maxSpeed * this.depth;
    this.baseSize = (Math.random() * 2.5 + 0.9) * (0.7 + this.depth * 0.5);
    this.size = this.baseSize;
    this.hue = (settings.paletteBase + Math.random() * settings.hueRange) % 360;
    this.hueDrift = (Math.random() * 0.8 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
    this.saturation = 72 + Math.random() * (28 - settings.voidBias * 18);
    this.lightness = 42 + this.depth * 11 + Math.random() * 8 - settings.voidBias * 10;
    this.orbitDirection = Math.random() > 0.5 ? 1 : -1;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.captured = false;
    this.captureGlow = 0;

    if (!initial) {
      this.vx *= 0.3;
      this.vy *= 0.3;
    }
  }

  update(time) {
    if (this.captured) {
      this.captureGlow = Math.min(1, this.captureGlow + 0.08);
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      const settle = 0.14 + this.depth * 0.04;
      this.vx += (dx / distance) * settle;
      this.vy += (dy / distance) * settle;
      this.vx *= 0.84;
      this.vy *= 0.84;
      this.x += this.vx;
      this.y += this.vy;

      const maxRadius = Math.max(8, target.radius - this.baseSize * 1.5);
      const centerDistance = Math.hypot(this.x - target.x, this.y - target.y) || 1;

      if (centerDistance > maxRadius) {
        this.x = target.x + ((this.x - target.x) / centerDistance) * maxRadius;
        this.y = target.y + ((this.y - target.y) / centerDistance) * maxRadius;
        this.vx *= 0.2;
        this.vy *= 0.2;
      }

      this.size = this.baseSize * 0.78;
      return;
    }

    const angle = time * 0.001 + this.twinkleOffset;
    const swirl = time * 0.00012 + this.twinkleOffset;
    const depthFactor = 0.65 + this.depth * 0.55;
    const flowX = Math.sin(time * 0.00045 + this.y * 0.006 + this.twinkleOffset) * 0.018 * settings.flowStrength;
    const flowY = Math.cos(time * 0.0004 + this.x * 0.006 + this.twinkleOffset) * 0.018 * settings.flowStrength;
    this.vx += Math.cos(angle * 0.7) * settings.drift * 0.11 * depthFactor;
    this.vy += Math.sin(angle * 0.9) * settings.drift * 0.11 * depthFactor;
    this.vx += Math.cos(swirl + this.y * 0.0025) * 0.012 * depthFactor * settings.turbulence;
    this.vy += Math.sin(swirl + this.x * 0.0025) * 0.012 * depthFactor * settings.turbulence;
    this.vx += flowX;
    this.vy += flowY;

    if (pointer.active) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (distance < settings.pointerRadius) {
        const proximity = 1 - distance / settings.pointerRadius;
        const pullForce = proximity * settings.pointerForce * (0.65 + this.depth * 0.35);
        const tangentX = -dy / distance;
        const tangentY = dx / distance;
        const orbitForce = proximity * settings.orbitStrength * (0.75 + this.depth * 0.3) * this.orbitDirection;

        this.vx += (dx / distance) * pullForce * 0.22;
        this.vy += (dy / distance) * pullForce * 0.22;
        this.vx += tangentX * orbitForce;
        this.vy += tangentY * orbitForce;
        this.vx += pointer.vx * 0.0028 * proximity * pointer.sensitivity;
        this.vy += pointer.vy * 0.0028 * proximity * pointer.sensitivity;
      }
    }

    if (gravityWell.active) {
      const dx = gravityWell.x - this.x;
      const dy = gravityWell.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      const wellRadius = gravityWell.radius;

      if (distance < wellRadius) {
        const pull = (1 - distance / wellRadius) * (0.16 + gravityWell.charge * 0.52) * (0.75 + this.depth * 0.3);
        const tangentX = -dy / distance;
        const tangentY = dx / distance;
        const spin = (0.12 + gravityWell.charge * 0.72) * (0.7 + this.depth * 0.24) * this.orbitDirection;

        this.vx += (dx / distance) * pull;
        this.vy += (dy / distance) * pull;
        this.vx += tangentX * spin;
        this.vy += tangentY * spin;
      }
    }

    for (const ripple of ripples) {
      const dx = this.x - ripple.x;
      const dy = this.y - ripple.y;
      const distance = Math.hypot(dx, dy) || 1;
      const edgeDistance = Math.abs(distance - ripple.radius);

      if (edgeDistance < ripple.band) {
        const pulse = (1 - edgeDistance / ripple.band) * ripple.force;
        const direction = ripple.inward ? -1 : 1;
        this.vx += (dx / distance) * pulse * direction;
        this.vy += (dy / distance) * pulse * direction;
      }
    }

    const targetDx = target.x - this.x;
    const targetDy = target.y - this.y;
    const targetDistance = Math.hypot(targetDx, targetDy) || 1;
    const captureRadius = gameState.experience === "freeplay" ? 0 : target.radius * 1.35;

    if (captureRadius > 0 && targetDistance < captureRadius) {
      const settle = (1 - targetDistance / captureRadius) * (0.06 + this.depth * 0.018);
      this.vx += (targetDx / targetDistance) * settle;
      this.vy += (targetDy / targetDistance) * settle;
      this.vx *= 0.975;
      this.vy *= 0.975;

      const captureThreshold = Math.max(10, target.radius - this.size * 1.35);

      if (targetDistance + this.size <= captureThreshold) {
        this.captured = true;
        triggerCaptureFeedback(this);
      }
    }

    this.vx *= 0.989 - this.depth * 0.002;
    this.vy *= 0.989 - this.depth * 0.002;

    if (target.capturePulse > 0.08) {
      this.vx *= 0.992;
      this.vy *= 0.992;
    }

    const speed = Math.hypot(this.vx, this.vy);
    const maxVelocity = 2.6 + this.depth * 1.8;

    if (speed > maxVelocity) {
      const ratio = maxVelocity / speed;
      this.vx *= ratio;
      this.vy *= ratio;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -20) this.x = width + 20;
    if (this.x > width + 20) this.x = -20;
    if (this.y < -20) this.y = height + 20;
    if (this.y > height + 20) this.y = -20;

    this.size = this.baseSize + (Math.sin(angle * 2.2) + 1) * 0.32 * (0.8 + this.depth * 0.3);
    this.hue = (this.hue + this.hueDrift + Math.sin(angle * 0.8) * 0.35 + 360) % 360;
  }

  draw(time) {
    const color = getParticleColor(this, time);
    const glow = this.size * (10 + this.depth * 4) * settings.bloomBoost;
    const gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, glow);
    gradient.addColorStop(0, withAlpha(color, 1));
    gradient.addColorStop(0.12, withAlpha(color, 0.65));
    gradient.addColorStop(0.35, withAlpha(color, 0.22 + this.depth * 0.04));
    gradient.addColorStop(1, withAlpha(color, 0));

    context.beginPath();
    context.fillStyle = gradient;
    context.arc(this.x, this.y, glow, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.fillStyle = withAlpha(color, 0.98);
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();

    if (this.captured) {
      const captureRadius = this.size * (5 + this.captureGlow * 5);
      const captureGradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, captureRadius);
      captureGradient.addColorStop(0, withAlpha(color, 0.65));
      captureGradient.addColorStop(0.45, withAlpha(color, 0.18));
      captureGradient.addColorStop(1, withAlpha(color, 0));

      context.beginPath();
      context.fillStyle = captureGradient;
      context.arc(this.x, this.y, captureRadius, 0, Math.PI * 2);
      context.fill();
      return;
    }

    const streakX = this.x - this.vx * (12 + this.depth * 6) * settings.streakBoost;
    const streakY = this.y - this.vy * (12 + this.depth * 6) * settings.streakBoost;
    const streak = context.createLinearGradient(this.x, this.y, streakX, streakY);
    streak.addColorStop(0, withAlpha(color, 0.9));
    streak.addColorStop(0.45, withAlpha(color, 0.22));
    streak.addColorStop(1, withAlpha(color, 0));

    context.beginPath();
    context.strokeStyle = streak;
    context.lineWidth = this.size * (1.25 + this.depth * 0.16);
    context.moveTo(this.x, this.y);
    context.lineTo(streakX, streakY);
    context.stroke();
  }
}

function getParticleColor(particle, time) {
  const wave = Math.sin(time * 0.00045 + particle.twinkleOffset * 2 + particle.x * 0.002) * (18 + settings.hueRange * 0.08);
  const hue = (particle.hue + wave + 360) % 360;
  const lightness = particle.lightness + Math.sin(time * 0.0014 + particle.twinkleOffset) * (5 + particle.depth * 2.5);
  return `hsla(${hue}, ${particle.saturation}%, ${Math.max(18, lightness)}%, 1)`;
}

function withAlpha(color, alpha) {
  if (color.startsWith("#")) {
    const value = color.replace("#", "");
    const bigint = Number.parseInt(value, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (color.startsWith("hsla(")) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }

  if (color.startsWith("hsl(")) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  }

  return color;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.5 : 2);
  particleTarget = clampParticleCount(settings.particleCount);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (particles.length < particleTarget) {
    for (let index = particles.length; index < particleTarget; index += 1) {
      particles.push(new Particle());
    }
  }

  if (particles.length > particleTarget) {
    particles.length = particleTarget;
  }
}

function clampParticleCount(value) {
  const areaFactor = isCoarsePointer ? 7000 : 5200;
  const hardCap = isCoarsePointer ? 280 : 360;
  const screenCap = Math.min(hardCap, Math.max(110, Math.floor((width * height) / areaFactor)));
  return Math.min(screenCap, Math.round(value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function placeTarget() {
  target.x = randomRange(width * 0.22, width * 0.78);
  target.y = randomRange(height * 0.22, height * 0.72);
  target.radius = Math.min(width, height) * 0.12;
  target.pulse = 0;
}

function updateGameUi() {
  const isFreePlay = gameState.experience === "freeplay";
  gameUi.mode.textContent = isFreePlay ? "Free Play" : "Levels";
  gameUi.difficulty.textContent = isFreePlay ? "--" : capitalize(gameState.difficulty);
  gameUi.level.textContent = isFreePlay ? "--" : String(gameState.level);
  gameUi.progress.textContent = isFreePlay ? "Cruise" : `${Math.max(0, particles.length - gameState.capturedCount)} / ${particles.length}`;
  gameUi.status.textContent = isFreePlay
    ? "Cruise the field. Hold click to stir a smooth vortex and surf the flow."
    : gameState.won
      ? "Level Complete. The next target is forming..."
      : gameState.difficulty === "hard"
        ? "Hard Mode: no direct particle pull. Guide them patiently into the target."
        : "Normal Mode: click assists can pull particles toward the target.";
}

function updateControlReadout(key, value) {
  const target = document.querySelector(`[data-value-for="${key}"]`);

  if (!target) {
    return;
  }

  if (key === "particleCount") {
    target.textContent = `${Math.round(value)}`;
    return;
  }

  if (key === "mode") {
    target.textContent = value;
    return;
  }

  if (key === "experience") {
    target.textContent = value;
    return;
  }

  if (key === "difficulty") {
    target.textContent = value;
    return;
  }

  target.textContent = Number(value).toFixed(2);
}

function syncControls() {
  controls.experience.value = gameState.experience;
  controls.difficulty.value = gameState.difficulty;
  controls.mode.value = settings.mode;
  controls.particleCount.value = String(Math.round(settings.particleCount));
  controls.speed.value = String(settings.maxSpeed.toFixed(2));
  controls.attraction.value = String(settings.pointerForce.toFixed(2));
  controls.trail.value = String(settings.trailAlpha.toFixed(2));

  updateControlReadout("experience", gameState.experience === "freeplay" ? "Free Play" : "Levels");
  updateControlReadout("difficulty", capitalize(gameState.difficulty));
  updateControlReadout("mode", capitalize(settings.mode));
  updateControlReadout("particleCount", settings.particleCount);
  updateControlReadout("speed", settings.maxSpeed);
  updateControlReadout("attraction", settings.pointerForce);
  updateControlReadout("trail", settings.trailAlpha);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function randomBetween(min, max, decimals = 2) {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(decimals));
}

function applyMode(modeName, skipSync = false) {
  const mode = modeDefaults[modeName];

  if (!mode) {
    return;
  }

  Object.assign(settings, mode);

  for (const particle of particles) {
    particle.reset();
  }

  placeTarget();
  gameState.capturedCount = 0;
  gameState.won = false;
  gameState.winTimer = 0;

  if (!skipSync) {
    syncControls();
  }

  updateGameUi();
  resize();
}

function applyDifficulty() {
  if (gameState.experience !== "levels") {
    target.radius = Math.min(width, height) * 0.13;
    return;
  }

  const difficulty = Math.max(0, gameState.level - 1);
  const hardBias = gameState.difficulty === "hard" ? 1 : 0;
  target.radius = Math.max(
    Math.min(width, height) * 0.05,
    Math.min(width, height) * (0.145 - difficulty * 0.008 - hardBias * 0.012)
  );
  settings.pointerForce = Math.min(0.8, defaultSettings.pointerForce + difficulty * 0.018 - hardBias * 0.05);
  settings.orbitStrength = Math.min(0.36, defaultSettings.orbitStrength + difficulty * 0.008 - hardBias * 0.03);
  settings.rippleStrength = Math.min(22, defaultSettings.rippleStrength + difficulty * 0.75);
  settings.flowStrength = Math.min(1.2, defaultSettings.flowStrength + difficulty * 0.04);
  settings.maxSpeed = Math.min(1.7, defaultSettings.maxSpeed + difficulty * 0.035 + hardBias * 0.06);
  settings.drift = Math.min(0.05, defaultSettings.drift + difficulty * 0.0022 + hardBias * 0.002);
}

function setExperience(nextExperience) {
  gameState.experience = nextExperience;
  settings.experience = nextExperience;
  gameState.level = 1;
  gameState.capturedCount = 0;
  gameState.won = false;
  gameState.winTimer = 0;
  Object.assign(settings, modeDefaults[settings.mode]);
  settings.experience = nextExperience;
  placeTarget();
  applyDifficulty();

  for (const particle of particles) {
    particle.reset();
  }

  ripples.length = 0;
  gravityWell.active = false;
  gravityWell.charge = 0;
  gravityWell.releaseFlash = 0;
  syncControls();
  updateGameUi();
}

function setDifficulty(nextDifficulty) {
  gameState.difficulty = nextDifficulty;
  settings.difficulty = nextDifficulty;
  ripples.length = 0;
  gravityWell.active = false;
  gravityWell.charge = 0;
  gravityWell.releaseFlash = 0;
  applyDifficulty();
  updateGameUi();
  syncControls();
}

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playCaptureSound(intensity) {
  const ctx = getAudioContext();

  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();

  osc.type = "sine";
  mod.type = "triangle";
  osc.frequency.setValueAtTime(520 + intensity * 90, now);
  osc.frequency.exponentialRampToValueAtTime(760 + intensity * 120, now + 0.12);
  mod.frequency.setValueAtTime(14, now);
  modGain.gain.setValueAtTime(18, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.03 + intensity * 0.025, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  mod.connect(modGain);
  modGain.connect(osc.frequency);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  mod.start(now);
  osc.stop(now + 0.2);
  mod.stop(now + 0.2);
}

function triggerCaptureFeedback(particle) {
  target.capturePulse = Math.min(1.4, target.capturePulse + 0.45);
  particle.captureGlow = 0.2;
  particle.vx *= 0.08;
  particle.vy *= 0.08;
  playCaptureSound(0.4 + particle.depth * 0.2);
}

function applyRandomize() {
  const modeKeys = Object.keys(modeDefaults);
  const randomMode = modeKeys[(Math.random() * modeKeys.length) | 0];
  applyMode(randomMode, true);

  settings.particleCount = Math.round(randomBetween(150, 340, 0));
  settings.maxSpeed = randomBetween(0.35, 1.45);
  settings.pointerForce = randomBetween(0.12, 0.78);
  settings.trailAlpha = randomBetween(0.05, 0.2);
  settings.drift = randomBetween(0.012, 0.04, 3);
  settings.pointerRadius = Math.round(randomBetween(150, 260, 0));
  settings.rippleStrength = randomBetween(9.5, 18.5);
  settings.orbitStrength = randomBetween(0.1, 0.34);
  settings.bloomBoost = randomBetween(0.7, 1.5);
  settings.streakBoost = randomBetween(0.6, 2.1);
  settings.turbulence = randomBetween(0.35, 1.75);
  settings.flowStrength = randomBetween(0.25, 1.1);
  settings.backdropStrength = randomBetween(0.35, 1.3);
  settings.experience = gameState.experience;

  for (const particle of particles) {
    particle.hue = (settings.paletteBase + Math.random() * settings.hueRange) % 360;
    particle.hueDrift = (Math.random() * 1 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
    particle.saturation = 70 + Math.random() * 28;
    particle.lightness = 44 + Math.random() * 18;
    particle.vx *= 0.7;
    particle.vy *= 0.7;
  }

  syncControls();
  resize();
}

function applyReset() {
  Object.assign(settings, defaultSettings);
  gameState.experience = defaultSettings.experience;
  gameState.difficulty = defaultSettings.difficulty;
  applyMode(defaultSettings.mode, true);

  for (const particle of particles) {
    particle.reset();
  }

  ripples.length = 0;
  gravityWell.active = false;
  gravityWell.charge = 0;
  gravityWell.releaseFlash = 0;
  gravityWell.radius = 0;
  gameState.level = 1;
  gameState.capturedCount = 0;
  gameState.won = false;
  gameState.winTimer = 0;
  placeTarget();
  applyDifficulty();
  syncControls();
  updateGameUi();
  resize();
}

function togglePanel() {
  const isCollapsed = controls.panel.classList.toggle("is-collapsed");
  controls.toggle.setAttribute("aria-expanded", String(!isCollapsed));
  controls.toggle.textContent = isCollapsed ? "Expand" : "Collapse";
}

function drawBackdrop(time) {
  context.fillStyle = `rgba(2, 3, 3, ${settings.trailAlpha})`;
  context.fillRect(0, 0, width, height);

  const pulse = (0.56 + Math.sin(time * 0.00025) * 0.14) * settings.backdropStrength;
  const hueA = (settings.paletteBase + Math.sin(time * 0.00018) * Math.max(18, settings.hueRange * 0.25) + 360) % 360;
  const hueB = (settings.paletteBase + settings.hueRange * 0.7 + Math.sin(time * 0.00014 + 1.4) * Math.max(12, settings.hueRange * 0.22) + 360) % 360;
  const centerGlow = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    0,
    width * 0.5,
    height * 0.48,
    Math.max(width, height) * 0.55
  );

  centerGlow.addColorStop(0, `hsla(${hueA}, 95%, ${settings.mode === "void" ? 48 : 56}%, ${0.11 * pulse})`);
  centerGlow.addColorStop(0.4, `hsla(${hueB}, 90%, ${settings.mode === "void" ? 42 : 58}%, ${0.05 * pulse})`);
  centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.fillStyle = centerGlow;
  context.fillRect(0, 0, width, height);

  const cornerGlow = context.createRadialGradient(width * 0.18, height * 0.82, 0, width * 0.18, height * 0.82, width * 0.45);
  cornerGlow.addColorStop(0, `hsla(${hueB}, 100%, ${settings.mode === "void" ? 48 : 60}%, ${0.05 * settings.backdropStrength})`);
  cornerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = cornerGlow;
  context.fillRect(0, 0, width, height);

  const veil = context.createRadialGradient(width * 0.72, height * 0.28, 0, width * 0.72, height * 0.28, width * 0.58);
  veil.addColorStop(0, `hsla(${(hueA + 90) % 360}, 100%, ${settings.mode === "void" ? 50 : 62}%, ${0.032 * settings.backdropStrength})`);
  veil.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = veil;
  context.fillRect(0, 0, width, height);
}

function drawPointerAura(time) {
  if (!pointer.active) {
    return;
  }

  const speed = Math.hypot(pointer.vx, pointer.vy);
  const radius = 110 + Math.min(speed * 5, 110);
  const hue = (185 + Math.sin(time * 0.0012) * 70 + speed * 0.4 + 360) % 360;
  const aura = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
  aura.addColorStop(0, `hsla(${hue}, 100%, 68%, 0.26)`);
  aura.addColorStop(0.3, `hsla(${(hue + 40) % 360}, 100%, 64%, 0.14)`);
  aura.addColorStop(0.58, `hsla(${(hue + 90) % 360}, 100%, 62%, 0.08)`);
  aura.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.beginPath();
  context.fillStyle = aura;
  context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawTarget(time) {
  const pulse = 1 + Math.sin(time * 0.003 + target.pulse) * 0.06;
  target.capturePulse *= 0.9;
  const outerRadius = target.radius * 1.18 * pulse;
  const innerRadius = target.radius * 0.66;
  const hue = (settings.paletteBase + 120 + Math.sin(time * 0.0012) * 20 + 360) % 360;
  const flashRadius = outerRadius * (1 + target.capturePulse * 0.35);
  const glow = context.createRadialGradient(target.x, target.y, innerRadius * 0.2, target.x, target.y, flashRadius * 1.3);
  glow.addColorStop(0, `hsla(${hue}, 100%, 74%, ${0.18 + target.capturePulse * 0.1})`);
  glow.addColorStop(0.45, `hsla(${(hue + 60) % 360}, 100%, 66%, ${0.08 + target.capturePulse * 0.08})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.beginPath();
  context.fillStyle = glow;
  context.arc(target.x, target.y, outerRadius * 1.3, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.lineWidth = 3 + target.capturePulse * 1.4;
  context.strokeStyle = `hsla(${hue}, 100%, 78%, 0.92)`;
  context.shadowBlur = 24 + target.capturePulse * 16;
  context.shadowColor = `hsla(${hue}, 100%, 72%, 0.7)`;
  context.arc(target.x, target.y, flashRadius, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.lineWidth = 1.2;
  context.strokeStyle = `hsla(${(hue + 70) % 360}, 100%, 80%, 0.55)`;
  context.arc(target.x, target.y, innerRadius, 0, Math.PI * 2);
  context.stroke();
  context.shadowBlur = 0;
}

function updateGravityWell() {
  if (gravityWell.active) {
    gravityWell.charge = Math.min(1, gravityWell.charge + 0.018);
    gravityWell.radius = 110 + gravityWell.charge * 180;
    gravityWell.x = pointer.x;
    gravityWell.y = pointer.y;
  } else {
    gravityWell.charge *= 0.92;
    gravityWell.releaseFlash *= 0.9;
  }
}

function drawGravityWell(time) {
  if (!gravityWell.active && gravityWell.releaseFlash < 0.02) {
    return;
  }

  const baseRadius = gravityWell.active ? gravityWell.radius : 120 + gravityWell.releaseFlash * 120;
  const hue = (settings.paletteBase + 220 + Math.sin(time * 0.003) * 35 + 360) % 360;
  const core = context.createRadialGradient(gravityWell.x, gravityWell.y, 0, gravityWell.x, gravityWell.y, baseRadius);
  const alpha = gravityWell.active ? 0.18 + gravityWell.charge * 0.2 : gravityWell.releaseFlash * 0.18;

  core.addColorStop(0, `hsla(${hue}, 100%, 70%, ${alpha})`);
  core.addColorStop(0.28, `hsla(${(hue + 55) % 360}, 100%, 60%, ${alpha * 0.6})`);
  core.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.beginPath();
  context.fillStyle = core;
  context.arc(gravityWell.x, gravityWell.y, baseRadius, 0, Math.PI * 2);
  context.fill();

  const rings = gravityWell.active ? 2 : 1;
  context.shadowBlur = gravityWell.active ? 28 : 18;
  context.shadowColor = `hsla(${hue}, 100%, 70%, 0.7)`;

  for (let index = 0; index < rings; index += 1) {
    const radius = baseRadius * (0.22 + index * 0.24) + Math.sin(time * 0.01 + index) * 6;
    context.beginPath();
    context.lineWidth = gravityWell.active ? 1.6 : 2.2;
    context.strokeStyle = `hsla(${(hue + index * 55) % 360}, 100%, 72%, ${alpha * (0.8 - index * 0.22)})`;
    context.arc(gravityWell.x, gravityWell.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.shadowBlur = 0;
}

function updateRipples() {
  for (let index = ripples.length - 1; index >= 0; index -= 1) {
    const ripple = ripples[index];
    ripple.radius += ripple.speed;
    ripple.speed *= 0.995;
    ripple.force *= 0.987;
    ripple.alpha *= 0.988;

    if (ripple.radius > ripple.maxRadius || ripple.alpha < 0.02) {
      ripples.splice(index, 1);
    }
  }
}

function updateGameState() {
  if (gameState.experience === "freeplay") {
    gameState.capturedCount = 0;
    gameState.won = false;
    gameState.winTimer = 0;
    updateGameUi();
    return;
  }

  let captured = 0;

  for (const particle of particles) {
    if (particle.captured) {
      captured += 1;
    }
  }

  gameState.capturedCount = captured;

  if (!gameState.won && captured === particles.length && particles.length > 0) {
    gameState.won = true;
    gameState.winTimer = 105;
    ripples.push({
      x: target.x,
      y: target.y,
      radius: 0,
      speed: 14,
      band: 150,
      force: settings.rippleStrength * 1.3,
      alpha: 1,
      maxRadius: Math.max(width, height),
      hue: (settings.paletteBase + 100) % 360
    });
  }

  if (gameState.won) {
    gameState.winTimer -= 1;

    if (gameState.winTimer <= 0) {
      gameState.level += 1;
      gameState.won = false;
      target.pulse = Math.random() * Math.PI * 2;
      placeTarget();
      applyDifficulty();

      for (const particle of particles) {
        particle.reset();
      }
    }
  }

  updateGameUi();
}

function drawRipples(time) {
  for (const ripple of ripples) {
    const hue = (ripple.hue + time * 0.03) % 360;
    const fill = context.createRadialGradient(ripple.x, ripple.y, ripple.radius * 0.1, ripple.x, ripple.y, ripple.radius * 1.3);
    fill.addColorStop(0, `hsla(${hue}, 100%, 72%, ${ripple.alpha * 0.07})`);
    fill.addColorStop(0.4, `hsla(${(hue + 70) % 360}, 100%, 68%, ${ripple.alpha * 0.03})`);
    fill.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.beginPath();
    context.fillStyle = fill;
    context.arc(ripple.x, ripple.y, ripple.radius * 1.3, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.lineWidth = 2.8;
    context.strokeStyle = `hsla(${hue}, 100%, 70%, ${ripple.alpha})`;
    context.shadowBlur = 44;
    context.shadowColor = `hsla(${hue}, 100%, 70%, 0.95)`;
    context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.strokeStyle = `hsla(${(hue + 80) % 360}, 100%, 68%, ${ripple.alpha * 0.5})`;
    context.arc(ripple.x, ripple.y, ripple.radius * 0.76, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.strokeStyle = `hsla(${(hue + 160) % 360}, 100%, 72%, ${ripple.alpha * 0.26})`;
    context.arc(ripple.x, ripple.y, ripple.radius * 1.18, 0, Math.PI * 2);
    context.stroke();
  }

  context.shadowBlur = 0;
}

function animate(time) {
  drawBackdrop(time);
  drawTarget(time);
  drawPointerAura(time);
  updateGravityWell();
  drawGravityWell(time);
  updateRipples();
  drawRipples(time);
  updateGameState();

  context.globalCompositeOperation = "lighter";

  for (const particle of particles) {
    particle.update(time);
    particle.draw(time);
  }

  context.globalCompositeOperation = "source-over";
  animationFrame = window.requestAnimationFrame(animate);
}

function updatePointerPosition(event) {
  pointer.previousX = pointer.x;
  pointer.previousY = pointer.y;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.sensitivity = event.pointerType === "touch" ? 1.85 : 1;
  pointer.vx = (pointer.x - pointer.previousX) * pointer.sensitivity;
  pointer.vy = (pointer.y - pointer.previousY) * pointer.sensitivity;
  pointer.active = true;
}

function createRipple(x, y) {
  const targetDx = target.x - x;
  const targetDy = target.y - y;
  const nearTarget = gameState.experience === "levels" && Math.hypot(targetDx, targetDy) < target.radius * 2.4;
  const directAssist = gameState.experience === "levels" && gameState.difficulty === "normal";

  ripples.push({
    x,
    y,
    radius: 0,
    speed: 17,
    band: 135,
    force: settings.rippleStrength * 1.08,
    alpha: 0.95,
    maxRadius: Math.max(width, height) * 1.12,
    hue: (settings.paletteBase + Math.random() * settings.hueRange) % 360,
    inward: nearTarget
  });

  for (let burst = 0; burst < 58; burst += 1) {
    const particle = particles[(Math.random() * particles.length) | 0];
    if (particle.captured) {
      continue;
    }

    const angle = (Math.PI * 2 * burst) / 58;
    const power = (2.4 + Math.random() * 3.2) * (0.75 + particle.depth * 0.4);

    if (nearTarget) {
      const dx = target.x - particle.x;
      const dy = target.y - particle.y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = (1.1 + Math.random() * 1.8) * (distance < target.radius * 1.2 ? 0.18 : 1);
      particle.vx += (dx / distance) * pull;
      particle.vy += (dy / distance) * pull;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    } else if (directAssist) {
      const dx = x - particle.x;
      const dy = y - particle.y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = Math.max(0, 1 - distance / (Math.min(width, height) * 0.38)) * (1.2 + particle.depth * 0.55);
      particle.vx += (dx / distance) * pull;
      particle.vy += (dy / distance) * pull;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
    } else {
      particle.vx += Math.cos(angle) * power;
      particle.vy += Math.sin(angle) * power;
    }

    particle.hue = (particle.hue + 40 + Math.random() * 160) % 360;
  }
}

function releaseGravityWell() {
  if (!gravityWell.active && gravityWell.charge < 0.04) {
    return;
  }

  const charge = Math.max(0.15, gravityWell.charge);
  createRipple(gravityWell.x, gravityWell.y);
  gravityWell.releaseFlash = charge;

  for (let burst = 0; burst < particles.length; burst += 1) {
    const particle = particles[burst];
    if (particle.captured) {
      continue;
    }

    const dx = particle.x - gravityWell.x;
    const dy = particle.y - gravityWell.y;
    const distance = Math.hypot(dx, dy) || 1;
    const influenceRadius = 140 + charge * 220;

    if (distance < influenceRadius) {
      const force = (1 - distance / influenceRadius) * (2.4 + charge * 6.8) * (0.7 + particle.depth * 0.35);
      particle.vx += (dx / distance) * force;
      particle.vy += (dy / distance) * force;
      particle.hue = (settings.paletteBase + settings.hueRange * 0.5 + Math.random() * 80) % 360;
    }
  }

  gravityWell.active = false;
  gravityWell.charge = 0;
  gravityWell.radius = 0;
}

controls.particleCount.addEventListener("input", (event) => {
  settings.particleCount = Number(event.target.value);
  updateControlReadout("particleCount", settings.particleCount);
  resize();
});

controls.speed.addEventListener("input", (event) => {
  settings.maxSpeed = Number(event.target.value);
  settings.drift = Math.max(0.01, settings.maxSpeed * 0.03);
  settings.rippleStrength = 8 + settings.maxSpeed * 6;
  settings.orbitStrength = 0.12 + settings.maxSpeed * 0.13;
  updateControlReadout("speed", settings.maxSpeed);
});

controls.attraction.addEventListener("input", (event) => {
  settings.pointerForce = Number(event.target.value);
  settings.pointerRadius = 150 + settings.pointerForce * 170;
  settings.orbitStrength = 0.1 + settings.pointerForce * 0.32;
  updateControlReadout("attraction", settings.pointerForce);
});

controls.trail.addEventListener("input", (event) => {
  settings.trailAlpha = Number(event.target.value);
  updateControlReadout("trail", settings.trailAlpha);
});

controls.experience.addEventListener("change", (event) => {
  setExperience(event.target.value);
});

controls.difficulty.addEventListener("change", (event) => {
  setDifficulty(event.target.value);
});

controls.mode.addEventListener("change", (event) => {
  applyMode(event.target.value);
});

controls.randomize.addEventListener("click", () => {
  applyRandomize();
});

controls.reset.addEventListener("click", () => {
  applyReset();
});

controls.toggle.addEventListener("click", () => {
  togglePanel();
});

window.addEventListener("resize", resize);

window.addEventListener("pointermove", (event) => {
  updatePointerPosition(event);
});

window.addEventListener("pointerdown", (event) => {
  updatePointerPosition(event);
  pointer.isDown = true;
  gravityWell.active = true;
  gravityWell.x = event.clientX;
  gravityWell.y = event.clientY;
  gravityWell.releaseFlash = 0;
});

window.addEventListener("pointerup", (event) => {
  updatePointerPosition(event);
  pointer.isDown = false;
  releaseGravityWell();
});

window.addEventListener("pointercancel", () => {
  pointer.isDown = false;
  releaseGravityWell();
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
  pointer.isDown = false;
  gravityWell.active = false;
});

resize();
placeTarget();
applyDifficulty();
syncControls();
updateGameUi();
context.fillStyle = "#020303";
context.fillRect(0, 0, width, height);
cancelAnimationFrame(animationFrame);
animate(0);
