/* Block Blast Clone — reines Vanilla JS, Maus + Touch */
(() => {
  "use strict";

  const GRID = 8;                 // 8x8 Spielfeld
  const COLORS = [
    "#4f7cff", "#ff5c8a", "#36d39a", "#ffb648",
    "#a76bff", "#3ad0e0", "#ff6b5c"
  ];

  // Alle Block-Formen (relative Koordinaten)
  const SHAPES = [
    [[0, 0]],                                              // 1er
    [[0, 0], [0, 1]],                                      // 2er horizontal
    [[0, 0], [1, 0]],                                      // 2er vertikal
    [[0, 0], [0, 1], [0, 2]],                              // 3er horizontal
    [[0, 0], [1, 0], [2, 0]],                              // 3er vertikal
    [[0, 0], [0, 1], [0, 2], [0, 3]],                      // 4er horizontal
    [[0, 0], [1, 0], [2, 0], [3, 0]],                      // 4er vertikal
    [[0, 0], [0, 1], [1, 0], [1, 1]],                      // 2x2 Quadrat
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],      // 2x3 Block
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],      // 3x2 Block
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], // 3x3
    [[0, 0], [1, 0], [1, 1]],                              // L klein (3)
    [[0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],                      // L groß
    [[0, 1], [1, 1], [2, 0], [2, 1]],                      // J groß
    [[0, 0], [0, 1], [0, 2], [1, 0]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],                      // T
    [[0, 0], [1, 0], [1, 1], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],                      // S/Z
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

  // --- State ---
  let board = [];                // board[r][c] = null | colorIndex
  let pieces = [];               // aktuelle Tray-Teile
  let score = 0;
  let best = Number(localStorage.getItem("bb_best") || 0);
  let cell = 0;                  // Pixelgröße einer Zelle
  let gap = 0;
  let dpr = 1;

  bestEl.textContent = best;

  // ---------- Setup / Resize ----------
  function resize() {
    const wrap = document.getElementById("board-wrap");
    const size = wrap.clientWidth - 20; // padding
    dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    gap = Math.max(2, Math.round(size * 0.012));
    cell = (size - gap * (GRID + 1)) / GRID;
    draw();
  }

  function cellPos(idx) {
    return gap + idx * (cell + gap);
  }

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

  function draw(preview) {
    ctx.save();
    ctx.scale(dpr, dpr);
    const px = canvas.width / dpr;
    ctx.clearRect(0, 0, px, px);

    const radius = Math.max(4, cell * 0.18);

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = cellPos(c), y = cellPos(r);
        const v = board[r][c];
        if (v === null) {
          ctx.fillStyle = "#2c3150";
          roundRect(x, y, cell, cell, radius);
          ctx.fill();
        } else {
          drawBlock(x, y, COLORS[v]);
        }
      }
    }

    // Vorschau des aktuell gezogenen Teils
    if (preview) {
      const { shape, color, valid, cells } = preview;
      ctx.globalAlpha = valid ? 0.55 : 0.3;
      for (const [r, c] of cells) {
        if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
        const x = cellPos(c), y = cellPos(r);
        ctx.fillStyle = valid ? COLORS[color] : "#ff5c5c";
        roundRect(x, y, cell, cell, radius);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBlock(x, y, color) {
    const radius = Math.max(4, cell * 0.18);
    ctx.fillStyle = color;
    roundRect(x, y, cell, cell, radius);
    ctx.fill();
    // Glanz oben
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(x + cell * 0.12, y + cell * 0.1, cell * 0.76, cell * 0.26, radius * 0.6);
    ctx.fill();
  }

  // ---------- Pieces ----------
  function randPiece() {
    const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
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

  // ---------- Placement Logic ----------
  function canPlace(piece, baseR, baseC) {
    for (const [r, c] of piece.shape) {
      const rr = baseR + r, cc = baseC + c;
      if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) return false;
      if (board[rr][cc] !== null) return false;
    }
    return true;
  }

  function placePiece(piece, baseR, baseC) {
    for (const [r, c] of piece.shape) {
      board[baseR + r][baseC + c] = piece.color;
    }
    score += piece.shape.length;
    clearLines();
    updateScore();
  }

  function clearLines() {
    const fullRows = [];
    const fullCols = [];
    for (let r = 0; r < GRID; r++) {
      if (board[r].every(v => v !== null)) fullRows.push(r);
    }
    for (let c = 0; c < GRID; c++) {
      let full = true;
      for (let r = 0; r < GRID; r++) if (board[r][c] === null) { full = false; break; }
      if (full) fullCols.push(c);
    }
    const total = fullRows.length + fullCols.length;
    if (total === 0) return;

    for (const r of fullRows) for (let c = 0; c < GRID; c++) board[r][c] = null;
    for (const c of fullCols) for (let r = 0; r < GRID; r++) board[r][c] = null;

    // Bonus: mehr gleichzeitig gelöste Linien = mehr Punkte
    const bonus = total * 10 * total;
    score += bonus;
    showCombo(total);
  }

  function showCombo(n) {
    if (n >= 2) {
      comboEl.textContent = `Combo x${n}! +${n * 10 * n}`;
    } else {
      comboEl.textContent = `Linie! +10`;
    }
    comboEl.classList.add("show");
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => comboEl.classList.remove("show"), 900);
  }

  function updateScore() {
    scoreEl.textContent = score;
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
  }

  // ---------- Drag & Drop (Maus + Touch) ----------
  let drag = null;

  function attachDrag(el, index) {
    el.addEventListener("pointerdown", (e) => startDrag(e, el, index));
  }

  function startDrag(e, el, index) {
    const piece = pieces[index];
    if (piece.used) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");

    // schwebendes Klon-Element zum Mitziehen
    const ghost = el.cloneNode(true);
    ghost.classList.remove("dragging");
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "50";
    ghost.style.opacity = "0.9";
    document.body.appendChild(ghost);

    drag = { piece, index, el, ghost, pointerId: e.pointerId };
    moveDrag(e);

    el.addEventListener("pointermove", moveDrag);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  function pointerToCell(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const c = Math.round((x - gap - cell / 2) / (cell + gap));
    const r = Math.round((y - gap - cell / 2) / (cell + gap));
    return { r, c };
  }

  function moveDrag(e) {
    if (!drag) return;
    const p = drag.piece;
    const pcSize = cell; // im Spielfeld-Maßstab anzeigen
    // Ghost positionieren (etwas über dem Finger für Sichtbarkeit)
    drag.ghost.style.left = (e.clientX - p.cols * 14) + "px";
    drag.ghost.style.top = (e.clientY - p.rows * 14 - 40) + "px";

    // Anker: obere linke Zelle des Teils, leicht über dem Finger
    const rect = canvas.getBoundingClientRect();
    const fingerX = e.clientX - rect.left;
    const fingerY = e.clientY - rect.top - 40; // Offset nach oben
    let baseC = Math.round((fingerX - gap - cell / 2) / (cell + gap)) - ((p.cols - 1) >> 1);
    let baseR = Math.round((fingerY - gap - cell / 2) / (cell + gap)) - ((p.rows - 1) >> 1);

    const valid = canPlace(p, baseR, baseC);
    const cells = p.shape.map(([r, c]) => [baseR + r, baseC + c]);
    drag.target = valid ? { baseR, baseC } : null;
    draw({ shape: p.shape, color: p.color, valid, cells });
  }

  function endDrag(e) {
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
    draw();
  }

  // ---------- Restart ----------
  function restart() {
    score = 0;
    updateScore();
    newBoard();
    refillTray();
    overlay.classList.add("hidden");
    draw();
  }

  document.getElementById("overlay-restart").addEventListener("click", restart);

  // ---------- Init ----------
  window.addEventListener("resize", resize);
  newBoard();
  resize();
  refillTray();
  updateScore();
})();
