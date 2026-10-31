(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const stage = document.getElementById("stage");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  const ui = {
    sound: document.getElementById("soundBtn"),
    score: document.getElementById("score"),
    hint: document.getElementById("hint"),
    toast: document.getElementById("toast"),
    finish: document.getElementById("finish"),
    again: document.getElementById("againBtn"),
    reset: document.getElementById("resetBtn"),
    next: document.getElementById("nextBtn"),
    soapName: document.getElementById("soapName"),
    soapNote: document.getElementById("soapNote"),
    percent: document.getElementById("percent"),
    fill: document.getElementById("progressFill"),
    bar: document.getElementById("progressBar")
  };

  if (!ctx) {
    stage.insertAdjacentHTML("beforeend", "<p>Il browser non supporta Canvas 2D.</p>");
    return;
  }

  const swatches = [
    { name: "Pesca vellutata", main: "#e99c86", light: "#ffd0ad", dark: "#ae675d", tones: ["#f6b297", "#f3ab91", "#f7b89d", "#eda186"] },
    { name: "Lavanda soffice", main: "#b99bd8", light: "#ebd6ff", dark: "#8071ab", tones: ["#c9b3ec", "#d2b9ed", "#c4a7e3", "#d5bcf2"] },
    { name: "Menta fresca", main: "#83c8b0", light: "#c6f4dc", dark: "#4f9d88", tones: ["#a1e0c8", "#a7e6cb", "#93d8bd", "#ace6d2"] },
    { name: "Sorbetto al limone", main: "#e9cb7e", light: "#fff5be", dark: "#ba9c55", tones: ["#f7e399", "#f7dc8b", "#ffeba3", "#efda86"] },
    { name: "Mora cremosa", main: "#bc8ca6", light: "#efc7df", dark: "#875a82", tones: ["#cf9db6", "#d5a7c3", "#c793ae", "#c99bb6"] }
  ];

  const ROWS = 11, COLS = 8, TOTAL = ROWS * COLS;
  const cells = Array.from({ length: TOTAL }, (_, i) => ({
    r: Math.floor(i / COLS), c: i % COLS, cut: false
  }));
  const chips = [];
  const dust = [];
  const streaks = [];
  const mouse = { down: false, shown: false, x: 0, y: 0, angle: -0.72, vx: 0, vy: 0 };
  let w = 0, h = 0, dpr = 1, geo = { x: 0, y: 0, bw: 0, bh: 0, x0: 0, y0: 0, cw: 0, ch: 0 };
  let colorIndex = 0, removed = 0, totalScore = 0, soundOn = true, finished = false;
  let audio = null, noiseBuffer = null, lastSound = 0, lastBuzz = 0, lastFrame = 0, lastToast = 0;
  let firstGesture = false;

  function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
  function between(a, b) { return a + Math.random() * (b - a); }
  function roundRect(x, y, ww, hh, rr) {
    const r = Math.min(Math.max(rr, 0), ww / 2, hh / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + ww - r, y);
    ctx.quadraticCurveTo(x + ww, y, x + ww, y + r);
    ctx.lineTo(x + ww, y + hh - r);
    ctx.quadraticCurveTo(x + ww, y + hh, x + ww - r, y + hh);
    ctx.lineTo(x + r, y + hh);
    ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bw = Math.min(w * 0.72, h * 0.59, 290);
    const bh = Math.min(h * 0.66, bw * 1.27, 370);
    const x = (w - bw) / 2;
    const y = (h - bh) / 2 + Math.min(9, h * 0.023);
    const pad = clamp(bw * 0.045, 8, 14);
    geo = { x, y, bw, bh, x0: x + pad, y0: y + pad, cw: (bw - 2 * pad) / COLS, ch: (bh - 2 * pad) / ROWS };
  }

  function scoreUpdate() {
    const p = Math.round(100 * removed / TOTAL);
    ui.percent.textContent = p + "%";
    ui.fill.style.width = p + "%";
    ui.bar.setAttribute("aria-valuenow", String(p));
    ui.score.textContent = totalScore.toLocaleString("it-IT") + " PUNTI";
  }

  function newBar(next) {
    if (next) colorIndex = (colorIndex + 1) % swatches.length;
    removed = 0; finished = false;
    cells.forEach(c => { c.cut = false; });
    chips.length = 0; dust.length = 0; streaks.length = 0;
    mouse.down = false; mouse.shown = false;
    ui.finish.classList.remove("show");
    ui.soapName.textContent = swatches[colorIndex].name;
    ui.soapNote.textContent = "Passa la lama sui quadretti";
    if (!firstGesture) ui.hint.classList.remove("hide");
    scoreUpdate();
  }

  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    lastToast = performance.now();
  }

  function makeChip(cx, cy, cellW, cellH, angle) {
    const palette = swatches[colorIndex];
    const drift = between(-2.4, 2.4);
    chips.push({
      x: cx, y: cy, vx: drift + Math.cos(angle) * between(1, 3),
      vy: between(-5.5, -2) + Math.sin(angle) * 1.4,
      rot: between(-0.45, 0.45), spin: between(-0.14, 0.14),
      ww: cellW * between(0.6, .88), hh: cellH * between(0.67, .93),
      age: 0, life: between(75, 125),
      fill: palette.tones[Math.floor(Math.random() * palette.tones.length)]
    });
    if (chips.length > 105) chips.splice(0, chips.length - 105);
    const count = Math.floor(between(4, 8));
    for (let k = 0; k < count; k++) {
      dust.push({
        x: cx + between(-cellW * .4, cellW * .4),
        y: cy + between(-cellH * .4, cellH * .4),
        vx: between(-3, 3), vy: between(-4, 0),
        age: 0, life: between(18, 55),
        size: between(1.5, 4.5), fill: palette.tones[Math.floor(Math.random() * palette.tones.length)]
      });
    }
    if (dust.length > 450) dust.splice(0, dust.length - 450);
  }

  function distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (dx * dx + dy * dy < .001) return Math.hypot(px - x1, py - y1);
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function slice(x1, y1, x2, y2) {
    if (finished) return;
    const dx = x2 - x1, dy = y2 - y1;
    if (Math.hypot(dx, dy) < 1.8) return;
    const angle = Math.atan2(dy, dx);
    let hits = 0;
    const { x0, y0, cw, ch } = geo;
    for (const c of cells) {
      if (c.cut) continue;
      const cx = x0 + (c.c + .5) * cw;
      const cy = y0 + (c.r + .5) * ch;
      if (distanceToSegment(cx, cy, x1, y1, x2, y2) < Math.min(cw, ch) * .59) {
        c.cut = true;
        removed++;
        totalScore += 10;
        hits++;
        makeChip(cx, cy, cw, ch, angle);
      }
    }
    if (hits > 0) {
      streaks.push({ x1, y1, x2, y2, life: 12, max: 12 });
      ui.hint.classList.add("hide");
      firstGesture = true;
      scoreUpdate();
      crackle(hits);
      if (navigator.vibrate && performance.now() - lastBuzz > 120) {
        navigator.vibrate(9);
        lastBuzz = performance.now();
      }
      if (removed >= Math.ceil(TOTAL * .94)) complete();
    }
  }

  function complete() {
    if (finished) return;
    finished = true;
    const rest = cells.filter(c => !c.cut).length;
    cells.forEach(c => { c.cut = true; });
    totalScore += rest * 10 + 300;
    removed = TOTAL;
    scoreUpdate();
    ui.soapNote.textContent = "Completata! +300 bonus";
    for (let i = 0; i < 80; i++) dust.push({
      x: w * .5 + between(-w * .22, w * .22), y: h * .41 + between(-60, 60),
      vx: between(-4.5, 4.5), vy: between(-7, -1),
      age: 0, life: between(40, 90), size: between(2, 6), fill: swatches[colorIndex].light
    });
    toast("✨ PERFETTO! +300");
    window.setTimeout(() => { if (finished) ui.finish.classList.add("show"); }, 1250);
  }

  function initAudio() {
    if (!soundOn) return;
    try {
      if (!audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audio = new AudioContext();
        noiseBuffer = audio.createBuffer(1, Math.floor(audio.sampleRate * .115), audio.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** .65;
      }
      if (audio.state === "suspended") audio.resume().catch(() => {});
    } catch (_) { audio = null; }
  }

  function crackle(hits) {
    if (!soundOn || !audio || !noiseBuffer) return;
    const now = performance.now();
    if (now - lastSound < 55) return;
    lastSound = now;
    try {
      const source = audio.createBufferSource();
      source.buffer = noiseBuffer;
      source.playbackRate.value = between(.68, 1.36);
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = between(1100, 3300);
      filter.Q.value = between(.5, 1.4);
      const gain = audio.createGain();
      const start = audio.currentTime;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(Math.min(.2, .065 + hits * .025), start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + .09);
      source.connect(filter).connect(gain).connect(audio.destination);
      source.start(start);
      source.stop(start + .11);
    } catch (_) { /* audio is optional */ }
  }

  function coordinates(event) {
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  canvas.addEventListener("pointerdown", e => {
    if (finished) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    initAudio();
    const p = coordinates(e);
    mouse.down = true; mouse.shown = true;
    mouse.x = p.x; mouse.y = p.y;
    mouse.vx = 0; mouse.vy = 0;
  }, { passive: false });

  canvas.addEventListener("pointermove", e => {
    if (!mouse.down || finished) return;
    e.preventDefault();
    const p = coordinates(e);
    const dx = p.x - mouse.x, dy = p.y - mouse.y;
    mouse.vx = dx; mouse.vy = dy;
    if (dx * dx + dy * dy > 9) {
      mouse.angle = Math.atan2(dy, dx);
      slice(mouse.x, mouse.y, p.x, p.y);
    }
    mouse.x = p.x; mouse.y = p.y;
  }, { passive: false });

  function release() { mouse.down = false; }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);

  ui.sound.addEventListener("click", () => {
    soundOn = !soundOn;
    ui.sound.textContent = soundOn ? "♫" : "♪̸";
    ui.sound.setAttribute("aria-label", soundOn ? "Disattiva suoni" : "Attiva suoni");
    if (soundOn) initAudio();
  });
  ui.reset.addEventListener("click", () => { newBar(false); toast("Si ricomincia!"); });
  ui.next.addEventListener("click", () => { newBar(true); toast("Nuovo colore ✨"); });
  ui.again.addEventListener("click", () => { newBar(true); });

  function drawSoap() {
    const pal = swatches[colorIndex];
    const { x, y, bw, bh, x0, y0, cw, ch } = geo;
    if (!bw || !bh) return;

    ctx.save();
    ctx.fillStyle = "#325e5355";
    ctx.beginPath();
    ctx.ellipse(w / 2, y + bh + 19, bw * .58, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "#203b3270";
    ctx.shadowBlur = 29; ctx.shadowOffsetY = 17;
    roundRect(x, y + 11, bw, bh, Math.min(25, bw * .08));
    ctx.fillStyle = pal.dark; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    const edge = ctx.createLinearGradient(x, y, x + bw, y + bh);
    edge.addColorStop(0, pal.light);
    edge.addColorStop(.45, pal.main);
    edge.addColorStop(1, pal.dark);
    roundRect(x, y, bw, bh, Math.min(25, bw * .08));
    ctx.fillStyle = edge; ctx.fill();

    roundRect(x + 5, y + 5, bw - 10, bh - 10, 19);
    ctx.fillStyle = pal.dark; ctx.globalAlpha = .45; ctx.fill(); ctx.globalAlpha = 1;

    for (const c of cells) {
      if (c.cut) continue;
      const xx = x0 + c.c * cw, yy = y0 + c.r * ch;
      const gap = Math.max(.85, cw * .045);
      const tw = cw - gap * 1.5, th = ch - gap * 1.55;
      const tileColor = pal.tones[(c.r * 3 + c.c * 7) % pal.tones.length];
      ctx.fillStyle = "#54362947";
      roundRect(xx + gap + 1.7, yy + gap + 3.1, tw, th, Math.min(5, cw * .17));
      ctx.fill();
      ctx.fillStyle = tileColor;
      roundRect(xx + gap, yy + gap, tw, th, Math.min(5, cw * .17));
      ctx.fill();
      ctx.strokeStyle = "#ffffff55";ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(xx + gap + 4, yy + gap + th - 6);
      ctx.lineTo(xx + gap + 4, yy + gap + 5);
      ctx.quadraticCurveTo(xx + gap + 4, yy + gap + 3, xx + gap + 7, yy + gap + 3);
      ctx.lineTo(xx + gap + tw - 6, yy + gap + 3);
      ctx.stroke();
    }
    ctx.globalAlpha = .17;ctx.strokeStyle = "#fff";ctx.lineWidth = 2.5;
    roundRect(x + 4, y + 4, bw - 8, bh - 8, 20);ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawChips(frame) {
    for (let i = chips.length - 1; i >= 0; i--) {
      const p = chips[i];
      p.x += p.vx * frame; p.y += p.vy * frame;
      p.vy += .25 * frame; p.vx *= .993;
      p.rot += p.spin * frame; p.age += frame;
      if (p.y > h - 18) {
        p.y = h - 18;
        p.vy *= -.28;
        p.vx *= .78;
      }
      const alpha = clamp((p.life - p.age) / Math.min(p.life * .32, 28), 0, 1);
      if (p.age > p.life) { chips.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#5d746b5c";
      roundRect(-p.ww / 2 + 2, -p.hh / 2 + 4, p.ww, p.hh, 3);ctx.fill();
      ctx.fillStyle = p.fill;
      roundRect(-p.ww / 2, -p.hh / 2, p.ww, p.hh, 3);ctx.fill();
      ctx.fillStyle = "#ffffff61";ctx.fillRect(-p.ww / 2 + 3, -p.hh / 2 + 3, p.ww * .62, 2);
      ctx.restore();
    }
  }

  function drawDust(frame) {
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i];
      p.x += p.vx * frame;p.y += p.vy * frame;
      p.vy += .14 * frame;p.age += frame;
      if (p.age > p.life) { dust.splice(i, 1);continue; }
      ctx.globalAlpha = clamp(1 - p.age / p.life, 0, 1);
      ctx.fillStyle = p.fill;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawStreaks(frame) {
    for (let i = streaks.length - 1; i >= 0; i--) {
      const p = streaks[i];p.life -= frame;
      if (p.life <= 0) { streaks.splice(i, 1);continue; }
      ctx.save();
      ctx.globalAlpha = .45 * (p.life / p.max);
      ctx.strokeStyle = "#fff8cf";
      ctx.lineCap = "round";ctx.lineWidth = 3;
      ctx.beginPath();ctx.moveTo(p.x1, p.y1);ctx.lineTo(p.x2, p.y2);ctx.stroke();
      ctx.restore();
    }
  }

  function drawKnife() {
    if (!mouse.down || finished) return;
    ctx.save();
    ctx.translate(mouse.x, mouse.y);
    ctx.rotate(mouse.angle - 2.35);
    ctx.shadowColor = "#203b376b"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;

    ctx.fillStyle = "#e9f2eb";
    ctx.beginPath();ctx.moveTo(0, 0);ctx.lineTo(-17, 12);ctx.lineTo(-52, 56);ctx.lineTo(-60, 48);ctx.lineTo(-17, 1);ctx.closePath();ctx.fill();

    ctx.shadowBlur = 0;ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#a8bcc1";
    ctx.beginPath();ctx.moveTo(-17, 12);ctx.lineTo(-52, 56);ctx.lineTo(-60, 48);ctx.lineTo(-17, 1);ctx.closePath();ctx.fill();
    ctx.strokeStyle = "#f9ffff";ctx.lineWidth = 1;
    ctx.beginPath();ctx.moveTo(0, 0);ctx.lineTo(-52, 56);ctx.stroke();

    const grip = ctx.createLinearGradient(-72, 50, -42, 83);
    grip.addColorStop(0, "#2b5951");grip.addColorStop(1, "#102d35");
    ctx.fillStyle = grip;roundRect(-67, 48, 22, 59, 7);ctx.fill();
    ctx.fillStyle = "#8fc1a5";roundRect(-62, 58, 3, 39, 1);ctx.fill();
    ctx.fillStyle = "#a2b3b6";
    ctx.beginPath();ctx.arc(-56, 54, 3, 0, Math.PI * 2);ctx.fill();
    ctx.restore();
  }

  function drawScene(time) {
    if (!w || !h) resize();
    if (!w || !h) { requestAnimationFrame(drawScene);return; }
    const frame = lastFrame ? clamp((time - lastFrame) / 16.667, .2, 2.5) : 1;
    lastFrame = time;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = "#ffffff22";ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();ctx.ellipse(w / 2, h * .52, Math.min(w * .48, 190) + i * 25, Math.min(h * .31, 165) + i * 19, -.1, 0, Math.PI * 2);ctx.stroke();
    }
    ctx.restore();

    drawSoap();
    drawChips(frame);
    drawDust(frame);
    drawStreaks(frame);
    drawKnife();

    if (lastToast && time - lastToast > 1300) {
      ui.toast.classList.remove("show");
      lastToast = 0;
    }
    requestAnimationFrame(drawScene);
  }

  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { lastFrame = 0; });
  newBar(false);
  resize();
  requestAnimationFrame(drawScene);
})();