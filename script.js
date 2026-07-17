/* Dan Zero — portfolio interactions
   Custom cursor, cursor-following work previews, scroll reveals,
   intro curtain, local clock. No dependencies. */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Intro curtain ---------- */

  if (reducedMotion) {
    document.body.classList.add("is-loaded");
  } else {
    window.addEventListener("load", function () {
      document.body.classList.add("is-loaded");
    });
    // Fallback in case load stalls (slow fonts etc.)
    setTimeout(function () {
      document.body.classList.add("is-loaded");
    }, 2500);
  }

  /* ---------- Local clock in the nav ---------- */

  var clock = document.querySelector("[data-local-time]");
  if (clock) {
    var tick = function () {
      clock.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Scroll reveals ---------- */

  var revealEls = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Custom cursor + work previews ---------- */

  if (!finePointer || reducedMotion) return;

  document.body.classList.add("has-cursor");

  var cursor = document.querySelector(".cursor");
  var dot = cursor.querySelector(".cursor__dot");
  var ring = cursor.querySelector(".cursor__ring");
  var label = cursor.querySelector(".cursor__label");

  var preview = document.querySelector(".preview");
  var previewImgs = {};
  preview.querySelectorAll(".preview__img").forEach(function (img) {
    var key = img.className.match(/preview__img--(\w+)/);
    if (key) previewImgs[key[1]] = img;
  });
  var currentPreview = null;

  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var ringPos = { x: mouse.x, y: mouse.y };
  var prevPos = { x: mouse.x, y: mouse.y };

  document.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  document.addEventListener("mousedown", function () {
    cursor.classList.add("is-down");
  });
  document.addEventListener("mouseup", function () {
    cursor.classList.remove("is-down");
  });

  // Cursor states via delegation on [data-cursor]
  document.addEventListener("mouseover", function (e) {
    var target = e.target.closest("[data-cursor]");
    cursor.classList.toggle("is-link", !!target && target.dataset.cursor === "link");
    cursor.classList.toggle("is-view", !!target && target.dataset.cursor === "view");
    label.textContent = target && target.dataset.cursor === "view" ? "View" : "";

    var proj = e.target.closest("[data-preview]");
    var key = proj ? proj.dataset.preview : null;
    if (key !== currentPreview) {
      if (currentPreview && previewImgs[currentPreview]) {
        previewImgs[currentPreview].classList.remove("is-current");
      }
      if (key && previewImgs[key]) {
        previewImgs[key].classList.add("is-current");
      }
      currentPreview = key;
      preview.classList.toggle("is-active", !!key);
    }
  });

  // Lerp loop: dot snaps, ring and preview trail
  var LERP_RING = 0.16;
  var LERP_PREVIEW = 0.1;

  function frame() {
    ringPos.x += (mouse.x - ringPos.x) * LERP_RING;
    ringPos.y += (mouse.y - ringPos.y) * LERP_RING;
    prevPos.x += (mouse.x - prevPos.x) * LERP_PREVIEW;
    prevPos.y += (mouse.y - prevPos.y) * LERP_PREVIEW;

    dot.style.left = mouse.x + "px";
    dot.style.top = mouse.y + "px";
    ring.style.left = ringPos.x + "px";
    ring.style.top = ringPos.y + "px";
    preview.style.left = prevPos.x + "px";
    preview.style.top = prevPos.y + "px";

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
