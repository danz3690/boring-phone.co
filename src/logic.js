// Pure logic for the dopamine-detox focus timer.
// No DOM or browser APIs in here so it can be unit-tested in isolation.

/** Format a whole number of seconds as "MM:SS". */
export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Create a fresh timer state for a session of `durationMinutes`. */
export function createSession(durationMinutes) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("durationMinutes must be a positive number");
  }
  const total = Math.round(durationMinutes * 60);
  return { remaining: total, total, running: false, completed: false };
}

/** Advance the timer by one second. Returns a new state object. */
export function tick(state) {
  if (!state.running || state.completed) return state;
  const remaining = Math.max(0, state.remaining - 1);
  return {
    ...state,
    remaining,
    running: remaining > 0,
    completed: remaining === 0,
  };
}

/** Toggle the running flag (no-op once completed). */
export function toggle(state) {
  if (state.completed) return state;
  return { ...state, running: !state.running };
}

/** Reset the timer back to its full duration, stopped. */
export function reset(state) {
  return { remaining: state.total, total: state.total, running: false, completed: false };
}

/** Fraction of the session elapsed, in [0, 1]. */
export function progress(state) {
  if (state.total <= 0) return 0;
  return (state.total - state.remaining) / state.total;
}

/**
 * Record a completion on `isoDate` (YYYY-MM-DD) into a history array.
 * Dates are kept sorted and de-duplicated so a day only counts once.
 */
export function addCompletion(history, isoDate) {
  const set = new Set(history);
  set.add(isoDate);
  return [...set].sort();
}

/**
 * Count consecutive days ending at `todayIso` that appear in `history`.
 * Today not being present yields a streak of 0.
 */
export function computeStreak(history, todayIso) {
  const days = new Set(history);
  let streak = 0;
  let cursor = new Date(`${todayIso}T00:00:00Z`);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
