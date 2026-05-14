/* ===== GAME ENGINE — Flash Edition ===== */

// ============================================================
// STATE
// ============================================================
const GameState = {
  playerName: 'Капитан',
  sceneHistory: [],
  currentSceneId: null,
  boatHull: 100,
  supplies: 100,
  water: 100,
  morale: 75,
  weather: 'штиль',
  location: 'Порт Адриатика',
  day: 1,
  flags: {},
  inventory: [],
};

// ============================================================
// SAVE / LOAD
// ============================================================
const Storage = {
  save(slot = 1) {
    try {
      const data = JSON.stringify({ ...GameState, _ts: Date.now() });
      localStorage.setItem(`flash_save_${slot}`, data);
      FlashUI.toast('💾 Сохранено!');
    } catch (e) {
      FlashUI.toast('❌ Ошибка сохранения');
    }
  },
  load(slot = 1) {
    try {
      const raw = localStorage.getItem(`flash_save_${slot}`);
      if (!raw) { FlashUI.toast('📂 Слот пуст'); return false; }
      const data = JSON.parse(raw);
      Object.assign(GameState, data);
      delete GameState._ts;
      FlashUI.toast('📂 Загружено!');
      return true;
    } catch (e) {
      FlashUI.toast('❌ Ошибка загрузки');
      return false;
    }
  },
  listSlots() {
    return [1, 2, 3].map(s => {
      const raw = localStorage.getItem(`flash_save_${s}`);
      return raw ? { slot: s, data: JSON.parse(raw) } : null;
    });
  },
};

// ============================================================
// Fx — PARTICLE SYSTEM (Flash-style)
// ============================================================
const Fx = {
  particles: [],
  running: false,
  canvas: null,
  ctx: null,

  init() {
    this.canvas = document.getElementById('fx-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.running = true;
    this.loop();
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  loop() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Spawn new particles based on weather
    const maxP = 80;
    if (this.particles.length < maxP) {
      const count = Math.min(3, maxP - this.particles.length);
      for (let i = 0; i < count; i++) this.spawn();
    }

    // Update & draw
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.alpha = Math.min(1, p.life / p.maxLife * 2);

      if (p.life <= 0) return false;

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha * 0.6;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.glow;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      return true;
    });

    requestAnimationFrame(() => this.loop());
  },

  spawn() {
    const w = this.canvas.width, h = this.canvas.height;
    const types = [
      // sparkles
      () => ({
        x: Math.random() * w, y: Math.random() * h * 0.3,
        vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2 + 0.1,
        size: Math.random() * 2 + 1, color: '#ffe88a', glow: '#ffd700',
        life: 200 + Math.random() * 200, maxLife: 400, decay: 0.003 + Math.random() * 0.003,
      }),
      // bubbles
      () => ({
        x: Math.random() * w, y: h + 20,
        vx: (Math.random() - 0.5) * 0.2, vy: -(Math.random() * 0.5 + 0.2),
        size: Math.random() * 4 + 2, color: '#aad4ff', glow: '#7bb8ff',
        life: 300 + Math.random() * 200, maxLife: 500, decay: 0.002,
      }),
      // fog wisps
      () => ({
        x: Math.random() * w, y: h * 0.3 + Math.random() * h * 0.4,
        vx: Math.random() * 0.5 + 0.1, vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 30 + 15, color: 'rgba(255,255,255,0.03)',
        glow: '#88ccff',
        life: 400 + Math.random() * 300, maxLife: 700, decay: 0.0015,
      }),
    ];
    const spawner = types[Math.floor(Math.random() * types.length)];
    this.particles.push(spawner());
  },

  setWeather(weather) {
    // Change particle behavior based on weather
    this.particles = [];
  },

  stop() { this.running = false; },
};

// ============================================================
// TRANSITIONS (Flash-style fade)
// ============================================================
const Transition = {
  overlay: null,
  callback: null,

  init() {
    this.overlay = document.getElementById('transition-overlay');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'transition-overlay';
      document.body.appendChild(this.overlay);
    }
  },

  fadeOut(duration = 400, callback) {
    this.overlay.style.transition = `opacity ${duration}ms ease`;
    this.overlay.style.opacity = '1';
    this.callback = callback;
    setTimeout(() => {
      if (callback) callback();
      setTimeout(() => this.fadeIn(duration), 100);
    }, duration);
  },

  fadeIn(duration = 400) {
    this.overlay.style.transition = `opacity ${duration}ms ease`;
    this.overlay.style.opacity = '0';
  },
};

// ============================================================
// TYPEWRITER (with cursor flash)
// ============================================================
const Typewriter = {
  element: null,
  text: '',
  index: 0,
  speed: 25,
  callback: null,
  timeout: null,
  skipRequested: false,

  start(el, text, speed = 25, cb) {
    this.element = el;
    this.text = text;
    this.index = 0;
    this.speed = speed;
    this.callback = cb || null;
    this.skipRequested = false;
    this.element.innerHTML = '<span class="cursor-blink">|</span>';
    this.element.classList.remove('type-done');
    this.type();
  },

  type() {
    if (this.skipRequested || this.index >= this.text.length) {
      this.element.innerHTML = this.text.replace(/\n/g, '<br>');
      this.element.classList.add('type-done');
      if (this.callback) this.callback();
      return;
    }

    this.index += this.skipRequested ? 10 : 1;
    const shown = this.text.substring(0, this.index);
    const cursor = this.index < this.text.length ? '<span class="cursor-blink">|</span>' : '';
    this.element.innerHTML = shown.replace(/\n/g, '<br>') + cursor;

    this.timeout = setTimeout(() => this.type(), this.speed);
  },

  skip() {
    this.skipRequested = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    // Finish immediately
    this.element.innerHTML = this.text.replace(/\n/g, '<br>');
    this.element.classList.add('type-done');
    if (this.callback) this.callback();
  },
};

// ============================================================
// CHARACTER FLOAT (Flash-style portrait animation)
// ============================================================
const CharacterAnim = {
  el: null,

  show(name, emoji) {
    this.el = document.getElementById('character-portrait');
    if (!this.el) return;
    this.el.innerHTML = `<div class="char-float">${emoji || '🧑'}</div><div class="char-name">${name}</div>`;
    this.el.style.display = 'flex';
    // Re-trigger float animation
    const float = this.el.querySelector('.char-float');
    if (float) {
      float.style.animation = 'none';
      void float.offsetHeight;
      float.style.animation = 'charFloat 2s ease-in-out infinite';
    }
  },

  hide() {
    if (this.el) this.el.style.display = 'none';
  },
};

// ============================================================
// EFFECT HELPERS
// ============================================================
const effect = {
  setWeather(w) {
    GameState.weather = w;
  },
  setLocation(l) {
    GameState.location = l;
  },
  changeBoat(a) {
    GameState.boatHull = Math.max(0, Math.min(100, GameState.boatHull + a));
  },
  changeSupplies(a) {
    GameState.supplies = Math.max(0, Math.min(100, GameState.supplies + a));
  },
  changeWater(a) {
    GameState.water = Math.max(0, Math.min(100, GameState.water + a));
  },
  changeMorale(a) {
    GameState.morale = Math.max(0, Math.min(100, GameState.morale + a));
  },
  changeDay(a) {
    GameState.day = Math.max(1, GameState.day + a);
  },
  setFlag(name, val = true) {
    GameState.flags[name] = val;
  },
  addItem(name) {
    if (!GameState.inventory.includes(name)) GameState.inventory.push(name);
  },
  removeItem(name) {
    GameState.inventory = GameState.inventory.filter(i => i !== name);
  },
};

// ============================================================
// FLASH UI
// ============================================================
const FlashUI = {
  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  },

  updateStatus() {
    const s = GameState;
    const bar = (v, max = 100) => Math.round((v / max) * 100);
    const set = (id, v, icon, color) => {
      const el = document.getElementById(id);
      if (!el) return;
      const pct = bar(v);
      el.innerHTML = `${icon} ${pct}%`;
      el.className = `stat-val ${pct > 50 ? 'good' : pct > 25 ? 'warn' : 'danger'}`;
    };
    set('stat-boat', s.boatHull, '⛵');
    set('stat-food', s.supplies, '🍞');
    set('stat-water', s.water, '💧');
    document.getElementById('stat-day').textContent = `📅 День ${s.day}`;
    document.getElementById('stat-loc').textContent = `📍 ${s.location}`;
    document.getElementById('stat-weather').textContent = `🌊 ${s.weather}`;
  },

  showInventory() {
    const modal = document.getElementById('inv-modal');
    const list = document.getElementById('inv-list');
    if (!modal || !list) return;
    if (GameState.inventory.length === 0) {
      list.innerHTML = '<div class="inv-empty">🎒 Пусто</div>';
    } else {
      list.innerHTML = GameState.inventory.map(i => `<div class="inv-item">• ${i}</div>`).join('');
    }
    modal.style.display = 'flex';
  },

  hideInventory() {
    const modal = document.getElementById('inv-modal');
    if (modal) modal.style.display = 'none';
  },

  showSaveMenu() {
    const modal = document.getElementById('save-modal');
    const slots = document.getElementById('save-slots');
    if (!modal || !slots) return;

    const list = Storage.listSlots();
    slots.innerHTML = [1, 2, 3].map(slot => {
      const saved = list.find(l => l && l.slot === slot);
      const info = saved ? `📅 День ${saved.data.day} • ${saved.data.location}` : '— пусто —';
      return `
        <div class="save-slot">
          <span>Слот ${slot}: ${info}</span>
          <div class="save-actions">
            <button class="btn-sm" data-action="save" data-slot="${slot}">💾</button>
            <button class="btn-sm" data-action="load" data-slot="${slot}">📂</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind events
    slots.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.dataset.slot);
        if (btn.dataset.action === 'save') {
          Storage.save(slot);
        } else {
          if (Storage.load(slot)) {
            FlashUI.hideSaveMenu();
            Game.showScene(GameState.currentSceneId);
            FlashUI.updateStatus();
          }
        }
      });
    });

    modal.style.display = 'flex';
  },

  hideSaveMenu() {
    const modal = document.getElementById('save-modal');
    if (modal) modal.style.display = 'none';
  },
};

// ============================================================
// GAME ENGINE
// ============================================================
const Game = {
  init() {
    // Init systems
    Fx.init();
    Transition.init();

    // Bind UI events
    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-load').addEventListener('click', () => {
      FlashUI.showSaveMenu();
    });
    document.getElementById('btn-inv').addEventListener('click', () => FlashUI.showInventory());
    document.getElementById('btn-save').addEventListener('click', () => FlashUI.showSaveMenu());
    document.getElementById('btn-restart').addEventListener('click', () => {
      if (confirm('Начать заново?')) this.reset();
    });
    document.getElementById('btn-close-inv').addEventListener('click', () => FlashUI.hideInventory());
    document.getElementById('btn-close-save').addEventListener('click', () => FlashUI.hideSaveMenu());
    document.getElementById('inv-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) FlashUI.hideInventory();
    });
    document.getElementById('save-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) FlashUI.hideSaveMenu();
    });

    // Click to advance text
    document.getElementById('story-text').addEventListener('click', () => Typewriter.skip());

    // Resize
    window.addEventListener('resize', () => Fx.resize());

    // Check for saved game
    const hasSave = Storage.listSlots().some(s => s !== null);
    document.getElementById('btn-load').style.display = hasSave ? '' : 'none';
  },

  start() {
    Transition.fadeOut(300, () => {
      // Switch screens
      document.getElementById('title-screen').classList.remove('active');
      document.getElementById('title-screen').style.display = 'none';
      document.getElementById('game-screen').classList.add('active');
      document.getElementById('game-screen').style.display = '';

      // Reset state
      this.resetState();

      // Show first scene
      this.showScene('prolog');
    });
  },

  resetState() {
    GameState.boatHull = 100;
    GameState.supplies = 100;
    GameState.water = 100;
    GameState.morale = 75;
    GameState.weather = 'штиль';
    GameState.location = 'Порт Адриатика';
    GameState.day = 1;
    GameState.flags = {};
    GameState.inventory = [];
    GameState.sceneHistory = [];
    GameState.currentSceneId = null;
  },

  reset() {
    if (Storage.listSlots().some(s => s !== null)) {
      localStorage.clear();
    }
    this.resetState();
    this.showScene('prolog');
    FlashUI.toast('🔄 Игра сброшена');
  },

  showScene(sceneId) {
    const scene = Scenes[sceneId];
    if (!scene) {
      console.error(`Scene not found: ${sceneId}`);
      return;
    }

    GameState.sceneHistory.push(sceneId);
    GameState.currentSceneId = sceneId;

    // Run onEnter effects
    if (scene.onEnter) scene.onEnter(GameState);

    // Update status
    FlashUI.updateStatus();

    // Set character portrait
    const name = scene.character || '';
    const emojiMap = { '📜 Пролог': '🧭', '🗺️ Карта': '🗺️', '⚓ Кок Степан': '👨‍🍳',
      '👥 Старший помощник Михаил': '🧔', '🤝 Незнакомец': '🧑‍🦰',
      '📯 Капитан Ветров': '🧑‍✈️', '🏪 Портовая лавка': '🧓',
      '🚢 «Морской Феникс»': '⛵', '🌊 Штормовой пролив': '🌊',
      '🚣 Спасательная операция': '🚣', '🌅 После шторма': '🌅',
      '🌴 Южное побережье': '🌴', '🔥 Горящее судно': '🔥',
      '📦 Шкатулка': '📦', '🥀 Обход': '🌫️', '⚓ Продолжение пути': '⛵',
      '🪨 Лабиринт Рифов': '🪸', '🏝️ Остров-Страж': '🏝️',
      '🏛️ Древние руины': '🏛️', '🌴 Джунгли': '🌴',
      '💠 Алтарь': '💠', '🕯️ Подземелье': '🕯️',
      '✨ Контакт': '✨', '🌟 Древний': '🧝',
      '⚔️ Миссия принята': '🛡️', '🔍 Обыск руин': '🔍',
      '📖 Елена': '🧑‍🦰', '💧 Остров Воды': '💧',
      '🏴‍☠️ Тревога!': '🏴‍☠️', '💣 Морской бой': '💣',
      '💨 Погоня': '💨', '⛵ Продолжение пути': '⛵',
      '🔍 Обломки': '🔍', '⛵ Подготовка': '⛵',
      '🔧 Ремонт': '🔧', '⭐ Ночная навигация': '⭐',
      '🤝 Переговоры': '🤝', '📜 Фрески': '📜',
    };
    const emoji = emojiMap[name] || '🧑';
    CharacterAnim.show(name, emoji);

    // Show scene text with transition
    const textEl = document.getElementById('story-text');
    const choicesEl = document.getElementById('choices');

    // Clear choices first
    choicesEl.innerHTML = '';

    // Fade text out then in
    textEl.style.opacity = '0';
    setTimeout(() => {
      Typewriter.start(textEl, scene.text, 25, () => {
        this.showChoices(scene.choices || []);
      });
      textEl.style.opacity = '1';
    }, 200);
  },

  showChoices(choices) {
    const container = document.getElementById('choices');
    container.innerHTML = '';

    if (!choices || choices.length === 0) {
      container.innerHTML = '<div class="no-choices">...</div>';
      return;
    }

    choices.forEach((choice, i) => {
      // Check conditions
      if (choice.condition && !choice.condition(GameState)) return;

      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.style.animationDelay = `${i * 0.1}s`;
      btn.addEventListener('click', () => {
        // Run choice effect
        if (choice.effect) choice.effect(GameState);
        // Transition to next scene
        Transition.fadeOut(300, () => {
          this.showScene(choice.nextScene);
        });
      });
      container.appendChild(btn);
    });
  },
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => Game.init());
