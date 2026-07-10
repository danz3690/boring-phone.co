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
src/app.js         DOM wiring + localStorage — exposes initApp(), DOM tested
src/main.js        browser entry point (calls initApp)
src/logic.test.js  Vitest unit tests for logic.js
src/app.test.js    jsdom DOM tests for app.js (fake timers, memory storage)
```

The logic is deliberately split from the DOM so the core behaviour
(countdown, completion, streaks) can be unit-tested without a browser.
`app.js` is wired through an exported `initApp()` that accepts a document
and storage, so the DOM layer is testable under jsdom too.

## Tests

```bash
npm install           # one time
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # run with a coverage report (see coverage/index.html)
```
