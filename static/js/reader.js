// Kumo Scans — Reader script
// - Sticky info pill offset (tracks header auto-hide)
// - Tap/Click anywhere on reading surface toggles the whole UI (header + bottom bar + pill)
// - Scroll position restore/save per chapter
// - Keyboard nav (←/→, Space/PageDown, T, H)
// - Chapter-jump dropdown in the bottom bar
// - Preload upcoming pages
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
      el.closest("a, button, input, textarea, select, label, .site-header, .reader-info") ||
      el.closest(".reader-bottombar, #reader-bottombar") ||
      el.closest(".reader-end, #reader-end") ||
      el.closest(".reader-scroll-tools, .scroll-btn, #reader-scroll-tools")
    );
  }

  function setHeaderHidden(hidden) {
    if (!header) return;
    header.classList.toggle("is-hidden", !!hidden);
    root.classList.toggle("header-hidden", !!hidden); // bottom bar + pill follow this class
    updateOffset();
  }

  function updateOffset() {
    if (!header) return;
    var hidden = header.classList.contains("is-hidden");
    var h = header.getBoundingClientRect().height || 0;
    root.style.setProperty("--header-offset", hidden ? "0px" : (h + "px"));
  }

  function nearTop() {
    return (window.scrollY || document.documentElement.scrollTop || 0) < 64;
  }

  function toggleHeaderFromReader() {
    if (!header) return;
    var hidden = header.classList.contains("is-hidden");
    // At very top and header visible -> don't hide (so you never lose the UI by accident up top)
    if (nearTop() && !hidden) return;
    setHeaderHidden(!hidden);
  }

  // ---------- Keep sticky info pill below header ----------
  (function setupStickyOffset(){
    if (!header) return;
    updateOffset();
    window.addEventListener("resize", updateOffset, {passive:true});

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

  // ---------- Tap/Click to toggle UI ----------
  var tapStartX = 0, tapStartY = 0, tapStartTime = 0, tapMoved = false;
  var TAP_MAX_MOVE = 12;
  var TAP_MAX_TIME = 350;

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
    if (dx > TAP_MAX_MOVE || dy > TAP_MAX_MOVE) tapMoved = true;
  }

  function tapUp(e) {
    if (!tapStartTime) return;
    if (e.defaultPrevented) { tapStartTime = 0; return; }

    var t = e.target;
    var dt = Date.now() - tapStartTime;
    var sel = window.getSelection && window.getSelection().toString();
    tapStartTime = 0;

    if (isInteractive(t)) return;
    if (!isOnReadingSurface(t)) return;
    if (sel && sel.length > 0) return;

    var isTap = !tapMoved && dt <= TAP_MAX_TIME;
    if (!isTap) return;

    toggleHeaderFromReader();
  }

  if (window.PointerEvent) {
    reader.addEventListener("pointerdown", tapDown, { passive: true });
    reader.addEventListener("pointermove", tapMove, { passive: true });
    reader.addEventListener("pointerup", tapUp, { passive: true });
  } else {
    reader.addEventListener("touchstart", tapDown, { passive: true });
    reader.addEventListener("touchmove", tapMove, { passive: true });
    reader.addEventListener("touchend", tapUp, { passive: true });
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

  // ---------- Chapter-jump dropdown ----------
  var chapterSelect = document.getElementById("rb-chapter-select");
  if (chapterSelect) {
    chapterSelect.addEventListener("change", function () {
      if (this.value) window.location.href = this.value;
    });
  }

  // ---------- Always start at the first panel (no resume) ----------
  // (Scroll position is intentionally not saved or restored.)

  // ---------- Keyboard navigation ----------
  function findNavLink(type) {
    var bar = document.getElementById("reader-bottombar");
    if (bar) {
      var a = bar.querySelector(type === "prev" ? "a.rb-prev" : "a.rb-next");
      if (a) return a;
    }
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
    } else if ((e.key || "").toLowerCase() === "h") {
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

  // ---------- Tiny floating scroll buttons ----------
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