/* =========================================================================
   boring-phone.co — retro sound engine
   All sounds are SYNTHESIZED with the Web Audio API (no copyrighted AOL /
   Windows .wav files bundled). Drop your own files in /public/sounds/ to
   override — see /public/sounds/README.md.
   ========================================================================= */

type SoundName = 'click' | 'scroll' | 'hover' | 'modem' | 'mail' | 'error';

const STORAGE_KEY = 'bpc-sound-on';

/** Files that, if present in /public/sounds/, override the synth version. */
const OVERRIDE_FILES: Record<SoundName, string> = {
  click: '/sounds/click.wav',
  scroll: '/sounds/scroll.wav',
  hover: '/sounds/hover.wav',
  modem: '/sounds/modem.wav',
  mail: '/sounds/mail.wav',
  error: '/sounds/error.wav',
};

class RetroSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private buffers = new Map<SoundName, AudioBuffer | null>();
  enabled: boolean;

  constructor() {
    const prefersReduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default OFF when the user prefers reduced motion, otherwise remember choice.
    this.enabled = stored === null ? !prefersReduced : stored === '1';
  }

  /** Must be called from within a user gesture (e.g. the ENTER click). */
  unlock(): void {
    if (this.unlocked) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.unlocked = true;
    // Resume + prime within the caller's gesture so iOS/Safari and autoplay
    // policies actually let the first sound through.
    void this.ctx.resume();
    this.prime();
    // Try to load any user-supplied override files in the background.
    void this.preloadOverrides();
  }

  /** Play one inaudible sample to satisfy Safari/iOS "first sound" quirks. */
  private prime(): void {
    if (!this.ctx || !this.master) return;
    const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start(0);
  }

  private async preloadOverrides(): Promise<void> {
    if (!this.ctx) return;
    // Overrides only make sense when the site is served with its /sounds/
    // folder. A flag in <head> gates this, so single-file/embedded builds that
    // ship no manifest never make a doomed request. Synth is the default.
    if (!document.querySelector('meta[name="bpc-sound-overrides"]')) return;
    // Only load override files that are explicitly listed in the manifest, so a
    // default install makes no doomed requests (no 404 noise in the console).
    let names: SoundName[] = [];
    try {
      const res = await fetch('/sounds/manifest.json');
      if (!res.ok) return;
      const list: unknown = await res.json();
      if (Array.isArray(list)) {
        names = list.filter(
          (n): n is SoundName =>
            typeof n === 'string' && n in OVERRIDE_FILES,
        );
      }
    } catch {
      return; // no manifest — synth only
    }
    await Promise.all(
      names.map(async (name) => {
        try {
          const res = await fetch(OVERRIDE_FILES[name]);
          if (!res.ok) return;
          const data = await res.arrayBuffer();
          this.buffers.set(name, await this.ctx!.decodeAudioData(data));
        } catch {
          /* fall back to synth */
        }
      }),
    );
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    if (on) this.unlock();
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    if (!this.unlocked) this.unlock();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const override = this.buffers.get(name);
    if (override) {
      const src = this.ctx.createBufferSource();
      src.buffer = override;
      src.connect(this.master);
      src.start();
      return;
    }
    this.synth(name);
  }

  /* ---- synthesized sounds ------------------------------------------- */

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    when = 0,
    gain = 1,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private synth(name: SoundName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'click':
        // short, dry square blip — a Windows-ish UI click
        this.blip(440, 0.05, 'square', 0, 0.6);
        break;
      case 'scroll':
        // faint high tick
        this.blip(1100, 0.02, 'triangle', 0, 0.18);
        break;
      case 'hover':
        this.blip(760, 0.04, 'sine', 0, 0.3);
        break;
      case 'mail':
        // three-note "you've got mail"-style chime (original tune)
        this.blip(660, 0.12, 'sine', 0.0, 0.6);
        this.blip(880, 0.12, 'sine', 0.14, 0.6);
        this.blip(1180, 0.22, 'sine', 0.28, 0.6);
        break;
      case 'error':
        // dual descending "ding" (an original Windows-ish error)
        this.blip(392, 0.14, 'square', 0, 0.4);
        this.blip(311, 0.2, 'square', 0.12, 0.4);
        break;
      case 'modem':
        this.modem();
        break;
    }
  }

  /** A dial-up "handshake" — dial tones, then noisy carrier sweeps. */
  private modem(): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    // touch-tone-ish dialing
    this.blip(350, 0.18, 'sine', 0.0, 0.4);
    this.blip(440, 0.18, 'sine', 0.0, 0.4);
    this.blip(697, 0.1, 'square', 0.35, 0.3);
    this.blip(1209, 0.1, 'square', 0.35, 0.3);
    this.blip(770, 0.1, 'square', 0.5, 0.3);
    this.blip(1336, 0.1, 'square', 0.5, 0.3);
    // carrier tones
    this.blip(1200, 0.5, 'sine', 0.7, 0.25);
    this.blip(2100, 0.5, 'sine', 0.9, 0.2);
    // white-noise "screech"
    const dur = 1.2;
    const buf = this.ctx.createBuffer(
      1,
      Math.floor(this.ctx.sampleRate * dur),
      this.ctx.sampleRate,
    );
    const chan = buf.getChannelData(0);
    for (let i = 0; i < chan.length; i++) chan[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t0 + 1.1);
    bp.frequency.linearRampToValueAtTime(2600, t0 + 2.1);
    bp.Q.value = 3;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0 + 1.1);
    ng.gain.linearRampToValueAtTime(0.22, t0 + 1.2);
    ng.gain.linearRampToValueAtTime(0.0001, t0 + 2.3);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    noise.start(t0 + 1.1);
    noise.stop(t0 + 2.4);
  }
}

/* ---- wire up the page --------------------------------------------- */

const sound = new RetroSound();

// Expose the engine so other scripts (e.g. the guestbook) can play sounds.
(window as unknown as { __retroSound?: RetroSound }).__retroSound = sound;

function throttle<T extends (...a: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

function initSoundToggle(): void {
  const toggle = document.getElementById('sound-toggle');
  if (!toggle) return;
  const render = () => {
    toggle.textContent = sound.enabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    toggle.setAttribute('aria-pressed', String(sound.enabled));
  };
  render();
  toggle.addEventListener('click', () => {
    const on = sound.toggle();
    if (on) sound.play('click');
    render();
  });
}

function wireInteractions(): void {
  // Any click on a button/link makes a period-correct blip.
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement)?.closest(
      'a, button, .btn95, .badge88, .linkcard',
    );
    if (el && el.id !== 'sound-toggle') sound.play('click');
  });

  // Hover beep on links / cards.
  document.addEventListener(
    'pointerover',
    throttle((e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest('a, .btn95, .linkcard');
      if (el) sound.play('hover');
    }, 120),
  );

  // Throttled scroll tick.
  window.addEventListener(
    'scroll',
    throttle(() => sound.play('scroll'), 180),
    { passive: true },
  );

  // The ENTER splash button unlocks audio + fires the modem handshake.
  const enter = document.getElementById('enter-btn');
  enter?.addEventListener('click', () => {
    sound.setEnabled(true);
    sound.play('modem');
    const toggle = document.getElementById('sound-toggle');
    if (toggle) {
      toggle.textContent = '🔊 SOUND: ON';
      toggle.setAttribute('aria-pressed', 'true');
    }
  });

  // "You've got mail" chime buttons (guestbook, etc.).
  document.querySelectorAll<HTMLElement>('[data-sound="mail"]').forEach((el) => {
    el.addEventListener('click', () => sound.play('mail'));
  });
}

/** Unlock (create + resume) the AudioContext on the very first user gesture,
 * so it's already running by the time any sound is requested — some browsers
 * only allow resume() directly inside a gesture handler. */
function wireFirstGestureUnlock(): void {
  const unlock = () => sound.unlock();
  const opts = { once: true, capture: true } as const;
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  window.addEventListener('touchstart', unlock, opts);
}

function boot(): void {
  initSoundToggle();
  wireInteractions();
  wireFirstGestureUnlock();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
