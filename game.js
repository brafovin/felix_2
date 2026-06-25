/* Block Blast Clone — Vanilla JS: Maus + Touch, Sound, Animationen, Undo, Schwierigkeit */
(() => {
  "use strict";

  const GRID = 8;
  const COLORS = [
    "#4f7cff", "#ff5c8a", "#36d39a", "#ffb648",
    "#a76bff", "#3ad0e0", "#ff6b5c"
  ];

  // Block-Formen mit relativen Koordinaten
  const SHAPES = [
    [[0, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],
  ];

  // --- DOM ---
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const trayEl = document.getElementById("tray");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const comboEl = document.getElementById("combo");
  const overlay = document.getElementById("gameover");
  const finalScoreEl = document.getElementById("final-score");
  const undoBtn = document.getElementById("undo");
  const soundBtn = document.getElementById("sound");
  const diffSel = document.getElementById("difficulty");

  // --- State ---
  let board = [];
  let pieces = [];
  let score = 0;
  let best = Number(localStorage.getItem("bb_best") || 0);
  let cell = 0, gap = 0, dpr = 1;
  let history = null;            // Schnappschuss für Undo (1 Schritt)
  let soundOn = localStorage.getItem("bb_sound") !== "off";
  let difficulty = localStorage.getItem("bb_diff") || "normal";
  let scoreAnim = 0;            // animierter, hochzählender Punktestand

  // Animations-Objekte
  let particles = [];          // {x,y,vx,vy,life,max,color,size}
  let clearing = [];           // {x,y,color,t} verblassende gelöschte Zellen
  let floaters = [];           // {x,y,text,t,color}

  bestEl.textContent = best;
  diffSel.value = difficulty;
  updateSoundBtn();

  // ---------- Resize ----------
  function resize() {
    const wrap = document.getElementById("board-wrap");
    const size = wrap.clientWidth - 20;
    dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    gap = Math.max(2, Math.round(size * 0.012));
    cell = (size - gap * (GRID + 1)) / GRID;
  }
  const cellPos = (i) => gap + i * (cell + gap);
  const cellCenter = (i) => cellPos(i) + cell / 2;

  // ---------- Board ----------
  function newBoard() {
    board = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBlock(x, y, color, scale) {
    const radius = Math.max(4, cell * 0.18);
    let w = cell, h = cell, ox = x, oy = y;
    if (scale && scale !== 1) {
      w = cell * scale; h = cell * scale;
      ox = x + (cell - w) / 2; oy = y + (cell - h) / 2;
    }
    ctx.fillStyle = color;
    roundRect(ox, oy, w, h, radius);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ox + w * 0.12, oy + h * 0.1, w * 0.76, h * 0.26, radius * 0.6);
    ctx.fill();
  }

  let dragPreview = null;

  function render() {
    ctx.save();
    ctx.scale(dpr, dpr);
    const px = canvas.width / dpr;
    ctx.clearRect(0, 0, px, px);
    const radius = Math.max(4, cell * 0.18);

    // leeres Raster + gesetzte Blöcke
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = cellPos(c), y = cellPos(r), v = board[r][c];
        if (v === null) {
          ctx.fillStyle = "#2c3150";
          roundRect(x, y, cell, cell, radius);
          ctx.fill();
        } else {
          drawBlock(x, y, COLORS[v]);
        }
      }
    }

    // verblassende gelöschte Zellen
    for (const cl of clearing) {
      ctx.globalAlpha = Math.max(0, 1 - cl.t);
      drawBlock(cl.x, cl.y, cl.color, 1 - cl.t * 0.7);
      ctx.globalAlpha = 1;
    }

    // Partikel
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Drag-Vorschau
    if (dragPreview) {
      const { color, valid, cells } = dragPreview;
      ctx.globalAlpha = valid ? 0.55 : 0.3;
      for (const [r, c] of cells) {
        if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
        ctx.fillStyle = valid ? COLORS[color] : "#ff5c5c";
        roundRect(cellPos(c), cellPos(r), cell, cell, radius);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // schwebende Punkte-Texte
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.t);
      ctx.fillStyle = f.color;
      ctx.font = `800 ${Math.round(cell * 0.7)}px -apple-system, Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.text, f.x, f.y - f.t * cell * 1.2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ---------- Animationsschleife ----------
  let last = 0;
  function loop(ts) {
    const dt = last ? Math.min(50, ts - last) : 16;
    last = ts;

    for (const p of particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += dt * 0.02;     // Schwerkraft
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    for (const cl of clearing) cl.t += dt / 300;
    clearing = clearing.filter(c => c.t < 1);

    for (const f of floaters) f.t += dt / 1000;
    floaters = floaters.filter(f => f.t < 1);

    if (scoreAnim < score) {
      scoreAnim = Math.min(score, scoreAnim + Math.max(1, Math.ceil((score - scoreAnim) / 8)));
      scoreEl.textContent = scoreAnim;
    }

    render();
    requestAnimationFrame(loop);
  }

  // ---------- Pieces ----------
  function shapeWeight(size) {
    // Schwierigkeit beeinflusst Wahrscheinlichkeit großer Teile
    if (difficulty === "easy") return size <= 2 ? 4 : size <= 4 ? 2 : 1;
    if (difficulty === "hard") return size >= 6 ? 4 : size >= 4 ? 2 : 1;
    return 1; // normal: gleichverteilt
  }

  function pickShape() {
    const weighted = [];
    for (const s of SHAPES) weighted.push({ s, w: shapeWeight(s.length) });
    let total = weighted.reduce((a, b) => a + b.w, 0);
    let roll = Math.random() * total;
    for (const item of weighted) {
      roll -= item.w;
      if (roll <= 0) return item.s;
    }
    return SHAPES[0];
  }

  function randPiece() {
    const shape = pickShape();
    const color = (Math.random() * COLORS.length) | 0;
    let maxR = 0, maxC = 0;
    for (const [r, c] of shape) { maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
    return { shape, color, rows: maxR + 1, cols: maxC + 1, used: false };
  }

  function refillTray() {
    pieces = [randPiece(), randPiece(), randPiece()];
    renderTray();
  }

  function renderTray() {
    trayEl.innerHTML = "";
    pieces.forEach((p, i) => {
      if (p.used) {
        const ph = document.createElement("div");
        ph.style.width = "60px";
        trayEl.appendChild(ph);
        return;
      }
      const el = document.createElement("div");
      el.className = "piece";
      const pc = Math.min(26, 120 / Math.max(p.rows, p.cols));
      el.style.gridTemplateColumns = `repeat(${p.cols}, var(--pc))`;
      el.style.setProperty("--pc", pc + "px");
      const filled = new Set(p.shape.map(([r, c]) => r + "," + c));
      for (let r = 0; r < p.rows; r++) {
        for (let c = 0; c < p.cols; c++) {
          const d = document.createElement("div");
          const on = filled.has(r + "," + c);
          d.className = "pcell" + (on ? "" : " empty");
          if (on) d.style.background = COLORS[p.color];
          el.appendChild(d);
        }
      }
      attachDrag(el, i);
      trayEl.appendChild(el);
    });
  }

  // ---------- Placement ----------
  function canPlace(piece, baseR, baseC) {
    for (const [r, c] of piece.shape) {
      const rr = baseR + r, cc = baseC + c;
      if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) return false;
      if (board[rr][cc] !== null) return false;
    }
    return true;
  }

  function snapshot() {
    history = {
      board: board.map(row => row.slice()),
      pieces: pieces.map(p => ({ ...p, shape: p.shape })),
      score
    };
    undoBtn.disabled = false;
  }

  function undo() {
    if (!history) return;
    board = history.board.map(row => row.slice());
    pieces = history.pieces.map(p => ({ ...p }));
    score = history.score;
    scoreAnim = score;
    scoreEl.textContent = score;
    history = null;
    undoBtn.disabled = true;
    overlay.classList.add("hidden");
    clearing = []; particles = []; floaters = [];
    renderTray();
    sound("undo");
  }

  function placePiece(piece, baseR, baseC) {
    snapshot();
    for (const [r, c] of piece.shape) board[baseR + r][baseC + c] = piece.color;
    score += piece.shape.length;
    sound("place");
    clearLines();
    updateBest();
  }

  function clearLines() {
    const fullRows = [], fullCols = [];
    for (let r = 0; r < GRID; r++) if (board[r].every(v => v !== null)) fullRows.push(r);
    for (let c = 0; c < GRID; c++) {
      let full = true;
      for (let r = 0; r < GRID; r++) if (board[r][c] === null) { full = false; break; }
      if (full) fullCols.push(c);
    }
    const total = fullRows.length + fullCols.length;
    if (total === 0) return;

    const cleared = new Set();
    for (const r of fullRows) for (let c = 0; c < GRID; c++) cleared.add(r + "," + c);
    for (const c of fullCols) for (let r = 0; r < GRID; r++) cleared.add(r + "," + c);

    // Animationen + Partikel pro gelöschter Zelle
    for (const key of cleared) {
      const [r, c] = key.split(",").map(Number);
      const color = COLORS[board[r][c]];
      const x = cellPos(c), y = cellPos(r);
      clearing.push({ x, y, color, t: 0 });
      const cx = x + cell / 2, cy = y + cell / 2;
      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1,
          life: 500 + Math.random() * 300, max: 800,
          color, size: cell * (0.08 + Math.random() * 0.1)
        });
      }
      board[r][c] = null;
    }

    const bonus = total * 10 * total;
    score += bonus;
    floaters.push({
      x: canvas.width / dpr / 2, y: canvas.width / dpr / 2,
      text: "+" + bonus, t: 0, color: "#ffd24a"
    });
    showCombo(total, bonus);
    sound(total >= 2 ? "combo" : "clear", total);
  }

  function showCombo(n, bonus) {
    comboEl.textContent = n >= 2 ? `Combo x${n}! +${bonus}` : `Linie! +${bonus}`;
    comboEl.classList.add("show");
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => comboEl.classList.remove("show"), 900);
  }

  function updateBest() {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem("bb_best", String(best));
    }
  }

  // ---------- Game Over ----------
  function anyMoveLeft() {
    for (const p of pieces) {
      if (p.used) continue;
      for (let r = 0; r < GRID; r++)
        for (let c = 0; c < GRID; c++)
          if (canPlace(p, r, c)) return true;
    }
    return false;
  }

  function afterMove() {
    if (pieces.every(p => p.used)) refillTray();
    if (!anyMoveLeft()) gameOver();
  }

  function gameOver() {
    finalScoreEl.textContent = score;
    overlay.classList.remove("hidden");
    sound("over");
  }

  // ---------- Sound (Web Audio API) ----------
  let actx = null;
  function ensureAudio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
  }
  function tone(freq, dur, type = "sine", gain = 0.15, delay = 0) {
    if (!soundOn || !actx) return;
    const t0 = actx.currentTime + delay;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  function sound(kind, n = 1) {
    if (!soundOn) return;
    ensureAudio();
    if (!actx) return;
    if (kind === "place") tone(330, 0.12, "triangle", 0.12);
    else if (kind === "clear") { tone(523, 0.15, "triangle"); tone(784, 0.18, "triangle", 0.12, 0.06); }
    else if (kind === "combo") {
      const base = [523, 659, 784, 988, 1175];
      for (let i = 0; i < Math.min(n + 1, base.length); i++) tone(base[i], 0.18, "triangle", 0.12, i * 0.07);
    }
    else if (kind === "undo") tone(220, 0.1, "sine", 0.1);
    else if (kind === "over") { tone(440, 0.25, "sawtooth", 0.12); tone(330, 0.3, "sawtooth", 0.12, 0.12); tone(220, 0.4, "sawtooth", 0.12, 0.26); }
  }

  function updateSoundBtn() {
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    soundBtn.classList.toggle("off", !soundOn);
  }

  // ---------- Drag & Drop ----------
  let drag = null;

  function attachDrag(el, index) {
    el.addEventListener("pointerdown", (e) => startDrag(e, el, index));
  }

  function startDrag(e, el, index) {
    const piece = pieces[index];
    if (piece.used) return;
    e.preventDefault();
    ensureAudio();
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");

    const ghost = el.cloneNode(true);
    ghost.classList.remove("dragging");
    Object.assign(ghost.style, {
      position: "fixed", pointerEvents: "none", zIndex: "50", opacity: "0.9"
    });
    document.body.appendChild(ghost);

    drag = { piece, index, el, ghost, pointerId: e.pointerId, target: null };
    moveDrag(e);
    el.addEventListener("pointermove", moveDrag);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  function moveDrag(e) {
    if (!drag) return;
    const p = drag.piece;
    drag.ghost.style.left = (e.clientX - p.cols * 14) + "px";
    drag.ghost.style.top = (e.clientY - p.rows * 14 - 40) + "px";

    const rect = canvas.getBoundingClientRect();
    const fingerX = e.clientX - rect.left;
    const fingerY = e.clientY - rect.top - 40;
    const baseC = Math.round((fingerX - gap - cell / 2) / (cell + gap)) - ((p.cols - 1) >> 1);
    const baseR = Math.round((fingerY - gap - cell / 2) / (cell + gap)) - ((p.rows - 1) >> 1);

    const valid = canPlace(p, baseR, baseC);
    drag.target = valid ? { baseR, baseC } : null;
    dragPreview = {
      color: p.color, valid,
      cells: p.shape.map(([r, c]) => [baseR + r, baseC + c])
    };
  }

  function endDrag() {
    if (!drag) return;
    const { piece, el, ghost, target } = drag;
    el.classList.remove("dragging");
    el.removeEventListener("pointermove", moveDrag);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);

    if (target && canPlace(piece, target.baseR, target.baseC)) {
      placePiece(piece, target.baseR, target.baseC);
      piece.used = true;
      renderTray();
      afterMove();
    }
    drag = null;
    dragPreview = null;
  }

  // ---------- Controls ----------
  function restart() {
    score = 0; scoreAnim = 0;
    scoreEl.textContent = 0;
    newBoard();
    refillTray();
    history = null;
    undoBtn.disabled = true;
    clearing = []; particles = []; floaters = [];
    overlay.classList.add("hidden");
  }

  document.getElementById("overlay-restart").addEventListener("click", restart);
  undoBtn.addEventListener("click", undo);
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("bb_sound", soundOn ? "on" : "off");
    updateSoundBtn();
    if (soundOn) { ensureAudio(); sound("place"); }
  });
  diffSel.addEventListener("change", () => {
    difficulty = diffSel.value;
    localStorage.setItem("bb_diff", difficulty);
    restart();
  });

  // ---------- Init ----------
  window.addEventListener("resize", resize);
  newBoard();
  resize();
  refillTray();
  scoreEl.textContent = 0;
  requestAnimationFrame(loop);
})();
