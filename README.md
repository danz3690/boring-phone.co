# boring-phone.co

Dopamine detox — a small focus-timer web app built with vanilla HTML, CSS, and
JavaScript (no build step).

## Run the site

It's just static files. Open `index.html` directly, or serve the folder:

```bash
npm run serve   # http://localhost:3000
```

## Project layout

```
index.html         markup
styles.css         styling
src/logic.js       pure timer/streak logic (no DOM) — unit tested
src/app.js         DOM wiring + localStorage (browser entry point)
src/logic.test.js  Vitest tests for logic.js
```

The logic is deliberately split from the DOM so the core behaviour
(countdown, completion, streaks) can be unit-tested without a browser.

## Tests

```bash
npm install      # one time
npm test         # run once
npm run test:watch
```
