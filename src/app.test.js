import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initApp, PRESETS, STORAGE_KEY, todayIso } from "./app.js";

// Minimal in-memory Storage stand-in so tests don't depend on jsdom's
// localStorage persistence across cases.
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

const MARKUP = `
  <div id="presets"></div>
  <div id="time"></div>
  <div id="bar"></div>
  <button id="start"></button>
  <button id="reset"></button>
  <div id="status"></div>
  <span id="streak"></span>
`;

let storage;

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  storage = memoryStorage();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  return initApp({ doc: document, storage });
}

describe("initApp rendering", () => {
  it("renders the default 25:00 session and a zero streak", () => {
    setup();
    expect(document.getElementById("time").textContent).toBe("25:00");
    expect(document.getElementById("streak").textContent).toBe("0");
    expect(document.getElementById("start").textContent).toBe("Start");
  });

  it("builds one button per preset", () => {
    setup();
    const buttons = document.querySelectorAll("#presets .preset");
    expect(buttons).toHaveLength(PRESETS.length);
    expect([...buttons].map((b) => b.textContent)).toEqual(
      PRESETS.map((m) => `${m} min`),
    );
  });
});

describe("preset selection", () => {
  it("switching preset resets the displayed time", () => {
    setup();
    const first = document.querySelector('#presets [data-minutes="15"]');
    first.click();
    expect(document.getElementById("time").textContent).toBe("15:00");
  });
});

describe("start / pause", () => {
  it("start begins counting down and flips the label to Pause", () => {
    const app = setup();
    document.getElementById("start").click();
    expect(document.getElementById("start").textContent).toBe("Pause");

    vi.advanceTimersByTime(3000);
    expect(document.getElementById("time").textContent).toBe("24:57");
    expect(app.getState().running).toBe(true);
  });

  it("pause stops the countdown", () => {
    setup();
    const start = document.getElementById("start");
    start.click(); // running
    vi.advanceTimersByTime(2000);
    start.click(); // paused
    const frozen = document.getElementById("time").textContent;
    vi.advanceTimersByTime(5000);
    expect(document.getElementById("time").textContent).toBe(frozen);
  });
});

describe("reset", () => {
  it("restores the full duration and stops the timer", () => {
    setup();
    document.getElementById("start").click();
    vi.advanceTimersByTime(4000);
    document.getElementById("reset").click();
    expect(document.getElementById("time").textContent).toBe("25:00");
    expect(document.getElementById("start").textContent).toBe("Start");
  });
});

describe("session completion", () => {
  it("records today's completion in storage and shows the streak", () => {
    setup();
    // Use the shortest preset, then run it to zero.
    document.querySelector('#presets [data-minutes="15"]').click();
    document.getElementById("start").click();
    vi.advanceTimersByTime(15 * 60 * 1000);

    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    expect(saved).toContain(todayIso());
    expect(document.getElementById("streak").textContent).toBe("1");
    expect(document.getElementById("status").textContent).toBe(
      "Session complete. Nice detox.",
    );
  });
});
