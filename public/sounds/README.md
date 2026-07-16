# Drop-in sound overrides

By default every sound on **boring-phone.co** is **synthesized live in the
browser** with the Web Audio API — no audio files are bundled, and no
copyrighted AOL / Microsoft Windows sounds are used.

If you own (or have the rights to) real retro `.wav` files and want to use them
instead:

1. Drop them in this folder using the exact names in the table below.
2. Add each name you added to `manifest.json` (e.g. `["click", "mail"]`).

Only files listed in `manifest.json` are loaded, so a default install makes no
wasted requests. Listed files override the synth versions:

| File          | Plays when…                                  |
| ------------- | -------------------------------------------- |
| `modem.wav`   | you click **ENTER** on the splash            |
| `click.wav`   | you click any link or button                 |
| `hover.wav`   | you hover a link or card                     |
| `scroll.wav`  | you scroll the page (throttled)              |
| `mail.wav`    | you click a "you've got mail" element        |
| `error.wav`   | reserved for future use                      |

Notes:
- Only add files you have the legal right to distribute. The classic AOL
  "You've Got Mail" and Windows system sounds are **copyrighted** — don't commit
  them to a public repo.
- Any missing file simply falls back to the built-in synthesized sound.
- Keep them short (< 3s) and small; they load lazily after the first click.
