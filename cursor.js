(() => {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.className = 'ink-cursor-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const strokes = [];
  const inkLifetime = 920;
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

  function strokePath(startX, startY, controlX, controlY, endX, endY, width, alpha) {
    context.globalAlpha = alpha * .17;
    context.strokeStyle = '#8f6f50';
    context.lineWidth = width + 1.15;
    context.beginPath();
    context.moveTo(startX + .35, startY + .45);
    context.quadraticCurveTo(controlX + .35, controlY + .45, endX + .35, endY + .45);
    context.stroke();

    context.globalAlpha = alpha;
    context.strokeStyle = '#314a3c';
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.stroke();
  }

  function drawInk(now) {
    while (strokes.length && now - strokes[0].time > inkLifetime) strokes.shift();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let index = 1; index < strokes.length; index++) {
      const previous = strokes[index - 1];
      const current = strokes[index];
      if (current.break) continue;

      const before = strokes[Math.max(0, index - 2)];
      const after = strokes[Math.min(strokes.length - 1, index + 1)];
      const startX = before === previous || previous.break ? previous.x : (before.x + previous.x) / 2;
      const startY = before === previous || previous.break ? previous.y : (before.y + previous.y) / 2;
      const endX = after.break ? current.x : (current.x + after.x) / 2;
      const endY = after.break ? current.y : (current.y + after.y) / 2;
      const distance = Math.hypot(current.x - previous.x, current.y - previous.y) || 1;
      const elapsed = Math.max(1, current.time - previous.time);
      const speed = distance / elapsed;
      const directionWeight = Math.abs(current.y - previous.y) / distance;
      const life = Math.max(0, 1 - (now - current.time) / inkLifetime);
      const width = Math.max(.65, Math.min(2.15, 1.85 - speed * .72 + directionWeight * .65));

      strokePath(startX, startY, previous.x, previous.y, endX, endY, width, life * life * .72);
    }
    context.globalAlpha = 1;
  }

  function drawPen(x, y) {
    context.save();
    context.translate(Math.round(x) + .5, Math.round(y) + .5);
    context.lineJoin = 'round';

    // Slender antique nib. The exact writing point remains at 0,0.
    context.fillStyle = '#ad885b';
    context.strokeStyle = '#2b211b';
    context.lineWidth = 1.05;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(3.4, -10.5);
    context.lineTo(11.2, -18.4);
    context.lineTo(18.5, -11.1);
    context.lineTo(10.4, -3.5);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = '#d6b982';
    context.beginPath();
    context.moveTo(2.2, -2.2);
    context.lineTo(5.1, -10.2);
    context.lineTo(11.2, -16.6);
    context.lineTo(16.6, -11.2);
    context.lineTo(9.7, -5.2);
    context.closePath();
    context.fill();

    context.strokeStyle = '#2f4639';
    context.lineWidth = .85;
    context.beginPath();
    context.moveTo(.4, -.4);
    context.lineTo(10.8, -10.8);
    context.stroke();
    context.fillStyle = '#2f4639';
    context.beginPath();
    context.arc(10.8, -10.8, 1.25, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#2e4036';
    context.strokeStyle = '#2b211b';
    context.lineWidth = 1.05;
    context.beginPath();
    context.moveTo(11.2, -18.4);
    context.lineTo(23.7, -31.2);
    context.quadraticCurveTo(25.2, -32.7, 26.7, -31.2);
    context.lineTo(30.1, -27.8);
    context.quadraticCurveTo(31.6, -26.3, 30.1, -24.8);
    context.lineTo(18.5, -11.1);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = '#ad885b';
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(18.6, -25.7);
    context.lineTo(25.2, -19.1);
    context.stroke();
    context.strokeStyle = 'rgba(231, 212, 176, .72)';
    context.lineWidth = .8;
    context.beginPath();
    context.moveTo(23.5, -30.1);
    context.lineTo(28.8, -24.8);
    context.stroke();

    context.fillStyle = '#314a3c';
    context.beginPath();
    context.arc(0, 0, 1.05, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!reducedMotion.matches) drawInk(now);
    if (point) drawPen(point.x, point.y);
    if (strokes.length) schedule();
  }

  function move(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const next = { x: event.clientX, y: event.clientY, time: performance.now() };
    if (!reducedMotion.matches) {
      const previous = strokes[strokes.length - 1];
      const distance = previous ? Math.hypot(next.x - previous.x, next.y - previous.y) : 0;
      if (!previous || distance >= 1.6) {
        next.break = !previous || distance > 90 || next.time - previous.time > 110;
        strokes.push(next);
        if (strokes.length > 110) strokes.shift();
      }
    }
    point = next;
    document.body.classList.add('fountain-pen-active');
    schedule();
  }

  function clear() {
    point = null;
    strokes.length = 0;
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
    strokes.length = 0;
    schedule();
  });
})();
