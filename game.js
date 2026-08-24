/**
 * SPRAY PIMIENTA: BARCELONA STREET DEFENDER
 * Simulador de autodefensa urbana y seguridad ciudadana en Barcelona.
 * Sistema de chorro de gel de pimienta balístico, tinte de marcaje UV indeleble,
 * recreación realista de modus operandi de carteristas y patrullaje de Guàrdia Urbana y Mossos d'Esquadra.
 */

(function () {
  'use strict';

  // --- Canvas & Rendering Setup ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const V_WIDTH = 540;
  const V_HEIGHT = 960;

  // Resize canvas to match display ratio
  function handleResize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(canvas.width / V_WIDTH, 0, 0, canvas.height / V_HEIGHT, 0, 0);
  }
  window.addEventListener('resize', handleResize);
  setTimeout(handleResize, 50);

  // --- Audio System (Web Audio API Synthesizer) ---
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.sprayNode = null;
      this.sprayGain = null;
      this.sirenTimer = null;
    }

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      const btn = document.getElementById('soundBtn');
      if (btn) btn.textContent = this.enabled ? '🔊' : '🔇';
      return this.enabled;
    }

    playTone(freq, duration, type = 'sine', gainVal = 0.2) {
      if (!this.enabled || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    startSprayNoise() {
      if (!this.enabled || !this.ctx || this.sprayNode) return;
      try {
        const bufferSize = this.ctx.sampleRate * 1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1600;
        filter.Q.value = 1.8;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.28, this.ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start();
        this.sprayNode = whiteNoise;
        this.sprayGain = gain;
      } catch (e) {}
    }

    stopSprayNoise() {
      if (this.sprayNode) {
        try {
          if (this.sprayGain && this.ctx) {
            this.sprayGain.gain.setValueAtTime(this.sprayGain.gain.value, this.ctx.currentTime);
            this.sprayGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
          }
          setTimeout(() => {
            if (this.sprayNode) {
              this.sprayNode.stop();
              this.sprayNode.disconnect();
              this.sprayNode = null;
            }
          }, 90);
        } catch (e) {
          this.sprayNode = null;
        }
      }
    }

    playDyeHit() {
      if (!this.enabled || !this.ctx) return;
      this.playTone(320, 0.15, 'triangle', 0.25);
      setTimeout(() => this.playTone(180, 0.2, 'sawtooth', 0.2), 40);
    }

    playWhistle() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.playTone(2800, 0.09, 'sine', 0.35);
          setTimeout(() => this.playTone(3400, 0.12, 'square', 0.3), 30);
        }, i * 90);
      }
    }

    playSirenBurst() {
      if (!this.enabled || !this.ctx) return;
      const tones = [720, 960, 720, 960];
      tones.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 0.2, 'sawtooth', 0.18);
        }, idx * 180);
      });
    }

    playHandcuffs() {
      if (!this.enabled || !this.ctx) return;
      this.playTone(1800, 0.05, 'square', 0.2);
      setTimeout(() => this.playTone(2200, 0.08, 'triangle', 0.25), 60);
      setTimeout(() => this.playTone(520, 0.25, 'sine', 0.2), 120);
    }

    playLootSaved() {
      if (!this.enabled || !this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.14, 'sine', 0.2), i * 60);
      });
    }
  }

  const audio = new AudioManager();

  // --- Game Districts Configuration ---
  const DISTRICTS = [
    {
      id: 'rambla',
      tag: 'DISTRITO 1 · CIUTAT VELLA',
      name: 'La Rambla & Mercat Boqueria',
      type: 'Bulevar Peatonal',
      diff: 'NORMAL',
      desc: 'Bulevar con turistas tomando fotos, quioscos de flores y terrazas. Foco de carteristas del método del mapa y saqueadores de terrazas.',
      skyColor: '#6ba8d1',
      groundColor: '#7a8594',
      pavementType: 'panot',
      targetDetentions: 5,
      policeUnit: 'Guàrdia Urbana (Districte Ciutat Vella)',
      speed: 1.0,
      buildingPalette: ['#d79967', '#c98a58', '#e4b285', '#b36d4b'],
      atmosphere: 'rambla'
    },
    {
      id: 'eixample',
      tag: 'DISTRITO 2 · EIXAMPLE',
      name: 'Passeig de Gràcia & Gaudí',
      type: 'Avenida Modernista',
      diff: 'MEDIA-ALTA',
      desc: 'Edificios modernistas con chaflanes y tiendas de lujo. Zona de tironeros de relojes de alta gama y delincuentes en patinete.',
      skyColor: '#5c93bd',
      groundColor: '#6c7784',
      pavementType: 'panot_gaudi',
      targetDetentions: 7,
      policeUnit: 'Mossos d\'Esquadra (Eixample)',
      speed: 1.2,
      buildingPalette: ['#eedec2', '#d9c29d', '#bf9f73', '#d6aa75'],
      atmosphere: 'modernist'
    },
    {
      id: 'raval',
      tag: 'DISTRITO 3 · CIUTAT VELLA',
      name: 'El Raval & Carrer Nou',
      type: 'Calles Estrechas & Callejones',
      diff: 'ALTA',
      desc: 'Calles históricas estrechas y empedradas con callejones de escape rápido y motos. Alta concentración de tirones rápidos.',
      skyColor: '#47637e',
      groundColor: '#555f6b',
      pavementType: 'cobblestone',
      targetDetentions: 8,
      policeUnit: 'Patrulla Conjunta BCN',
      speed: 1.35,
      buildingPalette: ['#a87d60', '#8b5e43', '#bc9372', '#7a4f38'],
      atmosphere: 'raval'
    },
    {
      id: 'metro',
      tag: 'DISTRITO 4 · RED SUBTERRÁNEA',
      name: 'Metro Plaça Catalunya (L1/L3)',
      type: 'Estación de Metro Subterránea',
      diff: 'MUY ALTA',
      desc: 'Pasillos y andenes con aglomeraciones, tornos y escaleras mecánicas. Actuación rápida de bandas de carteristas en los vagones.',
      skyColor: '#2b3644',
      groundColor: '#3d4856',
      pavementType: 'metro_tiles',
      targetDetentions: 10,
      policeUnit: 'Unitat de Seguretat Metro (Mossos)',
      speed: 1.5,
      buildingPalette: ['#495666', '#3b4552', '#58687a', '#2d3540'],
      atmosphere: 'metro'
    },
    {
      id: 'barceloneta',
      tag: 'DISTRITO 5 · LITORAL',
      name: 'Passeig Marítim & Barceloneta',
      type: 'Paseo Marítimo y Playa',
      diff: 'EXTREMA',
      desc: 'Palmeras, chiringuitos y paseo frente al mar. Tironeros en patinetes eléctricos de gran velocidad y hurtos en toallas de playa.',
      skyColor: '#4bb3d6',
      groundColor: '#caa67a',
      pavementType: 'promenade',
      targetDetentions: 12,
      policeUnit: 'Patrulla Platges Guàrdia Urbana',
      speed: 1.65,
      buildingPalette: ['#f4d29b', '#e2b378', '#f8e4c0', '#74b9d4'],
      atmosphere: 'beach'
    }
  ];

  // --- Criminal Types & Modus Operandi ---
  const THIEF_TYPES = [
    {
      id: 'map_pickpocket',
      name: 'Carterista del Mapa',
      desc: 'Tapa sus manos con un plano para robar carteras',
      speed: 0.85,
      color: '#34495e',
      hoodieColor: '#2c3e50',
      lootType: 'CARTERA',
      lootValue: 150,
      threat: 1
    },
    {
      id: 'scooter_snatcher',
      name: 'Tironero en Patinete',
      desc: 'Arranca móviles a alta velocidad sobre dos ruedas',
      speed: 1.75,
      color: '#e74c3c',
      hoodieColor: '#1e272e',
      hasScooter: true,
      lootType: 'IPHONE 15 PRO',
      lootValue: 350,
      threat: 2
    },
    {
      id: 'watch_snatcher',
      name: 'Ladrón de Relojes de Lujo',
      desc: 'Finge tropiezos para desabrochar relojes de pulsera',
      speed: 1.1,
      color: '#8e44ad',
      hoodieColor: '#4834d4',
      lootType: 'ROLEX SUBMARINER',
      lootValue: 600,
      threat: 3
    },
    {
      id: 'terrace_thief',
      name: 'Saqueador de Terrazas',
      desc: 'Sustrae bolsos y portátiles de mesas de bar',
      speed: 1.3,
      color: '#d35400',
      hoodieColor: '#d63031',
      lootType: 'BOLSO DE MARCA',
      lootValue: 250,
      threat: 2
    }
  ];

  // --- Game State ---
  const state = {
    running: false,
    paused: false,
    currentDistrictIndex: 0,
    selectedUpgrade: 'standard',
    // Player
    playerLane: 0, // -1: Left, 0: Center, 1: Right
    targetLane: 0,
    playerX: V_WIDTH / 2,
    playerY: V_HEIGHT - 170,
    isSpraying: false,
    sprayAmmo: 100, // 0 - 100%
    sprayPressure: 100,
    sprayRange: 420,
    sprayWidth: 80,
    dyePotency: 1.0,
    whistleCooldown: 0,
    // Game stats
    securityLevel: 85, // 0 - 100%
    markedCount: 0,
    arrestedCount: 0,
    lootRecovered: 0,
    score: 0,
    shotsFired: 0,
    shotsHit: 0,
    // Police patrol system
    policeActive: false,
    policeArrivalProgress: 0,
    policeCarZ: -1,
    policeSirenPhase: 0,
    // Simulation entities
    entities: [],
    particles: [],
    dyeSplashes: [],
    floatingTexts: [],
    // Timers & scrolling
    scrollDistance: 0,
    spawnTimer: 0,
    civilianTimer: 0,
    lastTime: 0
  };

  // --- Helper Functions ---
  function getDistrict() {
    return DISTRICTS[state.currentDistrictIndex];
  }

  function laneToX(lane, z) {
    // 3D perspective mapping
    const s = 0.35 + z * 1.15;
    const laneSpacing = 135 * s;
    return V_WIDTH / 2 + lane * laneSpacing;
  }

  function zToY(z) {
    // Horizon is at y = 290, road bottom at y = 960
    return 290 + Math.pow(z, 1.8) * 670;
  }

  function zToScale(z) {
    return 0.32 + z * 1.05;
  }

  function showQuickBanner(msg, duration = 1600) {
    const banner = document.getElementById('quickBanner');
    if (!banner) return;
    banner.textContent = msg;
    banner.classList.remove('hidden');
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
      banner.classList.add('hidden');
    }, duration);
  }

  function addFloatingText(text, x, y, color = '#ff9f1a', size = 18) {
    state.floatingTexts.push({
      text,
      x,
      y,
      color,
      size,
      vy: -1.4,
      life: 1.0,
      maxLife: 1.0
    });
  }

  // --- Entity Management ---
  function spawnCivilian() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const types = ['tourist_camera', 'tourist_phone', 'neighbor_shopping', 'terrace_diner'];
    const type = types[Math.floor(Math.random() * types.length)];
    state.entities.push({
      kind: 'civilian',
      type,
      lane,
      z: 0.02,
      speed: 0.25 + Math.random() * 0.15,
      hasBeenRobbed: false,
      alerted: false,
      phrase: '',
      hairColor: ['#3b2314', '#e6b800', '#5a3d28', '#8a8a8a'][Math.floor(Math.random() * 4)],
      shirtColor: ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7'][Math.floor(Math.random() * 4)]
    });
  }

  function spawnThief() {
    const template = THIEF_TYPES[Math.floor(Math.random() * THIEF_TYPES.length)];
    const lane = Math.floor(Math.random() * 3) - 1;
    const isTargeting = Math.random() < 0.65;
    
    state.entities.push({
      kind: 'thief',
      typeId: template.id,
      name: template.name,
      lane,
      targetLane: lane,
      z: 0.01,
      speed: template.speed * getDistrict().speed * (0.85 + Math.random() * 0.3),
      hasScooter: !!template.hasScooter,
      lootType: template.lootType,
      lootValue: template.lootValue,
      threat: template.threat,
      color: template.color,
      hoodieColor: template.hoodieColor,
      // States: 'stalking', 'stealing', 'fleeing', 'blinded', 'marked', 'arrested'
      state: 'stalking',
      stolenLoot: null,
      isMarked: false,
      dyeCover: 0, // 0 to 1
      blindTimer: 0,
      footprintTimer: 0,
      scooterTilt: 0,
      reactionText: ''
    });
  }

  function spawnPoliceObstacle() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const types = ['panot_barrier', 'bicing_rack', 'cafe_terrace'];
    const type = types[Math.floor(Math.random() * types.length)];
    state.entities.push({
      kind: 'obstacle',
      type,
      lane,
      z: 0.01,
      speed: 0
    });
  }

  // --- Pepper Spray Particle System ---
  function emitSprayStream() {
    if (state.sprayAmmo <= 0) return;
    state.sprayAmmo = Math.max(0, state.sprayAmmo - 0.55);
    state.shotsFired++;

    const nozzleX = state.playerX + 26;
    const nozzleY = state.playerY - 25;
    const streamCount = 14;

    for (let i = 0; i < streamCount; i++) {
      const spreadX = (Math.random() - 0.5) * (state.sprayWidth * 0.45);
      const targetZ = 0.3 + Math.random() * 0.6;
      const angle = (Math.random() - 0.5) * 0.22;
      const speed = 14 + Math.random() * 12;

      state.particles.push({
        x: nozzleX + (Math.random() - 0.5) * 6,
        y: nozzleY,
        vx: Math.sin(angle) * speed + (state.targetLane - state.playerLane) * 1.5,
        vy: -Math.cos(angle) * speed - 10,
        radius: 3 + Math.random() * 5.5,
        growth: 0.35 + Math.random() * 0.4,
        alpha: 0.95,
        color: ['#ff4d00', '#ff6b08', '#ff9400', '#ff2e00', '#ffe600'][Math.floor(Math.random() * 5)],
        isDye: true,
        zPos: 0.95 - (i / streamCount) * 0.5,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.03
      });
    }

    // Check hit test against thieves in front of the player
    checkSprayImpacts();
  }

  function checkSprayImpacts() {
    const sprayTargetLane = state.playerLane;

    state.entities.forEach(ent => {
      if (ent.kind === 'thief' && ent.state !== 'arrested') {
        // Check if thief is in the player's active lane & within effective spray range
        const laneMatch = Math.abs(ent.lane - sprayTargetLane) < 0.65;
        const zMatch = ent.z > 0.35 && ent.z < 0.92;

        if (laneMatch && zMatch) {
          state.shotsHit++;
          // Apply blinding and indelible dye
          ent.dyeCover = Math.min(1.0, ent.dyeCover + 0.35);
          ent.blindTimer = 180; // 3 seconds of incapacitation
          
          if (!ent.isMarked) {
            ent.isMarked = true;
            state.markedCount++;
            state.score += 250;
            ent.state = 'blinded';
            audio.playDyeHit();

            // Spawn floating text
            const x = laneToX(ent.lane, ent.z);
            const y = zToY(ent.z) - 50;
            addFloatingText('🎯 ¡SOSPECHOSO MARCADO CON TINTE UV!', x, y, '#ff5b1e', 18);
            showQuickBanner('🚨 ¡DELINCUENTE MARCADO CON TINTE NARANJA! AVISANDO A PATRULLA');

            // Drop stolen loot if carrying any
            if (ent.stolenLoot) {
              state.lootRecovered++;
              state.score += ent.lootValue;
              addFloatingText(`💎 ¡${ent.stolenLoot} RECUPERADO!`, x, y - 30, '#2ed573', 19);
              audio.playLootSaved();
              ent.stolenLoot = null;
            }

            // Trigger police response
            activatePoliceDispatch();
          }

          // Emit splash particles on hit
          const hitX = laneToX(ent.lane, ent.z);
          const hitY = zToY(ent.z) - 30;
          for (let p = 0; p < 8; p++) {
            state.particles.push({
              x: hitX + (Math.random() - 0.5) * 20,
              y: hitY + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              radius: 4 + Math.random() * 6,
              growth: 0.1,
              alpha: 1.0,
              color: '#ff5b1e',
              life: 1.0,
              decay: 0.05
            });
          }
        }
      }
    });
  }

  // --- Police Dispatch & Arrest System ---
  function activatePoliceDispatch() {
    state.policeActive = true;
    const policeBadge = document.getElementById('policeAlertBadge');
    const policeStatus = document.getElementById('hudPoliceStatus');
    if (policeBadge) policeBadge.classList.add('active-police');
    if (policeStatus) policeStatus.textContent = 'PATRULLA EN CAMINO 🚨';
    audio.playSirenBurst();
  }

  function executeArrests() {
    let arrestedAny = false;
    state.entities.forEach(ent => {
      if (ent.kind === 'thief' && ent.isMarked && ent.state !== 'arrested') {
        ent.state = 'arrested';
        state.arrestedCount++;
        state.score += 500;
        state.securityLevel = Math.min(100, state.securityLevel + 12);
        arrestedAny = true;

        const x = laneToX(ent.lane, ent.z);
        const y = zToY(ent.z) - 60;
        addFloatingText('👮 ¡DETENIDO IN FRAGANTI!', x, y, '#0080ff', 20);
        audio.playHandcuffs();

        // Check if level quota reached
        const target = getDistrict().targetDetentions;
        if (state.arrestedCount >= target) {
          setTimeout(() => {
            finishDistrict(true);
          }, 1200);
        }
      }
    });

    if (arrestedAny) {
      showQuickBanner('🚔 GUÀRDIA URBANA: ¡SOSPECHOSO IDENTIFICADO Y DETENIDO POR TINTE UV!');
    }
  }

  // --- Emergency Whistle Action ---
  function triggerWhistle() {
    if (state.whistleCooldown > 0) return;
    state.whistleCooldown = 180; // 3 seconds
    audio.playWhistle();
    showQuickBanner('📢 ¡SILBATO DE ALERTA! VECINOS Y PATRULLAS EN ALERTA MÁXIMA');

    // Stun nearby thieves slightly and alert civilians
    state.entities.forEach(ent => {
      if (ent.kind === 'thief' && ent.z > 0.2) {
        ent.speed *= 0.65;
        addFloatingText('⚠️ ¡AL LORO!', laneToX(ent.lane, ent.z), zToY(ent.z) - 40, '#f7b731', 16);
      }
    });

    activatePoliceDispatch();
  }

  // --- Background & Urban Environment Rendering ---
  function drawBarcelonaScene() {
    const dist = getDistrict();

    // 1. Sky & Atmosphere
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 290);
    skyGrad.addColorStop(0, dist.skyColor);
    skyGrad.addColorStop(1, '#dfe9f3');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, 290);

    // Distant Barcelona Silhouettes (Sagrada Família, Agbar, Montjuïc)
    drawSkylineLandmarks(dist.atmosphere);

    // 2. Barcelona Modernist Buildings & Sidewalk Blocks (Parallax)
    drawModernistBuildings(dist);

    // 3. Road & Sidewalks Perspective Plane
    drawPavement(dist);

    // 4. Street Urban Furniture (Bicing racks, Kiosks, Terraces, Metro Entrances)
    drawUrbanFurniture(dist);

    // 5. Police Siren Flash overlay when police patrol is rushing
    if (state.policeActive) {
      drawPoliceSirenReflections();
    }
  }

  function drawSkylineLandmarks(atmos) {
    ctx.save();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';

    if (atmos === 'modernist' || atmos === 'rambla') {
      // Sagrada Família Spires silhouette
      const sx = 360;
      const sy = 160;
      ctx.beginPath();
      // Central tower
      ctx.moveTo(sx + 20, sy - 55);
      ctx.lineTo(sx + 26, sy + 60);
      ctx.lineTo(sx + 14, sy + 60);
      ctx.fill();
      // Towers
      ctx.fillRect(sx + 2, sy - 35, 7, 95);
      ctx.fillRect(sx + 15, sy - 48, 10, 108);
      ctx.fillRect(sx + 29, sy - 35, 7, 95);
      // Torre Glòries silhouette
      ctx.beginPath();
      ctx.ellipse(120, 190, 16, 45, 0, Math.PI, 0);
      ctx.fill();
    } else if (atmos === 'beach') {
      // W Hotel / Hotel Vela sail shape
      ctx.beginPath();
      ctx.moveTo(420, 140);
      ctx.quadraticCurveTo(460, 170, 460, 220);
      ctx.lineTo(410, 220);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawModernistBuildings(dist) {
    ctx.save();
    const colors = dist.buildingPalette;
    const scroll = (state.scrollDistance * 0.4) % 180;

    // Left Facades (Modernist blocks with chaflanes and wrought iron balconies)
    for (let i = -1; i < 4; i++) {
      const bx = -20 - i * 40;
      const by = 80 + i * 20;
      const bw = 150;
      const bh = 220;
      const color = colors[Math.abs(i) % colors.length];

      // Building Wall
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, bw, bh);

      // Modernist Stone Cornice & Trim
      ctx.fillStyle = '#4a3b32';
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillRect(bx, by + 45, bw, 4);

      // Balconies with Catalan wrought-iron railings
      for (let floor = 0; floor < 3; floor++) {
        const balY = by + 20 + floor * 55;
        // Window arch
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(bx + 75, balY + 12, 14, Math.PI, 0);
        ctx.rect(bx + 61, balY + 12, 28, 30);
        ctx.fill();

        // Balcony platform & black railing
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(bx + 54, balY + 38, 42, 6);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 56, balY + 26, 38, 12);
      }

      // Street Sign Plaque on the corner (e.g., "PASSEIG DE GRÀCIA")
      if (i === 1) {
        ctx.fillStyle = '#0f3057';
        ctx.fillRect(bx + 85, by + 140, 52, 16);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 86, by + 141, 50, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6.5px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('C. DE FERRAN', bx + 111, by + 151);
      }
    }

    // Right Facades
    for (let i = -1; i < 4; i++) {
      const bx = V_WIDTH - 130 + i * 40;
      const by = 80 + i * 20;
      const bw = 150;
      const bh = 220;
      const color = colors[(Math.abs(i) + 1) % colors.length];

      ctx.fillStyle = color;
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#4a3b32';
      ctx.fillRect(bx, by, bw, 6);

      // Shopfront awning (Forn de Pa / Tapas)
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(bx, by + 160, 95, 12);
      ctx.fillStyle = '#f1c40f';
      for (let s = 0; s < 95; s += 16) {
        ctx.fillRect(bx + s, by + 160, 8, 12);
      }

      // Shop Sign
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(bx + 10, by + 145, 75, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('BAR DE TAPAS', bx + 47, by + 155);
    }

    ctx.restore();
  }

  function drawPavement(dist) {
    ctx.save();
    // Perspective trapezoid ground
    const horizonY = 285;
    ctx.fillStyle = dist.groundColor;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH / 2 - 90, horizonY);
    ctx.lineTo(V_WIDTH / 2 + 90, horizonY);
    ctx.lineTo(V_WIDTH + 60, V_HEIGHT);
    ctx.lineTo(-60, V_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Sidewalk Kerbs & Panot Tiles
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH / 2 - 95, horizonY);
    ctx.lineTo(-40, V_HEIGHT);
    ctx.moveTo(V_WIDTH / 2 + 95, horizonY);
    ctx.lineTo(V_WIDTH + 40, V_HEIGHT);
    ctx.stroke();

    // Draw Panot Flor de Barcelona grid perspective lines
    const tileRows = 12;
    for (let r = 0; r < tileRows; r++) {
      const p = ((r / tileRows) + (state.scrollDistance % 100) / 1000) % 1.0;
      const y = horizonY + Math.pow(p, 2) * (V_HEIGHT - horizonY);
      const width = 180 + p * 420;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1 + p * 2;
      ctx.beginPath();
      ctx.moveTo(V_WIDTH / 2 - width / 2, y);
      ctx.lineTo(V_WIDTH / 2 + width / 2, y);
      ctx.stroke();

      // Panot flower motif stamps near foreground
      if (p > 0.45 && r % 2 === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        const panotSize = 14 * (0.5 + p);
        ctx.beginPath();
        ctx.arc(V_WIDTH / 2 - width * 0.35, y, panotSize, 0, Math.PI * 2);
        ctx.arc(V_WIDTH / 2 + width * 0.35, y, panotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Lane dividing dashed lines
    for (let l = -1; l <= 1; l += 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 24]);
      ctx.beginPath();
      ctx.moveTo(V_WIDTH / 2 + l * 45, horizonY);
      ctx.lineTo(V_WIDTH / 2 + l * 200, V_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawUrbanFurniture(dist) {
    // Metro sign or kiosk at horizon
    ctx.save();
    // BCN Metro Entrance Diamond (TMB)
    const mx = 65;
    const my = 275;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(mx, my - 12);
    ctx.lineTo(mx + 12, my);
    ctx.lineTo(mx, my + 12);
    ctx.lineTo(mx - 12, my);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '900 11px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('M', mx, my + 4);

    // Street Lantern (Farola modernista de hierro)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH - 60, 240);
    ctx.lineTo(V_WIDTH - 60, 310);
    ctx.stroke();
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(V_WIDTH - 60, 238, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPoliceSirenReflections() {
    state.policeSirenPhase += 0.18;
    const isBlue = Math.sin(state.policeSirenPhase) > 0;
    const color = isBlue ? 'rgba(0, 128, 255, 0.16)' : 'rgba(255, 42, 75, 0.16)';

    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Beacons in top corners
    const grad1 = ctx.createRadialGradient(40, 290, 10, 40, 290, 180);
    grad1.addColorStop(0, isBlue ? 'rgba(0, 128, 255, 0.6)' : 'rgba(255, 42, 75, 0.6)');
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 200, 200, 200);

    const grad2 = ctx.createRadialGradient(V_WIDTH - 40, 290, 10, V_WIDTH - 40, 290, 180);
    grad2.addColorStop(0, !isBlue ? 'rgba(0, 128, 255, 0.6)' : 'rgba(255, 42, 75, 0.6)');
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(V_WIDTH - 200, 200, 200, 200);

    ctx.restore();
  }

  // --- Entity Drawing Routines ---
  function drawEntities() {
    // Sort by z distance for proper depth ordering
    const sorted = [...state.entities].sort((a, b) => a.z - b.z);

    sorted.forEach(ent => {
      const x = laneToX(ent.lane, ent.z);
      const y = zToY(ent.z);
      const scale = zToScale(ent.z);

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      if (ent.kind === 'thief') {
        drawThiefEntity(ent);
      } else if (ent.kind === 'civilian') {
        drawCivilianEntity(ent);
      } else if (ent.kind === 'obstacle') {
        drawObstacleEntity(ent);
      }

      ctx.restore();
    });
  }

  function drawThiefEntity(thief) {
    const isBlinded = thief.blindTimer > 0;
    const isArrested = thief.state === 'arrested';
    const isMarked = thief.isMarked;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Electric Scooter if applicable
    if (thief.hasScooter && !isArrested) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-22, -4, 44, 5); // Deck
      // Wheels
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(-20, 0, 6, 0, Math.PI * 2);
      ctx.arc(20, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      // Handlebar stem
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, -4);
      ctx.lineTo(12, -45);
      ctx.stroke();
      // LED Light
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(13, -44, 4, 3);
    }

    // Legs / Tracksuit Pants
    ctx.fillStyle = thief.color;
    if (isBlinded) {
      // Stumbling crouch
      ctx.fillRect(-14, -28, 10, 28);
      ctx.fillRect(4, -26, 10, 26);
    } else {
      ctx.fillRect(-16, -34, 12, 34);
      ctx.fillRect(4, -34, 12, 34);
    }
    // Sneakers
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, -4, 16, 6);
    ctx.fillRect(4, -4, 16, 6);

    // Torso & Hoodie / Urban Streetwear
    ctx.fillStyle = thief.hoodieColor;
    ctx.beginPath();
    ctx.roundRect(-22, isBlinded ? -58 : -68, 44, 38, 8);
    ctx.fill();

    // Cross-body Fanny Pack (Riñonera cruzada en el pecho)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, isBlinded ? -56 : -66);
    ctx.lineTo(16, isBlinded ? -30 : -40);
    ctx.stroke();
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(-4, isBlinded ? -46 : -56, 14, 10);

    // Head & Baseball Cap / Hoodie
    ctx.fillStyle = thief.hoodieColor;
    ctx.beginPath();
    ctx.arc(0, isBlinded ? -68 : -78, 16, 0, Math.PI * 2);
    ctx.fill();

    // Cap Visor
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(0, isBlinded ? -74 : -84, 16, 5, 0, 0, Math.PI);
    ctx.fill();

    // Face / Expression
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.arc(0, isBlinded ? -66 : -76, 10, 0, Math.PI);
    ctx.fill();

    // Arms & Hands
    if (isBlinded) {
      // Hands clutching face in pain from pepper spray
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.arc(-8, -68, 7, 0, Math.PI * 2);
      ctx.arc(8, -68, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Carrying stolen item or map
      if (thief.typeId === 'map_pickpocket') {
        // Map in hand
        ctx.fillStyle = '#f5f6fa';
        ctx.fillRect(8, -54, 22, 16);
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, -54, 22, 16);
      }
    }

    // --- INDELIBLE ORANGE UV DYE EFFECT (El manchado del spray de pimienta) ---
    if (thief.dyeCover > 0) {
      ctx.save();
      // Vivid neon orange/red dye splatters covering face, chest, and hoodie
      ctx.fillStyle = 'rgba(255, 91, 30, 0.92)';
      
      // Face stain
      ctx.beginPath();
      ctx.arc(-2, isBlinded ? -67 : -77, 8 * thief.dyeCover, 0, Math.PI * 2);
      ctx.arc(5, isBlinded ? -65 : -75, 6 * thief.dyeCover, 0, Math.PI * 2);
      ctx.fill();

      // Chest splatter
      ctx.beginPath();
      ctx.arc(0, isBlinded ? -45 : -55, 14 * thief.dyeCover, 0, Math.PI * 2);
      ctx.arc(-10, isBlinded ? -40 : -50, 8 * thief.dyeCover, 0, Math.PI * 2);
      ctx.arc(10, isBlinded ? -42 : -52, 7 * thief.dyeCover, 0, Math.PI * 2);
      ctx.fill();

      // UV fluorescent glow
      ctx.shadowColor = '#ff6e26';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ffeaa7';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // --- Police Target Beacon / Marked Indicator ---
    if (isMarked) {
      ctx.save();
      const beaconY = isBlinded ? -105 : -115;
      
      // Flashing Target Lock Box
      ctx.strokeStyle = '#ff3838';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-24, beaconY - 14, 48, 22);

      // Top Alert Badge
      ctx.fillStyle = '#ff3838';
      ctx.fillRect(-24, beaconY - 26, 48, 12);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7.5px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 MARCADO', 0, beaconY - 17);

      // Subtext
      ctx.fillStyle = '#ffeaa7';
      ctx.font = 'bold 6.5px Outfit';
      ctx.fillText('TINTE UV POLICIAL', 0, beaconY);

      // Warning arrow pointing to suspect
      ctx.fillStyle = '#ff3838';
      ctx.beginPath();
      ctx.moveTo(0, beaconY + 8);
      ctx.lineTo(-5, beaconY + 2);
      ctx.lineTo(5, beaconY + 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Arrest Handcuff Overlay
    if (isArrested) {
      ctx.save();
      ctx.fillStyle = '#0080ff';
      ctx.font = 'bold 9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('🚔 EN CUSTODIA', 0, -125);
      ctx.restore();
    }
  }

  function drawCivilianEntity(civ) {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(-12, -30, 8, 30);
    ctx.fillRect(4, -30, 8, 30);

    // Torso / Shirt
    ctx.fillStyle = civ.shirtColor;
    ctx.beginPath();
    ctx.roundRect(-18, -60, 36, 32, 6);
    ctx.fill();

    // Head & Hair
    ctx.fillStyle = civ.hairColor;
    ctx.beginPath();
    ctx.arc(0, -68, 14, 0, Math.PI * 2);
    ctx.fill();

    // Tourist Straw Hat or Sunglasses
    if (civ.type.startsWith('tourist')) {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.ellipse(0, -74, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Camera strap around neck
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.strokeRect(-6, -50, 12, 9);
    }

    // Speech bubble if robbed or safe
    if (civ.hasBeenRobbed) {
      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('😱 ¡MI CARTERA!', 0, -90);
    }
  }

  function drawObstacleEntity(obs) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (obs.type === 'panot_barrier') {
      // Municipal construction barrier (Ajuntament de Barcelona)
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-28, -26, 56, 26);
      ctx.fillStyle = '#c0392b';
      for (let i = -24; i < 24; i += 16) {
        ctx.fillRect(i, -26, 8, 26);
      }
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-32, -4, 64, 6);
    } else if (obs.type === 'bicing_rack') {
      // Bicing Station bike
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-22, -22, 44, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('BICING', 0, -10);
    } else {
      // Cafe terrace table
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, -18, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-2, -18, 4, 18);
    }
  }

  // --- Player Character & Pepper Spray Canister Rendering ---
  function drawPlayer() {
    ctx.save();
    ctx.translate(state.playerX, state.playerY);

    // Player Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jeans & Running Shoes
    ctx.fillStyle = '#1e3799';
    ctx.fillRect(-20, -42, 16, 44);
    ctx.fillRect(4, -42, 16, 44);
    // Sports Sneakers
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(-24, -2, 20, 8);
    ctx.fillRect(4, -2, 20, 8);
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(-20, 0, 12, 4);
    ctx.fillRect(8, 0, 12, 4);

    // Urban Patrol Jacket / Hoodie (Dark Blue with reflective safety stripe)
    ctx.fillStyle = '#0c2461';
    ctx.beginPath();
    ctx.roundRect(-28, -90, 56, 52, 10);
    ctx.fill();

    // Reflective Silver / Neon Yellow Safety Stripe
    ctx.fillStyle = '#f7b731';
    ctx.fillRect(-28, -62, 56, 7);

    // Head & Cap
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.arc(0, -102, 18, 0, Math.PI * 2);
    ctx.fill();

    // Tactical Cap (Navy)
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(0, -107, 19, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-18, -108, 36, 6);

    // Arms & Hands Aiming Pepper Spray Canister
    ctx.fillStyle = '#0c2461';
    ctx.fillRect(16, -78, 16, 36); // Right Arm extending forward

    // Pepper Spray Canister (Sabre Red UV model)
    const canX = 26;
    const canY = -62;

    // Canister metal cylinder
    ctx.fillStyle = '#ff4d00';
    ctx.beginPath();
    ctx.roundRect(canX, canY, 14, 28, 3);
    ctx.fill();

    // Safety Trigger & Nozzle
    ctx.fillStyle = '#111';
    ctx.fillRect(canX + 2, canY - 6, 10, 6);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(canX + 4, canY - 8, 6, 3); // Flip-top safety

    // Canister Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 5px Outfit';
    ctx.fillText('OC-UV', canX + 7, canY + 14);

    // Muzzle Flash / Vapor Cone when spraying
    if (state.isSpraying && state.sprayAmmo > 0) {
      ctx.fillStyle = 'rgba(255, 110, 38, 0.85)';
      ctx.beginPath();
      ctx.arc(canX + 7, canY - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(canX + 7, canY - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Particles & Floating Text Rendering ---
  function updateAndDrawParticles(dt) {
    // 1. Pepper Spray Stream Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.radius += p.growth * dt * 10;
      p.alpha -= p.decay * dt * 15;

      if (p.alpha <= 0 || p.y < 200) {
        state.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Fluorescent core glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Floating Text Indicators
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy * dt * 30;
      ft.life -= dt * 0.9;

      if (ft.life <= 0) {
        state.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = `900 ${ft.size}px Outfit`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // --- Game Loop & State Updates ---
  function updateGame(dt) {
    if (!state.running || state.paused) return;

    // 1. Smooth Player Movement (Inter-lane interpolation)
    const targetX = laneToX(state.targetLane, 0.95);
    state.playerX += (targetX - state.playerX) * 0.22;
    state.playerLane = state.targetLane;

    // 2. Pepper Spray Continuous Spraying & Regeneration
    if (state.isSpraying) {
      emitSprayStream();
    } else {
      // Natural slow pressure recovery
      state.sprayAmmo = Math.min(100, state.sprayAmmo + 0.12);
    }

    if (state.whistleCooldown > 0) {
      state.whistleCooldown--;
    }

    // 3. World Scrolling & Spawning
    const dist = getDistrict();
    state.scrollDistance += dt * 90 * dist.speed;

    state.spawnTimer -= dt * 1000;
    if (state.spawnTimer <= 0) {
      spawnThief();
      state.spawnTimer = (1400 / dist.speed) + Math.random() * 800;
    }

    state.civilianTimer -= dt * 1000;
    if (state.civilianTimer <= 0) {
      spawnCivilian();
      if (Math.random() < 0.3) spawnPoliceObstacle();
      state.civilianTimer = 2200 + Math.random() * 1400;
    }

    // 4. Update Simulation Entities
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const ent = state.entities[i];

      // Entity Movement along Z axis (towards foreground)
      if (ent.kind === 'thief') {
        if (ent.blindTimer > 0) {
          ent.blindTimer--;
          ent.z += dt * 0.04; // slowed down considerably when blinded
        } else {
          ent.z += dt * 0.16 * ent.speed;
        }

        // Stealing interaction with nearby civilians
        if (ent.state === 'stalking' && ent.z > 0.25 && ent.z < 0.65) {
          // Look for civilians in the same lane
          const victim = state.entities.find(c => c.kind === 'civilian' && c.lane === ent.lane && Math.abs(c.z - ent.z) < 0.12 && !c.hasBeenRobbed);
          if (victim) {
            victim.hasBeenRobbed = true;
            ent.stolenLoot = ent.lootType;
            ent.state = 'fleeing';
            state.securityLevel = Math.max(0, state.securityLevel - 8);
            addFloatingText(`⚠️ ¡ROBO DE ${ent.lootType}!`, laneToX(ent.lane, ent.z), zToY(ent.z) - 50, '#ff4757', 16);
          }
        }
      } else if (ent.kind === 'civilian') {
        ent.z += dt * 0.12 * ent.speed;
      } else if (ent.kind === 'obstacle') {
        ent.z += dt * 0.14;
      }

      // Check boundary exit
      if (ent.z > 1.08) {
        if (ent.kind === 'thief' && !ent.isMarked && ent.state !== 'arrested') {
          // Unmarked thief escaped into crowd
          state.securityLevel = Math.max(0, state.securityLevel - 10);
        }
        state.entities.splice(i, 1);
      }
    }

    // 5. Police Patrol Arrival Logic
    if (state.policeActive) {
      state.policeArrivalProgress += dt * 0.6;
      if (state.policeArrivalProgress >= 1.0) {
        executeArrests();
        state.policeActive = false;
        state.policeArrivalProgress = 0;
        const policeBadge = document.getElementById('policeAlertBadge');
        const policeStatus = document.getElementById('hudPoliceStatus');
        if (policeBadge) policeBadge.classList.remove('active-police');
        if (policeStatus) policeStatus.textContent = 'ZONA ASEGURADA ✅';
      }
    }

    // 6. Security Level Fail Condition
    if (state.securityLevel <= 0) {
      finishDistrict(false);
    }

    // 7. Update In-Game HUD Elements
    updateHUD();
  }

  function updateHUD() {
    const dist = getDistrict();
    const markEl = document.getElementById('hudMarked');
    const arrEl = document.getElementById('hudArrested');
    const lootEl = document.getElementById('hudLootCount');
    const scoreEl = document.getElementById('hudScore');
    const secFill = document.getElementById('securityBarFill');
    const secText = document.getElementById('securityPctText');
    const sprayFill = document.getElementById('sprayBarFill');
    const sprayLiquid = document.getElementById('sprayLiquidFill');
    const sprayText = document.getElementById('sprayAmmoText');

    if (markEl) markEl.textContent = state.markedCount;
    if (arrEl) arrEl.textContent = `${state.arrestedCount}/${dist.targetDetentions}`;
    if (lootEl) lootEl.textContent = state.lootRecovered;
    if (scoreEl) scoreEl.textContent = state.score;

    if (secFill) secFill.style.width = `${state.securityLevel}%`;
    if (secText) secText.textContent = `${Math.round(state.securityLevel)}%`;

    const ammoPct = Math.round(state.sprayAmmo);
    if (sprayFill) sprayFill.style.width = `${ammoPct}%`;
    if (sprayLiquid) sprayLiquid.style.height = `${ammoPct}%`;
    if (sprayText) sprayText.textContent = `${ammoPct}%`;
  }

  // --- Main Animation Frame ---
  function gameLoop(time) {
    if (!state.lastTime) state.lastTime = time;
    const dt = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;

    updateGame(dt);

    // Clear Canvas
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    // Draw Scene Layers
    drawBarcelonaScene();
    drawEntities();
    drawPlayer();
    updateAndDrawParticles(dt);

    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);

  // --- Game Lifecycle (Start, Finish, Pause) ---
  function startDistrict(index = state.currentDistrictIndex) {
    audio.init();
    state.currentDistrictIndex = index;
    const dist = getDistrict();

    state.running = true;
    state.paused = false;
    state.securityLevel = 90;
    state.markedCount = 0;
    state.arrestedCount = 0;
    state.lootRecovered = 0;
    state.score = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.sprayAmmo = 100;
    state.playerLane = 0;
    state.targetLane = 0;
    state.entities = [];
    state.particles = [];
    state.floatingTexts = [];
    state.spawnTimer = 400;
    state.civilianTimer = 600;
    state.policeActive = false;

    // Update HUD texts
    document.getElementById('hudDistrictType').textContent = dist.tag;
    document.getElementById('hudDistrictName').textContent = dist.name;

    // Hide overlays, show HUD
    document.getElementById('menuOverlay').classList.add('hidden');
    document.getElementById('resultOverlay').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    showQuickBanner(`📍 PATRULLANDO: ${dist.name.toUpperCase()}`);
  }

  function finishDistrict(success) {
    state.running = false;
    state.isSpraying = false;
    audio.stopSprayNoise();

    document.getElementById('hud').classList.add('hidden');
    const resultOverlay = document.getElementById('resultOverlay');
    resultOverlay.classList.remove('hidden');

    const accuracy = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 100;

    document.getElementById('debriefTitle').textContent = success ? '¡OPERATIVO COMPLETADO!' : 'ZONA COMPROMETIDA';
    document.getElementById('debriefSubtitle').textContent = success
      ? 'Carteristas neutralizados con tinte de marcaje y puestos a disposición policial.'
      : 'Demasiados hurtos en la zona. Recarga spray y reorganiza la patrulla.';
    document.getElementById('debriefMarked').textContent = state.markedCount;
    document.getElementById('debriefArrested').textContent = state.arrestedCount;
    document.getElementById('debriefLoot').textContent = state.lootRecovered;
    document.getElementById('debriefAccuracy').textContent = `${accuracy}%`;

    const secStatus = document.getElementById('debriefSecurityStatus');
    if (success) {
      secStatus.textContent = '🟢 BARRIO SEGURO Y PROTEGIDO (100%)';
      secStatus.parentElement.style.borderColor = '#2ed573';
      document.getElementById('nextMissionBtn').classList.remove('hidden');
    } else {
      secStatus.textContent = '🔴 ALERTA DE CARTERISTAS ELEVADA (ZONA CALIENTE)';
      secStatus.parentElement.style.borderColor = '#ff4757';
      document.getElementById('nextMissionBtn').classList.add('hidden');
    }
  }

  function movePlayer(laneOffset) {
    if (!state.running || state.paused) return;
    state.targetLane = Math.max(-1, Math.min(1, state.targetLane + laneOffset));
  }

  function setPlayerLane(lane) {
    if (!state.running || state.paused) return;
    state.targetLane = Math.max(-1, Math.min(1, lane));
  }

  function setSpraying(active) {
    if (!state.running || state.paused) return;
    state.isSpraying = active;
    if (active) {
      audio.startSprayNoise();
    } else {
      audio.stopSprayNoise();
    }
  }

  // --- District Carousel in Menu ---
  function updateMenuDistrictCard() {
    const dist = DISTRICTS[state.currentDistrictIndex];
    document.getElementById('menuDistrictTag').textContent = dist.tag;
    document.getElementById('menuDistrictDiff').textContent = dist.diff;
    document.getElementById('menuDistrictTitle').textContent = dist.name;
    document.getElementById('menuDistrictDesc').textContent = dist.desc;
  }

  // --- User Event Handlers ---
  // Keyboard
  window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') movePlayer(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') movePlayer(1);
    if (e.key === ' ' || e.key === 'Enter') setSpraying(true);
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') triggerWhistle();
    if (e.key === 'Escape') {
      const pauseOverlay = document.getElementById('pauseOverlay');
      if (state.running) {
        state.paused = !state.paused;
        if (state.paused) {
          pauseOverlay.classList.remove('hidden');
        } else {
          pauseOverlay.classList.add('hidden');
        }
      }
    }
  });

  window.addEventListener('keyup', e => {
    if (e.key === ' ' || e.key === 'Enter') setSpraying(false);
  });

  // Canvas Direct Pointer Interactions (Click & Drag to Aim/Spray)
  canvas.addEventListener('pointerdown', e => {
    audio.init();
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * V_WIDTH;
    if (clickX < V_WIDTH * 0.33) movePlayer(-1);
    else if (clickX > V_WIDTH * 0.66) movePlayer(1);
    else setPlayerLane(0);
    setSpraying(true);
  });

  canvas.addEventListener('pointerup', () => setSpraying(false));
  canvas.addEventListener('pointerleave', () => setSpraying(false));

  // Touch / Button Controls
  const touchLeft = document.getElementById('touchLeft');
  const touchRight = document.getElementById('touchRight');
  const touchCenter = document.getElementById('touchCenter');
  const touchSpray = document.getElementById('touchSpray');
  const touchWhistle = document.getElementById('touchWhistle');
  const whistleHudBtn = document.getElementById('whistleBtn');

  if (touchLeft) touchLeft.addEventListener('pointerdown', () => movePlayer(-1));
  if (touchRight) touchRight.addEventListener('pointerdown', () => movePlayer(1));
  if (touchCenter) touchCenter.addEventListener('pointerdown', () => setPlayerLane(0));

  if (touchSpray) {
    touchSpray.addEventListener('pointerdown', e => {
      e.preventDefault();
      audio.init();
      setSpraying(true);
    });
    touchSpray.addEventListener('pointerup', e => {
      e.preventDefault();
      setSpraying(false);
    });
    touchSpray.addEventListener('pointerleave', () => setSpraying(false));
  }

  if (touchWhistle) touchWhistle.addEventListener('pointerdown', triggerWhistle);
  if (whistleHudBtn) whistleHudBtn.addEventListener('pointerdown', triggerWhistle);

  // Menu & UI Buttons
  document.getElementById('startPlayBtn').addEventListener('click', () => startDistrict());
  document.getElementById('prevDistrictBtn').addEventListener('click', () => {
    state.currentDistrictIndex = (state.currentDistrictIndex - 1 + DISTRICTS.length) % DISTRICTS.length;
    updateMenuDistrictCard();
  });
  document.getElementById('nextDistrictBtn').addEventListener('click', () => {
    state.currentDistrictIndex = (state.currentDistrictIndex + 1) % DISTRICTS.length;
    updateMenuDistrictCard();
  });

  document.getElementById('soundBtn').addEventListener('click', () => audio.toggle());

  // Modals (Arsenal, Dossier, Debrief, Pause)
  const arsenalModal = document.getElementById('arsenalModal');
  const dossierModal = document.getElementById('dossierModal');
  const pauseOverlay = document.getElementById('pauseOverlay');

  document.getElementById('openArsenalBtn').addEventListener('click', () => arsenalModal.classList.remove('hidden'));
  document.getElementById('closeArsenalBtn').addEventListener('click', () => arsenalModal.classList.add('hidden'));
  document.getElementById('closeArsenalBtn2').addEventListener('click', () => arsenalModal.classList.add('hidden'));

  document.getElementById('openDossierBtn').addEventListener('click', () => dossierModal.classList.remove('hidden'));
  document.getElementById('guideBtn').addEventListener('click', () => dossierModal.classList.remove('hidden'));
  document.getElementById('closeDossierBtn').addEventListener('click', () => dossierModal.classList.add('hidden'));
  document.getElementById('closeDossierBtn2').addEventListener('click', () => dossierModal.classList.add('hidden'));

  document.getElementById('pauseBtn').addEventListener('click', () => {
    state.paused = true;
    pauseOverlay.classList.remove('hidden');
  });
  document.getElementById('resumeGameBtn').addEventListener('click', () => {
    state.paused = false;
    pauseOverlay.classList.add('hidden');
  });
  document.getElementById('restartGameBtn').addEventListener('click', () => {
    pauseOverlay.classList.add('hidden');
    startDistrict();
  });
  document.getElementById('exitToMenuBtn').addEventListener('click', () => {
    state.running = false;
    state.paused = false;
    pauseOverlay.classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('menuOverlay').classList.remove('hidden');
  });

  document.getElementById('nextMissionBtn').addEventListener('click', () => {
    state.currentDistrictIndex = (state.currentDistrictIndex + 1) % DISTRICTS.length;
    startDistrict();
  });
  document.getElementById('retryMissionBtn').addEventListener('click', () => startDistrict());
  document.getElementById('returnMenuBtn').addEventListener('click', () => {
    document.getElementById('resultOverlay').classList.add('hidden');
    document.getElementById('menuOverlay').classList.remove('hidden');
  });

  // Arsenal equipment selection handlers
  document.getElementById('buyStreamBtn').addEventListener('click', function() {
    state.sprayRange = 550;
    state.sprayWidth = 60;
    this.textContent = 'EQUIPADO';
    this.classList.add('equipped');
    document.getElementById('currentSprayName').textContent = 'CHORRO BALÍSTICO OC';
  });

  document.getElementById('buyDyeBtn').addEventListener('click', function() {
    state.dyePotency = 2.0;
    this.textContent = 'EQUIPADO';
    this.classList.add('equipped');
    document.getElementById('currentSprayName').textContent = 'GEL UV POLICIAL PLUS';
  });

  document.getElementById('buyWhistleBtn').addEventListener('click', function() {
    this.textContent = 'EQUIPADO';
    this.classList.add('equipped');
  });

  // Initialize view
  updateMenuDistrictCard();
})();
