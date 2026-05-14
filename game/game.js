/* ===== GAME ENGINE ===== */

// ============================================================
// STATE
// ============================================================
const GameState = {
  playerName: 'Капитан',
  boatHull: 100,
  sails: 100,
  supplies: 100,
  water: 100,
  fuel: 100,
  crewMorale: 70,
  weather: 'штиль',
  windSpeed: 5,
  day: 1,
  location: 'Порт отправления',
  inventory: [],
  flags: {},     // story flags
  history: [],   // visited scenes
  currentScene: null,
  stats: { choicesMade: 0 },
  saveSlots: 3,
};

// ============================================================
// CANVAS — Ocean waves animation
// ============================================================
const Ocean = {
  canvas: null,
  ctx: null,
  animId: null,

  init() {
    this.canvas = document.getElementById('ocean-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.draw();
  },

  resize() {
    this.canvas.width = this.canvas.offsetWidth || window.innerWidth;
    this.canvas.height = this.canvas.offsetHeight || window.innerHeight;
  },

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = Date.now() / 1000;

    ctx.clearRect(0, 0, w, h);

    // Dark gradient sky
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    sky.addColorStop(0, '#0a0e1a');
    sky.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = (Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * w;
      const sy = (Math.sin(i * 269.5 + 183.3) * 0.5 + 0.5) * h * 0.35;
      const size = (Math.sin(i * 73.7 + 222.2) * 0.5 + 0.5) * 1.5 + 0.5;
      const twinkle = Math.sin(t * 2 + i * 7.1) * 0.5 + 0.5;
      ctx.globalAlpha = 0.2 + twinkle * 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon
    const moonX = w * 0.8;
    const moonY = h * 0.12;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 5, moonX, moonY, 60);
    moonGlow.addColorStop(0, 'rgba(200,210,230,0.15)');
    moonGlow.addColorStop(1, 'rgba(200,210,230,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 60, moonY - 60, 120, 120);

    ctx.fillStyle = 'rgba(200,210,230,0.6)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Ocean waves
    const waveCount = 5;
    for (let wv = 0; wv < waveCount; wv++) {
      ctx.beginPath();
      const waveHeight = 12 + wv * 3;
      const speed = 0.3 + wv * 0.05;
      const freq = 0.008 + wv * 0.001;
      const phase = wv * 1.5;
      const yBase = h * 0.4 + wv * (h * 0.12);

      ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 5) {
        const y = yBase + Math.sin(x * freq + t * speed + phase) * waveHeight
                 + Math.sin(x * freq * 0.5 + t * 0.2 + phase) * waveHeight * 0.5;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();

      const alpha = 0.08 + wv * 0.03;
      const gradient = ctx.createLinearGradient(0, yBase, 0, h);
      gradient.addColorStop(0, `rgba(0, 100, 148, ${alpha})`);
      gradient.addColorStop(1, `rgba(0, 40, 80, ${alpha * 2})`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Moon reflection on water
    ctx.fillStyle = 'rgba(200,210,230,0.04)';
    for (let i = 0; i < 8; i++) {
      const rx = moonX + Math.sin(t * 2 + i) * 20;
      const ry = h * 0.42 + i * 8;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 15 - i, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.animId = requestAnimationFrame(() => this.draw());
  },

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
};

// ============================================================
// TYPEWRITER
// ============================================================
const Typewriter = {
  element: null,
  fullText: '',
  index: 0,
  speed: 25,
  callback: null,
  timer: null,
  skipRequested: false,

  start(el, text, speed = 25, cb = null) {
    this.element = el;
    this.fullText = text;
    this.index = 0;
    this.speed = speed;
    this.callback = cb;
    this.skipRequested = false;
    el.innerHTML = '';
    this.type();
  },

  type() {
    if (this.skipRequested) {
      this.element.innerHTML = this.fullText + '<span class="cursor"></span>';
      this.index = this.fullText.length;
      if (this.callback) this.callback();
      return;
    }

    if (this.index < this.fullText.length) {
      const char = this.fullText[this.index];
      this.element.innerHTML += char === '\n' ? '<br>' : char;
      this.index++;
      this.timer = setTimeout(() => this.type(), this.speed);
    } else {
      this.element.innerHTML += '<span class="cursor"></span>';
      if (this.callback) this.callback();
    }
  },

  skip() {
    this.skipRequested = true;
    if (this.timer) clearTimeout(this.timer);
  }
};

// ============================================================
// GAME CONTROLLER
// ============================================================
const Game = {
  currentScene: null,

  start() {
    Ocean.init();
    GameState.currentScene = 'prolog';
    GameState.history = [];
    this.showScene('prolog');
  },

  showScene(sceneId) {
    const scene = Scenes[sceneId];
    if (!scene) {
      console.error('Scene not found:', sceneId);
      return;
    }

    GameState.currentScene = sceneId;
    GameState.history.push(sceneId);

    // Run onEnter
    if (scene.onEnter) scene.onEnter(GameState);

    // Update status
    this.updateStatus();

    // Set character name
    document.getElementById('character-name').textContent =
      scene.character || 'Повествователь';

    // Disable choices during typing
    this.disableChoices();

    // Type text
    const textEl = document.getElementById('story-text');
    Typewriter.start(textEl, scene.text, 25, () => {
      this.showChoices(scene.choices || []);
    });

    // Click to skip / advance
    textEl.onclick = () => {
      if (Typewriter.skipRequested) return;
      Typewriter.skip();
    };
  },

  showChoices(choices) {
    const container = document.getElementById('choices-container');
    container.innerHTML = '';

    if (choices.length === 0) return;

    const filtered = choices.filter(c => {
      if (c.condition && !c.condition(GameState)) return false;
      return true;
    });

    if (filtered.length === 0) {
      // Auto-advance
      if (choices[0].nextScene) {
        setTimeout(() => this.showScene(choices[0].nextScene), 500);
      }
      return;
    }

    filtered.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.onclick = () => {
        if (btn.disabled) return;
        this.disableChoices();

        // Apply effects
        if (choice.effect) choice.effect(GameState);
        GameState.stats.choicesMade++;

        // Next scene
        if (choice.nextScene) {
          if (choice.transition) {
            // Fade transition
            document.getElementById('story-container').style.opacity = '0';
            setTimeout(() => {
              document.getElementById('story-container').style.opacity = '1';
              this.showScene(choice.nextScene);
            }, 300);
          } else {
            this.showScene(choice.nextScene);
          }
        }
      };
      container.appendChild(btn);
    });
  },

  disableChoices() {
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  },

  updateStatus() {
    const s = GameState;
    document.getElementById('boat-status').textContent = Math.round(s.boatHull) + '%';
    document.getElementById('supplies-status').textContent = Math.round(s.supplies) + '%';
    document.getElementById('water-status').textContent = Math.round(s.water) + '%';
    document.getElementById('weather-status').textContent = s.weather || 'штиль';
  },

  // === SAVE / LOAD ===
  saveToSlot(slot) {
    const data = JSON.stringify({
      state: GameState,
      scene: GameState.currentScene,
      date: new Date().toISOString()
    });
    localStorage.setItem('sailor_save_' + slot, data);
  },

  loadFromSlot(slot) {
    const data = localStorage.getItem('sailor_save_' + slot);
    if (!data) return null;
    return JSON.parse(data);
  },

  // === EFFECT HELPERS ===
  effect: {
    changeBoat(amount) {
      GameState.boatHull = Math.max(0, Math.min(100, GameState.boatHull + amount));
    },
    changeSupplies(amount) {
      GameState.supplies = Math.max(0, Math.min(100, GameState.supplies + amount));
    },
    changeWater(amount) {
      GameState.water = Math.max(0, Math.min(100, GameState.water + amount));
    },
    changeMorale(amount) {
      GameState.crewMorale = Math.max(0, Math.min(100, GameState.crewMorale + amount));
    },
    addItem(item) {
      if (!GameState.inventory.includes(item)) {
        GameState.inventory.push(item);
      }
    },
    removeItem(item) {
      GameState.inventory = GameState.inventory.filter(i => i !== item);
    },
    setFlag(flag, value = true) {
      GameState.flags[flag] = value;
    },
    setWeather(weather) {
      GameState.weather = weather;
    },
    advanceDay(n = 1) {
      GameState.day += n;
    },
    setLocation(loc) {
      GameState.location = loc;
    },
  },
};
