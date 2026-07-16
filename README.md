# boring-phone.co

**Dopamine detox** — a gloriously 1996-style homepage carrying genuinely 2025
research on smartphone overuse: why the "dopamine detox" is half myth, what the
science actually shows, honest pros & cons, and a practical plan. Built with
[Astro](https://astro.build).

It's a period-correct Web 1.0 experience — fake Netscape browser chrome, a
scrolling marquee, blinking text, an "under construction" strip, a hit counter,
88×31 badges — with **retro sound effects on click and scroll** synthesized live
via the Web Audio API. Click **ENTER** to dial up the modem; mute anytime with
the button in the corner.

## Develop

```sh
npm install
npm run dev      # http://localhost:4321
```

## Build

```sh
npm run build    # static site → ./dist
npm run preview  # preview the production build
```

## Where things live

| Path                     | What                                                        |
| ------------------------ | ----------------------------------------------------------- |
| `src/data/research.ts`   | **Single source of truth** for every fact + citation.       |
| `src/data/cite.ts`       | Keeps on-page citation numbers in sync with the bibliography.|
| `src/scripts/sounds.ts`  | Web Audio engine (synthesized retro SFX + mute toggle).      |
| `src/components/`        | One component per page section.                              |
| `src/styles/global.css`  | The entire 1996 aesthetic.                                   |
| `public/sounds/`         | Optional drop-in `.wav` overrides — see its README.          |

## About the sounds

All sound effects are **synthesized in the browser** — no copyrighted AOL or
Windows audio files are bundled. To use your own retro `.wav`s instead, drop them
in `public/sounds/` (see `public/sounds/README.md`).

Not medical advice.
