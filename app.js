// app.js - corrected and simplified. Uses no modules to avoid async loading issues on older setups.

(function () {
  'use strict';

  // Elements (grab once)
  var canvas = document.getElementById('canvas');
  var statsEl = document.getElementById('stats');
  var openBtn = document.getElementById('openBtn');
  var puzzleBtn = document.getElementById('puzzleBtn');
  var resetBtn = document.getElementById('resetBtn');
  var revealSeqBtn = document.getElementById('revealSeqBtn');
  var hintBtn = document.getElementById('hintBtn');
  var closePuzzleBtn = document.getElementById('closePuzzleBtn');
  var puzzlePanel = document.getElementById('puzzlePanel');
  var pFill = document.getElementById('pFill');
  var puzzleDesc = document.getElementById('puzzleDesc');
  var easyModeInput = document.getElementById('easyMode');
  var portalOverlay = document.getElementById('portalOverlay');
  var closePortal = document.getElementById('closePortal');

  if (!canvas || !statsEl) {
    console.error('Elements UI manquants. Vérifie index.html');
    return;
  }

  var ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D non supporté');
    return;
  }

  // Resize initial
  var W = canvas.width = window.innerWidth;
  var H = canvas.height = window.innerHeight;

  // Performance caps
  var deviceMemory = navigator.deviceMemory || 4;
  var MAX_PARTICLES = Math.max(300, Math.min(1500, Math.floor(deviceMemory * 250)));
  var SPAWN_SAFE = Math.floor(MAX_PARTICLES * 0.75);

  // State
  var particles = [];
  var hue = 220;
  var portalActive = false;
  var mouse = { x: W / 2, y: H / 2 };
  var lastFrame = performance.now();
  var fps = 60;
  var fpsSamples = [];

  // Puzzle state
  var puzzleStars = []; // objects {x,y,s,el}
  var puzzleSecret = [];
  var puzzleProgress = 0;
  var puzzleActive = false;
  var easyMode = false;

  // Helpers
  function rand(min, max) { min = (min === undefined) ? 0 : min; max = (max === undefined) ? 1 : max; return Math.random() * (max - min) + min; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function now() { return performance.now(); }

  // Particle implementation
  function Particle(x, y) {
    this.x = x; this.y = y;
    this.vx = rand(-3, 3); this.vy = rand(-3, 3);
    this.s = rand(1, 3.2); this.h = hue + rand(-60, 60);
    this.life = 1; this.a = 1;
  }
  Particle.prototype.update = function (dt) {
    if (portalActive) {
      var dx = mouse.x - this.x, dy = mouse.y - this.y;
      var d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      var f = Math.min(500 / d, 8) * 0.06;
      this.vx += (dx / d) * f;
      this.vy += (dy / d) * f;
      this.vx += Math.sin(this.y * 0.01 + now() * 0.0004) * 0.05;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.96; this.vy *= 0.96;
    this.s *= 0.998;
    this.life -= 0.003 * dt;
    this.a = Math.max(0, this.life);
  };
  Particle.prototype.draw = function (ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'hsla(' + (Math.floor(this.h)) + ',85%,58%,' + this.a + ')';
    ctx.shadowBlur = Math.min(28, this.s * 8);
    ctx.shadowColor = 'hsl(' + (Math.floor(this.h)) + ',85%,58%)';
    ctx.globalAlpha = this.a;
    ctx.arc(this.x, this.y, Math.max(0.2, this.s), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = this.a * 0.35;
    ctx.beginPath();
    ctx.arc(this.x - this.vx * 2, this.y - this.vy * 2, Math.max(0.15, this.s * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  function spawn(x, y, n) {
    n = n || 6;
    for (var i = 0; i < n && particles.length < SPAWN_SAFE; i++) {
      particles.push(new Particle(x + rand(-12, 12), y + rand(-12, 12)));
    }
  }

  function updateAll(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.update(dt);
      if (p.life <= 0 || p.s < 0.2 || p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100) {
        particles.splice(i, 1);
      }
    }
  }

  function render() {
    var t = now();
    var dtMs = t - lastFrame;
    lastFrame = t;
    var dt = clamp(dtMs / (1000 / 60), 0.5, 3);

    fpsSamples.push(1000 / Math.max(1, dtMs));
    if (fpsSamples.length > 20) fpsSamples.shift();
    fps = Math.round(fpsSamples.reduce(function (a, b) { return a + b; }, 0) / fpsSamples.length);

    hue = (hue + 0.2) % 360;

    // trails
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, W, H);

    updateAll(dt);

    for (var i = 0; i < particles.length; i++) {
      particles[i].draw(ctx);
    }

    // UI
    if (statsEl) statsEl.textContent = '✨ Particules: ' + particles.length + ' — FPS: ' + fps;

    if (particles.length > SPAWN_SAFE * 1.05) particles.splice(0, Math.floor(particles.length * 0.25));

    requestAnimationFrame(render);
  }

  // DOM star helpers
  function createStarElement(x, y, size, idx) {
    var el = document.createElement('div');
    el.className = 'p-star';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    var sizePx = Math.max(10, size * 6);
    el.style.width = sizePx + 'px';
    el.style.height = sizePx + 'px';
    el.setAttribute('data-idx', String(idx));
    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = '';
    el.appendChild(label);
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var index = Number(this.getAttribute('data-idx'));
      handlePuzzleStarClick(index);
    });
    document.body.appendChild(el);
    return el;
  }

  function clearStarElements() {
    var old = document.querySelectorAll('.p-star');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
  }

  // Puzzle
  function createPuzzle() {
    clearStarElements();
    puzzleStars = [];
    puzzleSecret = [];
    var count = 36;
    for (var i = 0; i < count; i++) {
      var x = rand(60, W - 60);
      var y = rand(60, H - 60);
      var s = rand(1.4, 2.8);
      var el = createStarElement(x, y, s, i);
      puzzleStars.push({ x: x, y: y, s: s, el: el });
      if (Math.random() > 0.9) puzzleSecret.push(i);
    }
    while (puzzleSecret.length < 3) {
      var v = Math.floor(rand(0, count));
      if (puzzleSecret.indexOf(v) === -1) puzzleSecret.push(v);
    }
    for (var j = 0; j < puzzleSecret.length; j++) {
      var idx = puzzleSecret[j];
      if (puzzleStars[idx] && puzzleStars[idx].el) puzzleStars[idx].el.classList.add('secret');
    }
    puzzleProgress = 0;
    puzzleActive = true;
    updatePuzzleUI();
    if (puzzlePanel) { puzzlePanel.classList.remove('hidden'); puzzlePanel.setAttribute('aria-hidden', 'false'); }
  }

  function handlePuzzleStarClick(i) {
    if (!puzzleActive) return;
    var expected = puzzleSecret[puzzleProgress];
    if (i === expected) {
      var st = puzzleStars[i];
      if (st && st.el) {
        st.el.classList.add('pulse');
        setTimeout((function (el) { return function () { el.classList.remove('pulse'); }; })(st.el), 700);
      }
      if (st) spawn(st.x, st.y, 18);
      puzzleProgress++;
      updatePuzzleUI();
      if (puzzleProgress >= puzzleSecret.length) puzzleSolved();
    } else {
      spawn(rand(40, W - 40), rand(40, H - 40), 18);
      flashUI();
    }
  }

  function updatePuzzleUI() {
    var pct = Math.round((puzzleProgress / Math.max(1, puzzleSecret.length)) * 100);
    if (pFill) pFill.style.width = pct + '%';
    if (puzzleDesc) puzzleDesc.textContent = 'Trouvé ' + puzzleProgress + ' / ' + puzzleSecret.length;
    for (var i = 0; i < puzzleStars.length; i++) {
      var s = puzzleStars[i];
      if (!s || !s.el) continue;
      var lab = s.el.querySelector('.label');
      if (easyMode) {
        s.el.classList.add('show-label');
        if (lab) {
          var pos = puzzleSecret.indexOf(i);
          lab.textContent = (pos !== -1) ? String(pos + 1) : '';
        }
      } else {
        s.el.classList.remove('show-label');
        if (lab) lab.textContent = '';
      }
    }
  }

  function revealSequence() {
    if (!puzzleActive) return;
    var delay = 0;
    for (var k = 0; k < puzzleSecret.length; k++) {
      (function (idx, order) {
        setTimeout(function () {
          var s = puzzleStars[idx];
          if (!s || !s.el) return;
          s.el.classList.add('pulse');
          var lab = s.el.querySelector('.label');
          var prev = lab ? lab.textContent : '';
          if (lab) { lab.textContent = String(order + 1); s.el.classList.add('show-label'); }
          setTimeout(function () {
            s.el.classList.remove('pulse');
            if (!easyMode && lab) { lab.textContent = prev || ''; s.el.classList.remove('show-label'); }
          }, 700);
        }, delay);
      })(puzzleSecret[k], k);
      delay += 650;
    }
  }

  function revealNextStar() {
    if (!puzzleActive) return;
    var idx = puzzleSecret[puzzleProgress];
    if (idx === undefined) return;
    var s = puzzleStars[idx];
    if (!s || !s.el) return;
    s.el.classList.add('pulse');
    var lab = s.el.querySelector('.label');
    var prev = lab ? lab.textContent : '';
    if (lab) { lab.textContent = String(puzzleProgress + 1); s.el.classList.add('show-label'); }
    setTimeout(function () {
      s.el.classList.remove('pulse');
      if (!easyMode && lab) { lab.textContent = prev || ''; s.el.classList.remove('show-label'); }
    }, 900);
  }

  function closePuzzle() {
    puzzleActive = false;
    for (var i = 0; i < puzzleStars.length; i++) { if (puzzleStars[i] && puzzleStars[i].el) puzzleStars[i].el.parentNode.removeChild(puzzleStars[i].el); }
    puzzleStars = [];
    puzzleSecret = [];
    puzzleProgress = 0;
    if (pFill) pFill.style.width = '0%';
    if (puzzlePanel) { puzzlePanel.classList.add('hidden'); puzzlePanel.setAttribute('aria-hidden', 'true'); }
  }

  function flashUI() {
    var ui = document.getElementById('ui');
    if (!ui) return;
    ui.classList.add('blink');
    setTimeout(function () { ui.classList.remove('blink'); }, 600);
  }

  function puzzleSolved() {
    puzzleActive = false;
    for (var i = 0; i < puzzleStars.length; i++) { if (puzzleStars[i] && puzzleStars[i].el) puzzleStars[i].el.parentNode.removeChild(puzzleStars[i].el); }
    puzzleStars = [];
    puzzleSecret = [];
    puzzleProgress = 0;
    if (pFill) pFill.style.width = '0%';
    var cx = W / 2, cy = H / 2;
    for (var j = 0; j < 6; j++) {
      (function (delay) { setTimeout(function () { spawn(cx + rand(-200, 200), cy + rand(-160, 160), 120); }, delay); })(j * 120);
    }
    openPortalOverlay();
    if (puzzlePanel) { puzzlePanel.classList.add('hidden'); puzzlePanel.setAttribute('aria-hidden', 'true'); }
  }

  function openPortalOverlay() {
    portalActive = true;
    if (portalOverlay) { portalOverlay.classList.remove('hidden'); portalOverlay.setAttribute('aria-hidden', 'false'); }
  }
  if (closePortal) closePortal.addEventListener('click', function () { if (portalOverlay) portalOverlay.classList.add('hidden'); portalActive = false; });

  // UI wiring
  if (openBtn) openBtn.addEventListener('click', function () { portalActive = true; spawn(W / 2, H / 2, 400); setTimeout(openPortalOverlay, 800); });
  if (puzzleBtn) puzzleBtn.addEventListener('click', function () { createPuzzle(); });
  if (resetBtn) resetBtn.addEventListener('click', function () { particles = []; closePuzzle(); portalActive = false; });
  if (revealSeqBtn) revealSeqBtn.addEventListener('click', function () { revealSequence(); });
  if (hintBtn) hintBtn.addEventListener('click', function () { revealNextStar(); });
  if (closePuzzleBtn) closePuzzleBtn.addEventListener('click', function () { closePuzzle(); });

  // easy mode persistence
  try {
    var saved = localStorage.getItem('portail_easy_mode');
    easyMode = saved === '1';
    if (easyModeInput) easyModeInput.checked = !!easyMode;
  } catch (e) { easyMode = false; }
  if (easyModeInput) {
    easyModeInput.addEventListener('change', function () {
      easyMode = !!easyModeInput.checked;
      try { localStorage.setItem('portail_easy_mode', easyMode ? '1' : '0'); } catch (e) { /* ignore */ }
      updatePuzzleUI();
    });
  }

  // Konami
  (function () {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var p = 0;
    window.addEventListener('keydown', function (e) {
      if (e.key === seq[p]) {
        p++;
        if (p >= seq.length) {
          p = 0;
          for (var i = 0; i < 8; i++) (function (ii) { setTimeout(function () { spawn(W / 2 + rand(-400, 400), H / 2 + rand(-200, 200), 240); }, ii * 140); })(i);
          setTimeout(openPortalOverlay, 900);
          try { alert('Konami detecte — portail debloque !'); } catch (err) { }
        }
      } else { p = 0; }
    });
  })();

  // Window events
  window.addEventListener('resize', function () { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; if (portalActive) spawn(mouse.x, mouse.y, 2); });
  window.addEventListener('click', function (e) { spawn(e.clientX, e.clientY, 8); });

  // Safety watchdog
  setInterval(function () {
    if (particles.length > SPAWN_SAFE) particles.splice(0, Math.floor(particles.length * 0.25));
  }, 1500);

  // ambient
  for (var k = 0; k < 120; k++) spawn(rand(0, W), rand(0, H), 1);

  // start
  requestAnimationFrame(render);

})();