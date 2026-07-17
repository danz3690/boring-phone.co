/* boringphone.co — Digital Detox OS
   Window manager + Web Audio sound engine. No dependencies, no assets. */
(function () {
  "use strict";

  /* ================= SOUND ENGINE ================= */
  var Sound = (function () {
    var ctx = null, master = null, enabled = true;

    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return true;
    }

    // one enveloped oscillator note
    function note(freq, start, dur, type, peak) {
      var t0 = ctx.currentTime + start;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak || 0.12, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    function play(seq, type, peak) {
      if (!enabled || !ensure()) return;
      seq.forEach(function (s) { note(s[0], s[1], s[2], type, peak); });
    }

    var lastTick = 0;
    return {
      unlock: function () { ensure(); },
      setEnabled: function (v) { enabled = v; },
      isEnabled: function () { return enabled; },
      click:  function () { play([[660, 0, 0.05], [880, 0.02, 0.05]], "square", 0.09); },
      hover:  function () { play([[1500, 0, 0.03]], "sine", 0.03); },
      open:   function () { play([[523, 0, 0.12], [659, 0.08, 0.12], [784, 0.16, 0.16]], "triangle", 0.11); },
      close:  function () { play([[784, 0, 0.1], [587, 0.07, 0.1], [440, 0.14, 0.14]], "triangle", 0.11); },
      startup:function () { play([[392,0,0.28],[523,0.14,0.28],[659,0.28,0.3],[784,0.42,0.5]], "triangle", 0.14); },
      error:  function () { play([[380, 0, 0.22], [300, 0.16, 0.28]], "square", 0.13); },
      tick:   function () {
        var now = Date.now();
        if (now - lastTick < 110) return;
        lastTick = now;
        play([[820, 0, 0.02]], "sine", 0.022);
      }
    };
  })();

  /* ================= WINDOW MANAGER ================= */
  var desktop = document.getElementById("desktop");
  var tasks = document.getElementById("tasks");
  var wins = {};
  var zTop = 20;
  var offsetSeed = 0;

  document.querySelectorAll(".win").forEach(function (w) {
    wins[w.dataset.win] = { el: w, taskbtn: null, min: false };
  });

  function centerish(w) {
    if (w.dataset.placed) return;
    var vw = window.innerWidth, vh = window.innerHeight - 40;
    var rect = w.getBoundingClientRect();
    var ww = rect.width || 520, wh = Math.min(rect.height || 400, vh * 0.8);
    var base = window.innerWidth < 640 ? 0 : 90;
    var x = Math.max(8, (vw - ww) / 2 + (base ? (offsetSeed % 4) * 26 - 40 : 0));
    var y = Math.max(8, (vh - wh) / 2 - 20 + (base ? (offsetSeed % 4) * 22 - 30 : 0));
    if (window.innerWidth >= 640) { w.style.left = x + "px"; w.style.top = y + "px"; }
    w.dataset.placed = "1";
    offsetSeed++;
  }

  function focusWin(name) {
    Object.keys(wins).forEach(function (k) { wins[k].el.classList.remove("is-focus"); });
    var w = wins[name].el;
    w.classList.add("is-focus");
    w.style.zIndex = ++zTop;
    syncTasks();
  }

  function openWin(name, silent) {
    var rec = wins[name];
    if (!rec) return;
    var wasOpen = rec.el.classList.contains("is-open") && !rec.min;
    centerish(rec.el);
    rec.el.classList.add("is-open");
    rec.min = false;
    focusWin(name);
    if (!wasOpen && !silent) (name === "bin" ? Sound.error : Sound.open)();
    ensureTaskbtn(name);
    syncTasks();
    if (name === "photos") Slide.setActive(true);
    if (name === "tetris") Tetris.setActive(true);
    if (name === "arcade") Arcade.setActive(true);
  }

  function closeWin(name) {
    var rec = wins[name];
    rec.el.classList.remove("is-open", "is-max");
    rec.min = false;
    Sound.close();
    if (rec.taskbtn) { rec.taskbtn.remove(); rec.taskbtn = null; }
    if (name === "photos") Slide.setActive(false);
    if (name === "tetris") Tetris.setActive(false);
    if (name === "arcade") Arcade.setActive(false);
  }

  function minimizeWin(name) {
    var rec = wins[name];
    rec.el.classList.remove("is-open");
    rec.min = true;
    Sound.click();
    syncTasks();
    if (name === "photos") Slide.setActive(false);
    if (name === "tetris") Tetris.setActive(false);
    if (name === "arcade") Arcade.setActive(false);
  }

  function toggleMax(name) {
    wins[name].el.classList.toggle("is-max");
    Sound.click();
  }

  function ensureTaskbtn(name) {
    var rec = wins[name];
    if (rec.taskbtn) return;
    var title = rec.el.querySelector(".win__title").textContent.trim();
    var btn = document.createElement("button");
    btn.className = "taskbtn";
    btn.textContent = title;
    btn.addEventListener("click", function () {
      if (rec.min || !rec.el.classList.contains("is-open")) { openWin(name); }
      else if (rec.el.classList.contains("is-focus")) { minimizeWin(name); }
      else { openWin(name); }
    });
    tasks.appendChild(btn);
    rec.taskbtn = btn;
  }

  function syncTasks() {
    Object.keys(wins).forEach(function (k) {
      var rec = wins[k];
      if (!rec.taskbtn) return;
      var active = rec.el.classList.contains("is-open") && rec.el.classList.contains("is-focus");
      rec.taskbtn.classList.toggle("is-active", active);
    });
  }

  /* window chrome buttons + drag */
  Object.keys(wins).forEach(function (name) {
    var w = wins[name].el;
    var bar = w.querySelector(".win__bar");

    w.addEventListener("mousedown", function () { focusWin(name); });
    w.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var a = b.dataset.act;
        if (a === "close") closeWin(name);
        else if (a === "min") minimizeWin(name);
        else if (a === "max") toggleMax(name);
      });
    });

    // dragging
    var drag = null;
    bar.addEventListener("mousedown", function (e) {
      if (e.target.closest("[data-act]")) return;
      if (w.classList.contains("is-max")) return;
      var r = w.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      focusWin(name);
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!drag) return;
      var x = e.clientX - drag.dx, y = e.clientY - drag.dy;
      x = Math.max(-40, Math.min(x, window.innerWidth - 60));
      y = Math.max(0, Math.min(y, window.innerHeight - 70));
      w.style.left = x + "px"; w.style.top = y + "px";
    });
    window.addEventListener("mouseup", function () { drag = null; });

    // touch drag
    bar.addEventListener("touchstart", function (e) {
      if (e.target.closest("[data-act]")) return;
      if (w.classList.contains("is-max")) return;
      var t = e.touches[0], r = w.getBoundingClientRect();
      drag = { dx: t.clientX - r.left, dy: t.clientY - r.top };
      focusWin(name);
    }, { passive: true });
    bar.addEventListener("touchmove", function (e) {
      if (!drag) return;
      var t = e.touches[0];
      w.style.left = Math.max(0, t.clientX - drag.dx) + "px";
      w.style.top = Math.max(0, t.clientY - drag.dy) + "px";
    }, { passive: true });
    bar.addEventListener("touchend", function () { drag = null; });

    // scroll ticks inside window body
    var body = w.querySelector(".win__body");
    if (body) body.addEventListener("scroll", function () { Sound.tick(); }, { passive: true });
  });

  /* ================= OPENERS (icons, buttons, start menu) ================= */
  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open]");
    if (opener) {
      openWin(opener.dataset.open);
      closeStart();
      return;
    }
    var actor = e.target.closest("[data-act='close']");
    if (actor && actor.closest(".win--bin")) closeWin("bin");
  });

  // desktop icon selection highlight + click sound
  document.querySelectorAll(".icon").forEach(function (ic) {
    ic.addEventListener("click", function () {
      document.querySelectorAll(".icon").forEach(function (i) { i.classList.remove("is-sel"); });
      ic.classList.add("is-sel");
    });
  });
  desktop.addEventListener("mousedown", function (e) {
    if (e.target === desktop) document.querySelectorAll(".icon").forEach(function (i) { i.classList.remove("is-sel"); });
  });

  /* generic click/hover SFX on interactive chrome */
  document.addEventListener("click", function (e) {
    if (e.target.closest(".xp-btn, .icon, .sm-item, .taskbtn, .win__b, .startbtn, .tiktok, .facts__list a, .contact__mail")) {
      Sound.click();
    }
  });
  document.querySelectorAll(".icon, .sm-item, .xp-btn").forEach(function (el) {
    el.addEventListener("mouseenter", function () { Sound.hover(); });
  });

  /* ================= START MENU ================= */
  var startbtn = document.getElementById("startbtn");
  var startmenu = document.getElementById("startmenu");
  function openStart() { startmenu.classList.add("is-open"); startbtn.classList.add("is-on"); startmenu.setAttribute("aria-hidden", "false"); }
  function closeStart() { startmenu.classList.remove("is-open"); startbtn.classList.remove("is-on"); startmenu.setAttribute("aria-hidden", "true"); }
  startbtn.addEventListener("click", function (e) {
    e.stopPropagation();
    Sound.click();
    startmenu.classList.contains("is-open") ? closeStart() : openStart();
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#startmenu") && !e.target.closest("#startbtn")) closeStart();
  });

  /* ================= SOUND TOGGLE ================= */
  var sndToggle = document.getElementById("sndToggle");
  sndToggle.addEventListener("click", function () {
    var on = !Sound.isEnabled();
    Sound.setEnabled(on);
    sndToggle.textContent = on ? "🔊" : "🔇";
    sndToggle.classList.toggle("is-off", !on);
    sndToggle.setAttribute("aria-pressed", String(on));
    if (on) { Sound.unlock(); Sound.click(); }
  });

  /* ================= CLOCK ================= */
  var clock = document.getElementById("clock");
  function tickClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  tickClock(); setInterval(tickClock, 15000);

  /* ================= SHUTDOWN ================= */
  var shutScreen = document.getElementById("shutdownScreen");
  document.getElementById("shutdown").addEventListener("click", function () {
    closeStart();
    Sound.close();
    shutScreen.classList.add("is-on");
    shutScreen.setAttribute("aria-hidden", "false");
  });
  document.getElementById("shutdownBack").addEventListener("click", function () {
    shutScreen.classList.remove("is-on");
    shutScreen.setAttribute("aria-hidden", "true");
    Sound.open();
  });

  /* ================= PHOTOS SLIDESHOW ================= */
  var Slide = (function () {
    var img = document.getElementById("slideImg");
    if (!img) return { setActive: function () {} };
    var capEl = document.getElementById("slideCap");
    var dotsEl = document.getElementById("slideDots");
    var playBtn = document.getElementById("slidePlay");
    var barI = document.querySelector("#slideBar i");
    var DUR = 4200;
    var photos = [
      { src: "assets/photo1.png", cap: "Put the phone down." },
      { src: "assets/photo2.png", cap: "Touch grass — side effects may include joy." },
      { src: "assets/photo3.png", cap: "Remember dial-up? Patience used to be a feature." },
      { src: "assets/photo4.png", cap: "0 notifications. As designed." },
      { src: "assets/photo5.png", cap: "A high score beats a high screen-time." }
    ];
    var i = 0, playing = true, active = false, timer = null;

    photos.forEach(function (_, n) {
      var d = document.createElement("button");
      d.addEventListener("click", function () { go(n); });
      dotsEl.appendChild(d);
    });
    var dots = dotsEl.children;

    function resetBar() {
      barI.style.transition = "none";
      barI.style.width = "0%";
      void barI.offsetWidth; // reflow
      if (playing && active) {
        barI.style.transition = "width " + DUR + "ms linear";
        barI.style.width = "100%";
      }
    }
    function freezeBar() {
      var w = getComputedStyle(barI).width;
      barI.style.transition = "none";
      barI.style.width = w;
    }
    function render() {
      img.src = photos[i].src;
      capEl.textContent = photos[i].cap;
      for (var k = 0; k < dots.length; k++) dots[k].classList.toggle("is-on", k === i);
      resetBar();
    }
    function schedule() {
      clearTimeout(timer);
      if (playing && active) timer = setTimeout(function () { go(i + 1); }, DUR);
    }
    function go(n) {
      i = (n + photos.length) % photos.length;
      render(); schedule();
    }
    function setPlaying(p) {
      playing = p;
      playBtn.textContent = p ? "⏸ Pause" : "▶ Play";
      playBtn.setAttribute("aria-pressed", String(p));
      if (p) { resetBar(); schedule(); } else { clearTimeout(timer); freezeBar(); }
    }
    playBtn.addEventListener("click", function () { setPlaying(!playing); });
    document.getElementById("slideNext").addEventListener("click", function () { Sound.click(); go(i + 1); });
    document.getElementById("slidePrev").addEventListener("click", function () { Sound.click(); go(i - 1); });

    render();
    return {
      setActive: function (v) {
        active = v;
        if (v) { render(); schedule(); } else { clearTimeout(timer); freezeBar(); }
      }
    };
  })();

  /* ================= TETRIS (greyscale, old-school) ================= */
  var Tetris = (function () {
    var canvas = document.getElementById("tetrisCanvas");
    if (!canvas) return { setActive: function () {} };
    var ctx = canvas.getContext("2d");
    var COLS = 10, ROWS = 18, CELL = 14;
    var scoreEl = document.getElementById("tScore");
    var linesEl = document.getElementById("tLines");
    var levelEl = document.getElementById("tLevel");
    var overlay = document.getElementById("tetrisOverlay");
    var msgEl = document.getElementById("tetrisMsg");
    var startBtn = document.getElementById("tetrisStart");

    var SHAPES = {
      I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]]
    };
    var KEYS = Object.keys(SHAPES);
    var grid, cur, timer = null, dropMs, score, lines, level, running = false, active = false;

    function emptyGrid() { var g = []; for (var y = 0; y < ROWS; y++) g.push(new Array(COLS).fill(0)); return g; }
    function collide(m, px, py) {
      for (var y = 0; y < m.length; y++) for (var x = 0; x < m[y].length; x++) {
        if (m[y][x]) { var nx = px + x, ny = py + y;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && grid[ny][nx]) return true; }
      }
      return false;
    }
    function spawn() {
      var k = KEYS[Math.floor(Math.random() * KEYS.length)];
      var m = SHAPES[k].map(function (r) { return r.slice(); });
      cur = { m: m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
      if (collide(cur.m, cur.x, cur.y)) gameOver();
    }
    function merge() {
      cur.m.forEach(function (row, y) { row.forEach(function (v, x) {
        if (v) { var ny = cur.y + y; if (ny >= 0) grid[ny][cur.x + x] = 1; } }); });
    }
    function rotate() {
      var m = cur.m, R = m[0].length, C = m.length, nm = [];
      for (var x = 0; x < R; x++) { nm.push([]); for (var y = C - 1; y >= 0; y--) nm[x].push(m[y][x]); }
      if (!collide(nm, cur.x, cur.y)) cur.m = nm;
      else if (!collide(nm, cur.x - 1, cur.y)) { cur.x--; cur.m = nm; }
      else if (!collide(nm, cur.x + 1, cur.y)) { cur.x++; cur.m = nm; }
    }
    function clearLines() {
      var cleared = 0;
      for (var y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(function (v) { return v; })) {
          grid.splice(y, 1); grid.unshift(new Array(COLS).fill(0)); cleared++; y++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += [0, 40, 100, 300, 1200][cleared] * level;
        level = 1 + Math.floor(lines / 10);
        dropMs = Math.max(90, 600 - (level - 1) * 45);
        Sound.click(); update(); loop();
      }
    }
    function step() {
      if (!cur) return;
      if (!collide(cur.m, cur.x, cur.y + 1)) cur.y++;
      else { merge(); clearLines(); spawn(); }
      draw();
    }
    function move(dx) { if (cur && !collide(cur.m, cur.x + dx, cur.y)) cur.x += dx; draw(); }
    function hardDrop() { if (!cur) return; while (!collide(cur.m, cur.x, cur.y + 1)) cur.y++; step(); }
    function loop() { clearInterval(timer); timer = setInterval(step, dropMs); }
    function update() { scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level; }
    function cell(x, y, filled, bg) {
      var px = x * CELL, py = y * CELL;
      if (filled) {
        ctx.fillStyle = "#3a3d38"; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = "#71746c"; ctx.fillRect(px + 3, py + 3, CELL - 7, CELL - 7);
      } else if (bg) {
        ctx.strokeStyle = "rgba(58,61,56,0.12)"; ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
      }
    }
    function draw() {
      ctx.fillStyle = "#b7b9b1"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) cell(x, y, grid[y][x] ? 1 : 0, true);
      if (cur) cur.m.forEach(function (row, y) { row.forEach(function (v, x) { if (v) cell(cur.x + x, cur.y + y, 1, false); }); });
    }
    function start() {
      grid = emptyGrid(); score = 0; lines = 0; level = 1; dropMs = 600;
      update(); spawn(); draw(); overlay.classList.add("is-hidden"); running = true; loop();
    }
    function gameOver() {
      running = false; clearInterval(timer); Sound.error();
      msgEl.textContent = "GAME OVER · " + score;
      startBtn.textContent = "↻ Play again"; overlay.classList.remove("is-hidden");
    }
    document.addEventListener("keydown", function (e) {
      if (!active || !running) return;
      var k = e.key;
      if (k === "ArrowLeft") { e.preventDefault(); move(-1); }
      else if (k === "ArrowRight") { e.preventDefault(); move(1); }
      else if (k === "ArrowUp" || k.toLowerCase() === "x") { e.preventDefault(); rotate(); draw(); }
      else if (k === "ArrowDown") { e.preventDefault(); step(); }
      else if (k === " ") { e.preventDefault(); hardDrop(); }
    });
    document.querySelectorAll(".tetris__pad .dbtn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!running) return; var t = b.dataset.t;
        if (t === "left") move(-1); else if (t === "right") move(1);
        else if (t === "rotate") { rotate(); draw(); } else if (t === "down") step();
        else if (t === "drop") hardDrop(); Sound.hover();
      });
    });
    startBtn.addEventListener("click", start);
    grid = emptyGrid(); draw();
    return { setActive: function (v) { active = v; if (!v) clearInterval(timer); else if (running) loop(); } };
  })();

  /* ================= ARCADE (Pinball · Quarantine · Match) ================= */
  var Arcade = (function () {
    var canvas = document.getElementById("arcadeCanvas");
    if (!canvas) return { setActive: function () {} };
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var overlay = document.getElementById("arcadeOverlay");
    var msgEl = document.getElementById("arcadeMsg");
    var startBtn = document.getElementById("arcadeStart");
    var hintEl = document.getElementById("arcadeHint");
    var statusEl = document.getElementById("arcadeStatus");
    var cardsWrap = document.getElementById("matchCards");
    var tabs = document.querySelectorAll(".atab");

    var META = {
      pinball: { name: "PINBALL", hint: "keep it alive — ← → keys or drag the paddle" },
      quarantine: { name: "QUARANTINE", hint: "stay home — drag or arrows to dodge the germs" },
      match: { name: "MATCH", hint: "flip two cards — find every pair" }
    };
    var current = "pinball", active = false, running = false, raf = null;
    var keys = {};

    function setStatus(s) { statusEl.textContent = s; }
    function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    /* input */
    document.addEventListener("keydown", function (e) {
      if (!active) return; keys[e.key] = true;
      if (running && current !== "match" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].indexOf(e.key) >= 0) e.preventDefault();
    });
    document.addEventListener("keyup", function (e) { keys[e.key] = false; });

    var ptr = { x: W / 2, y: H / 2, down: false };
    function rel(e) {
      var r = canvas.getBoundingClientRect();
      var t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height) };
    }
    canvas.addEventListener("pointerdown", function (e) { ptr.down = true; var p = rel(e); ptr.x = p.x; ptr.y = p.y; });
    canvas.addEventListener("pointermove", function (e) { if (!ptr.down && !(e.buttons)) { var q = rel(e); ptr.x = q.x; ptr.y = q.y; return; } var p = rel(e); ptr.x = p.x; ptr.y = p.y; });
    window.addEventListener("pointerup", function () { ptr.down = false; });

    /* ---------- PINBALL (paddle + bumpers) ---------- */
    var P = {};
    function pinInit() {
      P = { balls: 3, score: 0, paddle: { x: W / 2, w: 66, y: H - 18, h: 9 },
        ball: null, bumpers: [{ x: 80, y: 120, r: 18 }, { x: 220, y: 120, r: 18 }, { x: 150, y: 200, r: 20 }] };
      pinBall();
      setStatus("Score 0 · Balls 3");
    }
    function pinBall() { P.ball = { x: W / 2, y: 60, vx: (Math.random() * 2 - 1) * 2, vy: 2.4, r: 7 }; }
    function pinStep() {
      var b = P.ball, pd = P.paddle;
      if (keys["ArrowLeft"]) pd.x -= 6; if (keys["ArrowRight"]) pd.x += 6;
      if (ptr.down) pd.x = ptr.x;
      pd.x = Math.max(pd.w / 2, Math.min(W - pd.w / 2, pd.x));
      b.vy += 0.14; b.x += b.vx; b.y += b.vy;
      if (b.x < b.r) { b.x = b.r; b.vx = -b.vx; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx; }
      if (b.y < b.r) { b.y = b.r; b.vy = -b.vy; }
      P.bumpers.forEach(function (bp) {
        var dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy) || 1;
        if (d < bp.r + b.r) {
          var nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
          b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
          b.x = bp.x + nx * (bp.r + b.r); b.y = bp.y + ny * (bp.r + b.r);
          P.score += 10; setStatus("Score " + P.score + " · Balls " + P.balls); Sound.click();
        }
      });
      if (b.y + b.r >= pd.y && b.y < pd.y + pd.h && Math.abs(b.x - pd.x) <= pd.w / 2 + b.r && b.vy > 0) {
        b.y = pd.y - b.r; b.vy = -Math.abs(b.vy) - 0.4;
        b.vx += (b.x - pd.x) / (pd.w / 2) * 2.4; Sound.hover();
      }
      if (b.y > H + 20) {
        P.balls--;
        if (P.balls <= 0) { over("PINBALL · " + P.score); return; }
        setStatus("Score " + P.score + " · Balls " + P.balls); pinBall();
      }
      pinDraw();
    }
    function pinDraw() {
      ctx.fillStyle = "#0f1622"; ctx.fillRect(0, 0, W, H);
      P.bumpers.forEach(function (bp) {
        ctx.fillStyle = "#26324a"; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, 6.29); ctx.fill();
        ctx.fillStyle = "#4a6bb0"; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r * 0.5, 0, 6.29); ctx.fill();
      });
      var pd = P.paddle;
      ctx.fillStyle = "#cdd6e6"; ctx.fillRect(pd.x - pd.w / 2, pd.y, pd.w, pd.h);
      var b = P.ball; ctx.fillStyle = "#ffd21e"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.29); ctx.fill();
    }

    /* ---------- QUARANTINE (dodge) ---------- */
    var Q = {};
    function qInit() {
      Q = { p: { x: W / 2, y: H - 50, r: 9 }, germs: [], t: 0, spawn: 46, best: 0 };
      setStatus("Survive!  0.0s");
    }
    function qStep() {
      Q.t++;
      var p = Q.p;
      if (keys["ArrowLeft"]) p.x -= 3.4; if (keys["ArrowRight"]) p.x += 3.4;
      if (keys["ArrowUp"]) p.y -= 3.4; if (keys["ArrowDown"]) p.y += 3.4;
      if (ptr.down) { p.x += (ptr.x - p.x) * 0.25; p.y += (ptr.y - p.y) * 0.25; }
      p.x = Math.max(p.r, Math.min(W - p.r, p.x)); p.y = Math.max(p.r, Math.min(H - p.r, p.y));
      if (Q.t % Q.spawn === 0) {
        var edge = Math.floor(Math.random() * 4), gx, gy;
        if (edge === 0) { gx = Math.random() * W; gy = -10; }
        else if (edge === 1) { gx = Math.random() * W; gy = H + 10; }
        else if (edge === 2) { gx = -10; gy = Math.random() * H; }
        else { gx = W + 10; gy = Math.random() * H; }
        var ang = Math.atan2(p.y - gy, p.x - gx) + (Math.random() - 0.5) * 0.8;
        var sp = 1.4 + Q.t / 1600;
        Q.germs.push({ x: gx, y: gy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 8 });
        if (Q.spawn > 16) Q.spawn -= 1;
      }
      for (var i = Q.germs.length - 1; i >= 0; i--) {
        var g = Q.germs[i]; g.x += g.vx; g.y += g.vy;
        if (g.x < -30 || g.x > W + 30 || g.y < -30 || g.y > H + 30) { Q.germs.splice(i, 1); continue; }
        if (Math.hypot(g.x - p.x, g.y - p.y) < g.r + p.r) { over("QUARANTINE · " + (Q.t / 60).toFixed(1) + "s"); return; }
      }
      setStatus("Survive!  " + (Q.t / 60).toFixed(1) + "s");
      qDraw();
    }
    function qDraw() {
      ctx.fillStyle = "#101a12"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(120,200,140,0.10)";
      for (var x = 20; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = 20; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = "#ff5c5c";
      Q.germs.forEach(function (g) { ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.29); ctx.fill(); });
      ctx.fillStyle = "#7dffb0"; ctx.beginPath(); ctx.arc(Q.p.x, Q.p.y, Q.p.r, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#0c2c14"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText("home", Q.p.x, Q.p.y + 3);
    }

    /* ---------- MATCH (memory) ---------- */
    var M = {};
    function matchBuild() {
      cardsWrap.innerHTML = "";
      var faces = ["📱", "🕹️", "🧠", "🌿", "🔊", "📼", "💾", "☎️"];
      var deck = faces.concat(faces).sort(function () { return Math.random() - 0.5; });
      M = { deck: deck, open: [], matched: 0, moves: 0, lock: false };
      deck.forEach(function (face, idx) {
        var b = document.createElement("button");
        b.className = "mcard"; b.dataset.i = idx; b.dataset.face = face; b.textContent = face;
        b.addEventListener("click", function () { matchFlip(b); });
        cardsWrap.appendChild(b);
      });
      setStatus("Moves 0 · Pairs 0/8");
    }
    function matchFlip(b) {
      if (M.lock || b.classList.contains("flip") || b.classList.contains("done")) return;
      b.classList.add("flip"); Sound.click(); M.open.push(b);
      if (M.open.length === 2) {
        M.moves++; M.lock = true;
        var a = M.open[0], c = M.open[1];
        if (a.dataset.face === c.dataset.face) {
          setTimeout(function () {
            a.classList.add("done"); c.classList.add("done");
            a.classList.remove("flip"); c.classList.remove("flip");
            M.matched++; M.open = []; M.lock = false;
            setStatus("Moves " + M.moves + " · Pairs " + M.matched + "/8");
            if (M.matched === 8) { Sound.startup(); msgEl.textContent = "YOU WIN! · " + M.moves + " moves"; startBtn.textContent = "↻ Play again"; overlay.classList.remove("is-hidden"); running = false; }
          }, 260);
        } else {
          setTimeout(function () {
            a.classList.remove("flip"); c.classList.remove("flip");
            M.open = []; M.lock = false;
            setStatus("Moves " + M.moves + " · Pairs " + M.matched + "/8");
          }, 700);
        }
      }
    }

    /* ---------- manager ---------- */
    function loop() { stopLoop(); function fr() { if (!running) return; if (current === "pinball") pinStep(); else if (current === "quarantine") qStep(); raf = requestAnimationFrame(fr); } raf = requestAnimationFrame(fr); }
    function over(label) { running = false; stopLoop(); Sound.error(); msgEl.textContent = label; startBtn.textContent = "↻ Play again"; overlay.classList.remove("is-hidden"); }
    function showStageFor(game) {
      var isMatch = game === "match";
      canvas.style.display = isMatch ? "none" : "block";
      if (isMatch) cardsWrap.removeAttribute("hidden"); else cardsWrap.setAttribute("hidden", "");
    }
    function select(game) {
      stopLoop(); running = false;
      current = game;
      tabs.forEach(function (t) { t.classList.toggle("is-on", t.dataset.game === game); });
      msgEl.textContent = META[game].name; hintEl.textContent = META[game].hint;
      startBtn.textContent = "▶ Play";
      overlay.classList.remove("is-hidden");
      showStageFor(game);
      if (isMatchCards()) cardsWrap.innerHTML = "";
      setStatus("Press Play.");
    }
    function isMatchCards() { return current === "match"; }
    function start() {
      overlay.classList.add("is-hidden"); running = true;
      if (current === "pinball") { pinInit(); loop(); }
      else if (current === "quarantine") { qInit(); loop(); }
      else if (current === "match") { matchBuild(); }
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { Sound.click(); select(t.dataset.game); }); });
    startBtn.addEventListener("click", start);
    select("pinball");
    return {
      setActive: function (v) {
        active = v;
        if (!v) stopLoop();
        else if (running && current !== "match") loop();
      }
    };
  })();

  /* ================= NARRATOR (Web Speech, free, no key) ================= */
  var Speech = (function () {
    var synth = window.speechSynthesis;
    var utterCtor = window.SpeechSynthesisUtterance;
    if (!synth || !utterCtor) return { supported: false };
    var voice = null, speaking = false, stopped = false, queue = [], idx = 0, stateCb = null;

    function pickVoice() {
      var vs = synth.getVoices();
      if (!vs || !vs.length) return;
      var en = vs.filter(function (v) { return /^en(-|_|$)/i.test(v.lang); });
      var pool = en.length ? en : vs;
      // prefer modern "natural/neural" voices, then well-known good ones
      var prefs = [/natural/i, /neural/i, /google us english/i, /google uk english female/i,
                   /samantha/i, /\baria\b/i, /jenny/i, /\blibby\b/i, /sonia/i, /google/i, /\bzira\b/i];
      for (var i = 0; i < prefs.length; i++) {
        var m = pool.find(function (v) { return prefs[i].test(v.name); });
        if (m) { voice = m; return; }
      }
      voice = pool.find(function (v) { return /female/i.test(v.name); }) || pool[0];
    }
    pickVoice();
    try { synth.addEventListener("voiceschanged", pickVoice); } catch (e) {}

    function setState(v) { speaking = v; if (stateCb) stateCb(v); }
    function chunk(text) {
      return text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*(\s|$)/g) || [text];
    }
    function speakNext() {
      if (stopped || idx >= queue.length) { setState(false); return; }
      var u = new utterCtor(queue[idx].trim());
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      u.rate = 0.98; u.pitch = 1; u.volume = 1;
      u.onend = function () { idx++; speakNext(); };
      u.onerror = function () { idx++; speakNext(); };
      synth.speak(u);
    }
    function stop() { stopped = true; try { synth.cancel(); } catch (e) {} setState(false); }
    function start(text) {
      stop();
      if (!text) { return; }
      stopped = false; queue = chunk(text); idx = 0; setState(true); speakNext();
    }
    return {
      supported: true,
      toggle: function (text) { if (speaking) stop(); else start(text); },
      stop: stop,
      isSpeaking: function () { return speaking; },
      onState: function (cb) { stateCb = cb; },
      voiceName: function () { return voice ? voice.name : "system default"; }
    };
  })();

  (function wireNarrator() {
    var readBtns = Array.prototype.slice.call(document.querySelectorAll("[data-read]"));
    var narrator = document.getElementById("narrator");

    if (!Speech.supported) {
      readBtns.forEach(function (b) { b.style.display = "none"; });
      if (narrator) { narrator.style.display = "none"; }
      return;
    }
    if (narrator) narrator.title = "Narrator — reads the active window aloud (voice: " + Speech.voiceName() + ")";

    function textOf(winEl) {
      if (!winEl) return "";
      var body = winEl.querySelector(".win__body");
      if (!body) return "";
      var c = body.cloneNode(true);
      c.querySelectorAll("button, canvas, .marquee, .slide__dots, .slide__bar, .snake__pad, .snake__hud").forEach(function (e) { e.remove(); });
      return (c.innerText || c.textContent || "").replace(/\s+/g, " ").trim();
    }

    readBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        Speech.toggle(textOf(btn.closest(".win")));
      });
    });
    if (narrator) {
      narrator.addEventListener("click", function () {
        Sound.click();
        if (Speech.isSpeaking()) { Speech.stop(); return; }
        var f = document.querySelector(".win.is-focus.is-open") || document.getElementById("win-home");
        Speech.toggle(textOf(f));
      });
    }
    Speech.onState(function (on) {
      if (narrator) {
        narrator.textContent = on ? "⏹️" : "📢";
        narrator.classList.toggle("is-on", on);
        narrator.setAttribute("aria-pressed", String(on));
      }
      readBtns.forEach(function (b) {
        b.textContent = on ? "⏹ Stop reading" : "📖 Read aloud";
        b.classList.toggle("is-on", on);
      });
    });
    // stop narration if the spoken window is closed via its close button
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-act='close']") && Speech.isSpeaking()) Speech.stop();
    });
  })();

  /* ================= BOOT ================= */
  var boot = document.getElementById("boot");
  function startOS() {
    Sound.unlock();
    Sound.startup();
    boot.classList.add("is-gone");
    setTimeout(function () { openWin("home", true); Sound.open(); }, 650);
  }
  document.getElementById("bootStart").addEventListener("click", startOS);

  /* page-level scroll ticks (rare, since content lives in windows) */
  window.addEventListener("wheel", function () { if (!boot.classList.contains("is-gone")) return; Sound.tick(); }, { passive: true });
})();
