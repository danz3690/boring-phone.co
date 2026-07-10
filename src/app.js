// DOM wiring for the dopamine-detox focus timer.
// Exposes initApp() so the browser entry point (main.js) and the tests can
// both drive it against a real/simulated DOM.
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

export const PRESETS = [15, 25, 45];
export const STORAGE_KEY = "boring-phone.history";

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Wire the timer UI into the given document/storage and return a small
 * controller. Defaults read from the browser globals; tests pass their own.
 */
export function initApp({ doc = document, storage = localStorage } = {}) {
  const els = {
    time: doc.getElementById("time"),
    bar: doc.getElementById("bar"),
    start: doc.getElementById("start"),
    reset: doc.getElementById("reset"),
    presets: doc.getElementById("presets"),
    streak: doc.getElementById("streak"),
    status: doc.getElementById("status"),
  };

  let state = createSession(25);
  let intervalId = null;

  function loadHistory() {
    try {
      return JSON.parse(storage.getItem(STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    storage.setItem(STORAGE_KEY, JSON.stringify(history));
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
    const btn = doc.createElement("button");
    btn.className = "preset";
    btn.dataset.minutes = String(minutes);
    btn.textContent = `${minutes} min`;
    els.presets.appendChild(btn);
  }

  render();

  // Expose internals for tests / debugging.
  return { getState: () => state, render, stopInterval };
}
