// Browser entry point: wires the pure logic in logic.js to the DOM.
import {
  formatTime,
  createSession,
  tick,
  toggle,
  reset,
  progress,
  addCompletion,
  computeStreak,
} from "./logic.js";

const PRESETS = [15, 25, 45];
const STORAGE_KEY = "boring-phone.history";

const els = {
  time: document.getElementById("time"),
  bar: document.getElementById("bar"),
  start: document.getElementById("start"),
  reset: document.getElementById("reset"),
  presets: document.getElementById("presets"),
  streak: document.getElementById("streak"),
  status: document.getElementById("status"),
};

let state = createSession(25);
let intervalId = null;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function render() {
  els.time.textContent = formatTime(state.remaining);
  els.bar.style.width = `${(progress(state) * 100).toFixed(1)}%`;
  els.start.textContent = state.running ? "Pause" : "Start";
  els.streak.textContent = String(computeStreak(loadHistory(), todayIso()));

  if (state.completed) {
    els.status.textContent = "Session complete. Nice detox.";
  } else if (state.running) {
    els.status.textContent = "Stay off the phone…";
  } else {
    els.status.textContent = "Ready when you are.";
  }
}

function stopInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function loop() {
  state = tick(state);
  if (state.completed) {
    stopInterval();
    saveHistory(addCompletion(loadHistory(), todayIso()));
  }
  render();
}

els.start.addEventListener("click", () => {
  if (state.completed) return;
  state = toggle(state);
  stopInterval();
  if (state.running) intervalId = setInterval(loop, 1000);
  render();
});

els.reset.addEventListener("click", () => {
  stopInterval();
  state = reset(state);
  render();
});

els.presets.addEventListener("click", (e) => {
  const minutes = Number(e.target.dataset.minutes);
  if (!minutes) return;
  stopInterval();
  state = createSession(minutes);
  render();
});

// Build preset buttons.
for (const minutes of PRESETS) {
  const btn = document.createElement("button");
  btn.className = "preset";
  btn.dataset.minutes = String(minutes);
  btn.textContent = `${minutes} min`;
  els.presets.appendChild(btn);
}

render();
