(() => {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.className = 'ink-cursor-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ink = [];
  const inkLifetime = 760;
  let point = null;
  let frame = 0;

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(draw);
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    schedule();
  }

  function drawInk(now) {
    while (ink.length && now - ink[0].time > inkLifetime) ink.shift();

    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let index = 1; index < ink.length; index++) {
      const previous = ink[index - 1];
      const current = ink[index];
      if (current.break) continue;

      const before = ink[Math.max(0, index - 2)];
      const after = ink[Math.min(ink.length - 1, index + 1)];
      const startX = before === previous || previous.break ? previous.x : (before.x + previous.x) / 2;
      const startY = before === previous || previous.break ? previous.y : (before.y + previous.y) / 2;
      const endX = after.break ? current.x : (current.x + after.x) / 2;
      const endY = after.break ? current.y : (current.y + after.y) / 2;
      const distance = Math.hypot(current.x - previous.x, current.y - previous.y) || 1;
      const vertical = Math.abs(current.y - previous.y) / distance;
      const life = Math.max(0, 1 - (now - current.time) / inkLifetime);

      context.globalAlpha = life * life * 0.82;
      context.strokeStyle = '#1b5140';
      context.lineWidth = (1.1 + vertical * 2.6) * (0.45 + life * 0.55);
      context.beginPath();
      context.moveTo(startX, startY);
      context.quadraticCurveTo(previous.x, previous.y, endX, endY);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawPen(x, y) {
    context.save();
    context.translate(x, y);
    context.lineJoin = 'round';

    // The nib tip is the click position. Its pale rim stays visible on dark panels.
    context.fillStyle = '#194b3d';
    context.strokeStyle = '#f5e9c8';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(4, -12);
    context.lineTo(12, -20);
    context.lineTo(21, -11);
    context.lineTo(12, -3);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = '#f0d390';
    context.beginPath();
    context.moveTo(3, -4);
    context.lineTo(6, -12);
    context.lineTo(12, -18);
    context.lineTo(19, -11);
    context.lineTo(11, -5);
    context.closePath();
    context.fill();

    context.strokeStyle = '#1b5140';
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(0.5, -0.5);
    context.lineTo(11, -11);
    context.stroke();
    context.fillStyle = '#1b5140';
    context.beginPath();
    context.arc(11, -11, 1.7, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#1b5140';
    context.strokeStyle = '#f5e9c8';
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(12, -20);
    context.lineTo(27, -35);
    context.quadraticCurveTo(29, -37, 31, -35);
    context.lineTo(35, -31);
    context.quadraticCurveTo(37, -29, 35, -27);
    context.lineTo(21, -11);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = '#f0d390';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(17, -25);
    context.lineTo(28, -14);
    context.stroke();
    context.strokeStyle = 'rgba(245, 233, 200, .7)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(25, -32);
    context.lineTo(32, -25);
    context.stroke();
    context.restore();
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!reducedMotion.matches) drawInk(now);
    if (point) drawPen(point.x, point.y);
    if (ink.length) schedule();
  }

  function move(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const next = { x: event.clientX, y: event.clientY, time: performance.now() };
    if (!reducedMotion.matches) {
      const previous = ink[ink.length - 1];
      const distance = previous ? Math.hypot(next.x - previous.x, next.y - previous.y) : 0;
      if (!previous || distance >= 2) {
        next.break = !previous || distance > 100 || next.time - previous.time > 100;
        ink.push(next);
        if (ink.length > 90) ink.shift();
      }
    }
    point = next;
    document.body.classList.add('fountain-pen-active');
    schedule();
  }

  function clear() {
    point = null;
    ink.length = 0;
    document.body.classList.remove('fountain-pen-active');
    schedule();
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('mouseleave', clear);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });
  reducedMotion.addEventListener('change', () => {
    ink.length = 0;
    schedule();
  });
})();
