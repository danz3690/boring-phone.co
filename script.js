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
    if (name === "snake") Snake.setActive(true);
  }

  function closeWin(name) {
    var rec = wins[name];
    rec.el.classList.remove("is-open", "is-max");
    rec.min = false;
    Sound.close();
    if (rec.taskbtn) { rec.taskbtn.remove(); rec.taskbtn = null; }
    if (name === "photos") Slide.setActive(false);
    if (name === "snake") Snake.setActive(false);
  }

  function minimizeWin(name) {
    var rec = wins[name];
    rec.el.classList.remove("is-open");
    rec.min = true;
    Sound.click();
    syncTasks();
    if (name === "photos") Slide.setActive(false);
    if (name === "snake") Snake.setActive(false);
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

  /* ================= SNAKE ================= */
  var Snake = (function () {
    var canvas = document.getElementById("snakeCanvas");
    if (!canvas) return { setActive: function () {} };
    var ctx = canvas.getContext("2d");
    var CELL = 16, COLS = 19, ROWS = 15;
    var BG = "#8ccf9c", INK = "#16341f";
    var scoreEl = document.getElementById("snakeScore");
    var hiEl = document.getElementById("snakeHi");
    var overlay = document.getElementById("snakeOverlay");
    var msgEl = document.getElementById("snakeMsg");
    var startBtn = document.getElementById("snakeStart");

    var snake, dir, nextDir, food, timer = null, speed, score;
    var running = false, active = false;
    var hi = 0;
    try { hi = parseInt(localStorage.getItem("bp_snake_hi") || "0", 10) || 0; } catch (e) {}
    hiEl.textContent = hi;

    function rand(n) { return Math.floor(Math.random() * n); }
    function newFood() {
      var f;
      do { f = { x: rand(COLS), y: rand(ROWS) }; }
      while (snake.some(function (s) { return s.x === f.x && s.y === f.y; }));
      return f;
    }
    function reset() {
      snake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
      dir = { x: 1, y: 0 }; nextDir = dir;
      food = newFood(); speed = 135; score = 0; scoreEl.textContent = "0";
    }
    function loop() { clearInterval(timer); timer = setInterval(step, speed); }
    function start() {
      reset(); draw();
      overlay.classList.add("is-hidden");
      running = true; loop();
    }
    function step() {
      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
          snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        return gameOver();
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++; scoreEl.textContent = String(score); Sound.click();
        food = newFood();
        if (speed > 75) { speed -= 4; loop(); }
      } else {
        snake.pop();
      }
      draw();
    }
    function gameOver() {
      running = false; clearInterval(timer); Sound.error();
      if (score > hi) { hi = score; hiEl.textContent = String(hi);
        try { localStorage.setItem("bp_snake_hi", String(hi)); } catch (e) {} }
      msgEl.textContent = "GAME OVER · " + score;
      startBtn.textContent = "↻ Play again";
      overlay.classList.remove("is-hidden");
    }
    function draw() {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(22,52,31,0.10)"; ctx.lineWidth = 1;
      for (var x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke(); }
      for (var y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke(); }
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      snake.forEach(function (s) { ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2); });
    }
    function setDir(d) {
      var map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      var nd = map[d]; if (!nd) return;
      if (nd.x === -dir.x && nd.y === -dir.y) return; // no 180°
      nextDir = nd;
    }

    document.addEventListener("keydown", function (e) {
      if (!active) return;
      var k = e.key.toLowerCase();
      var m = { arrowup: "up", w: "up", arrowdown: "down", s: "down",
                arrowleft: "left", a: "left", arrowright: "right", d: "right" };
      if (m[k]) { e.preventDefault(); if (running) setDir(m[k]); }
    });
    document.querySelectorAll(".snake__pad .dbtn").forEach(function (btn) {
      btn.addEventListener("click", function () { setDir(btn.dataset.dir); Sound.hover(); });
    });
    startBtn.addEventListener("click", start);

    reset(); draw();
    return {
      setActive: function (v) {
        active = v;
        if (!v) { clearInterval(timer); }
        else if (running) { loop(); }
      }
    };
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
