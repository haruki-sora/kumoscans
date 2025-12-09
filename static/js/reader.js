// Kumo Scans — Reader script
// - Sticky info pill offset (tracks header auto-hide)
// - Tap/Click anywhere on reading surface toggles header + info pill
// - Scroll position restore/save per chapter
// - Keyboard nav (←/→, Space/PageDown, T)
// - Preload upcoming pages
// - Floating FABs + sticky bar idle fade
// - End-of-chapter card (Option 2)
// - Tiny floating scroll buttons

(function () {
  var reader = document.querySelector(".reader");
  if (!reader) return;

  var root   = document.documentElement;
  var header = document.querySelector(".site-header");
  var pages  = Array.prototype.slice.call(document.querySelectorAll(".page img"));
  var slug   = reader.getAttribute("data-slug") || "";
  var chapter= reader.getAttribute("data-chapter") || "";
  var storageKey = "otaku-pos:" + slug + ":" + chapter;

  // ---------- Helpers ----------
  function isInteractive(el) {
    return !!(
      el.closest("a, button, input, textarea, select, label, .reader-header, .site-header, .sticky-bar, .fab-btn, .nav, .page-num") ||
      el.closest(".reader-end-card, #reader-end-card") ||
      el.closest(".reader-scroll-tools, .scroll-btn, #reader-scroll-tools")
    );
  }

  function setHeaderHidden(hidden) {
    if (!header) return;
    header.classList.toggle("is-hidden", !!hidden);
    root.classList.toggle("header-hidden", !!hidden);
    updateOffset(); // keep sticky pill in the right place
  }

  function updateOffset() {
    if (!header) return;
    var hidden = header.classList.contains("is-hidden");
    var h = header.getBoundingClientRect().height || 0;
    root.style.setProperty("--header-offset", hidden ? "0px" : (h + "px"));
  }

  // NEW: helper to detect "top of page"
  function nearTop() {
    return (window.scrollY || document.documentElement.scrollTop || 0) < 64;
  }

  // NEW: central place for reader-driven header toggle
  function toggleHeaderFromReader() {
    if (!header) return;
    var hidden = header.classList.contains("is-hidden");

    // At very top and header is visible -> do NOT hide
    if (nearTop() && !hidden) {
      return;
    }

    setHeaderHidden(!hidden);
  }

  // ---------- Keep sticky info pill below header ----------
  (function setupStickyOffset(){
    if (!header) return;
    updateOffset();
    window.addEventListener("resize", updateOffset, {passive:true});

    // Track hide/show state that scroll code in theme.js applies
    var ticking = false;
    window.addEventListener("scroll", function(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        var hidden = header.classList.contains("is-hidden");
        root.classList.toggle("header-hidden", hidden);
        updateOffset();
        ticking = false;
      });
    }, {passive:true});
  })();

  // ---------- Tap/Click to toggle UI (header + pill) ----------
  // Treat it as a tap only if the finger/mouse didn't move much (not a scroll)
  var tapStartX = 0;
  var tapStartY = 0;
  var tapStartTime = 0;
  var tapMoved = false;
  var TAP_MAX_MOVE = 12;   // px
  var TAP_MAX_TIME = 350;  // ms

  function isOnReadingSurface(target) {
    return !!(target.closest(".pages") || target.closest(".page"));
  }

  function tapDown(e) {
    if (e.defaultPrevented) return;
    var t = e.target;
    if (!isOnReadingSurface(t)) return;
    if (isInteractive(t)) return;

    var point = e.touches ? e.touches[0] : e;
    tapStartX = point.clientX;
    tapStartY = point.clientY;
    tapStartTime = Date.now();
    tapMoved = false;
  }

  function tapMove(e) {
    if (!tapStartTime) return;
    var point = e.touches ? e.touches[0] : e;
    var dx = Math.abs(point.clientX - tapStartX);
    var dy = Math.abs(point.clientY - tapStartY);
    if (dx > TAP_MAX_MOVE || dy > TAP_MAX_MOVE) {
      tapMoved = true;
    }
  }

  function tapUp(e) {
    if (!tapStartTime) return;

    if (e.defaultPrevented) {
      tapStartTime = 0;
      return;
    }

    var t = e.target;
    var dt = Date.now() - tapStartTime;
    var sel = window.getSelection && window.getSelection().toString();
    tapStartTime = 0;

    // Ignore selections, real controls, and non-page area
    if (isInteractive(t)) return;
    if (!isOnReadingSurface(t)) return;
    if (sel && sel.length > 0) return;

    var isTap = !tapMoved && dt <= TAP_MAX_TIME;
    if (!isTap) return;

    // use helper with "no hide at top" rule
    toggleHeaderFromReader();
  }

  if (window.PointerEvent) {
    reader.addEventListener("pointerdown", tapDown, { passive: true });
    reader.addEventListener("pointermove", tapMove, { passive: true });
    reader.addEventListener("pointerup", tapUp, { passive: true });
  } else {
    // Touch devices without PointerEvent
    reader.addEventListener("touchstart", tapDown, { passive: true });
    reader.addEventListener("touchmove", tapMove, { passive: true });
    reader.addEventListener("touchend", tapUp, { passive: true });

    // Desktop click fallback
    reader.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      var t = e.target;
      if (!isOnReadingSurface(t)) return;
      if (isInteractive(t)) return;
      var sel = window.getSelection && window.getSelection().toString();
      if (sel && sel.length > 0) return;

      toggleHeaderFromReader();
    }, { passive: true });
  }

  // ---------- Restore saved scroll position ----------
  var saved = sessionStorage.getItem(storageKey);
  if (saved) {
    setTimeout(function () {
      var y = parseInt(saved, 10);
      if (!isNaN(y)) window.scrollTo(0, y);
    }, 50);
  }

  // ---------- Save scroll position ----------
  var saving = false;
  window.addEventListener("scroll", function () {
    if (saving) return;
    saving = true;
    requestAnimationFrame(function () {
      try { sessionStorage.setItem(storageKey, String(window.scrollY || 0)); } catch (e) {}
      saving = false;
    });
  }, { passive: true });

  // ---------- Keyboard navigation ----------
  function textHas(hay, needles) {
    hay = (hay || "").toLowerCase();
    for (var i = 0; i < needles.length; i++) if (hay.indexOf(needles[i]) !== -1) return true;
    return false;
  }
  function findNavLink(type) {
    var byFab = document.querySelector(".fab-btn." + type);
    if (byFab) return byFab;
    var links = Array.prototype.slice.call(
      document.querySelectorAll(".reader-header .nav a, .reader-footer .nav a, .sticky-bar a")
    );
    for (var i = 0; i < links.length; i++) {
      var txt = (links[i].textContent || "").trim();
      if (type === "prev" && textHas(txt, ["prev", "⟵", "←"])) return links[i];
      if (type === "next" && textHas(txt, ["next", "⟶", "→"])) return links[i];
    }
    if (links.length === 2) return type === "prev" ? links[0] : links[1];
    return null;
  }
  function scrollToNextImage() {
    for (var i = 0; i < pages.length; i++) {
      var r = pages[i].getBoundingClientRect();
      if (r.top > 16) {
        pages[i].scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
    }
    return false;
  }

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === "ArrowLeft") {
      var prev = findNavLink("prev");
      if (prev) { e.preventDefault(); prev.click(); }
    } else if (e.key === "ArrowRight") {
      var next = findNavLink("next");
      if (next) { e.preventDefault(); next.click(); }
    } else if (e.key === " " || e.key === "PageDown") {
      e.preventDefault();
      if (!scrollToNextImage()) {
        var nx = findNavLink("next");
        if (nx) nx.click();
      }
    } else if ((e.key || "").toLowerCase() === "t") {
      var toggle = document.getElementById("theme-toggle");
      if (toggle) toggle.click();
    } else if ((e.key || "").toLowerCase() === "h") {
      // H key uses same rule (no hide at top)
      toggleHeaderFromReader();
    }
  });

  // ---------- Preload upcoming pages ----------
  pages.forEach(function (img, i) {
    img.addEventListener("load", function () {
      for (var j = i + 1; j < i + 4 && j < pages.length; j++) {
        var n = new Image();
        n.src = pages[j].src;
      }
    }, { once: true });
  });

  // --- End-of-chapter card when last page is visible (Option 2) ---
  var endCard = document.getElementById("reader-end-card");
  if (endCard && "IntersectionObserver" in window) {
    var pageEls = reader.querySelectorAll(".page");
    var lastPage = pageEls[pageEls.length - 1];

    if (lastPage) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            endCard.classList.add("is-visible");
          }
        });
      }, {
        root: null,
        threshold: 0.35  // show once about 1/3 of the last page is visible
      });

      io.observe(lastPage);
    }
  }

  // --- Tiny floating scroll buttons: back to top / bottom ---
  var scrollTools = document.getElementById("reader-scroll-tools");
  if (scrollTools) {
    var btnTop = scrollTools.querySelector(".scroll-btn--top");
    var btnBottom = scrollTools.querySelector(".scroll-btn--bottom");

    if (btnTop) {
      btnTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (btnBottom) {
      btnBottom.addEventListener("click", function () {
        var docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.scrollTo({ top: docHeight, behavior: "smooth" });
      });
    }
  }
})();
