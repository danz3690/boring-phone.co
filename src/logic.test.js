import { describe, it, expect } from "vitest";
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

describe("formatTime", () => {
  it("pads minutes and seconds", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(600)).toBe("10:00");
  });

  it("clamps negatives to zero", () => {
    expect(formatTime(-5)).toBe("00:00");
  });
});

describe("createSession", () => {
  it("builds a stopped session of the given length", () => {
    expect(createSession(25)).toEqual({
      remaining: 1500,
      total: 1500,
      running: false,
      completed: false,
    });
  });

  it("rejects non-positive durations", () => {
    expect(() => createSession(0)).toThrow();
    expect(() => createSession(-1)).toThrow();
  });
});

describe("tick", () => {
  it("counts down only while running", () => {
    const stopped = createSession(1);
    expect(tick(stopped)).toBe(stopped); // no change when not running

    const running = toggle(createSession(1));
    expect(tick(running).remaining).toBe(59);
  });

  it("marks the session completed at zero", () => {
    let state = { remaining: 1, total: 60, running: true, completed: false };
    state = tick(state);
    expect(state.remaining).toBe(0);
    expect(state.running).toBe(false);
    expect(state.completed).toBe(true);
  });
});

describe("toggle / reset", () => {
  it("toggles running but not after completion", () => {
    const s = createSession(5);
    expect(toggle(s).running).toBe(true);
    const done = { ...s, completed: true };
    expect(toggle(done)).toBe(done);
  });

  it("reset restores full duration and stops", () => {
    const s = { remaining: 3, total: 300, running: true, completed: false };
    expect(reset(s)).toEqual({
      remaining: 300,
      total: 300,
      running: false,
      completed: false,
    });
  });
});

describe("progress", () => {
  it("reports the elapsed fraction", () => {
    expect(progress({ remaining: 300, total: 300 })).toBe(0);
    expect(progress({ remaining: 150, total: 300 })).toBe(0.5);
    expect(progress({ remaining: 0, total: 300 })).toBe(1);
  });
});

describe("addCompletion", () => {
  it("dedupes and keeps history sorted", () => {
    let h = addCompletion([], "2026-06-28");
    h = addCompletion(h, "2026-06-27");
    h = addCompletion(h, "2026-06-28"); // duplicate
    expect(h).toEqual(["2026-06-27", "2026-06-28"]);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    const history = ["2026-06-26", "2026-06-27", "2026-06-28"];
    expect(computeStreak(history, "2026-06-28")).toBe(3);
  });

  it("is zero when today has no completion", () => {
    expect(computeStreak(["2026-06-26", "2026-06-27"], "2026-06-28")).toBe(0);
  });

  it("stops at the first gap", () => {
    const history = ["2026-06-24", "2026-06-27", "2026-06-28"];
    expect(computeStreak(history, "2026-06-28")).toBe(2);
  });
});
