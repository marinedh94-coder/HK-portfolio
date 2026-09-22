(() => {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.className = "pixel-cursor-layer";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const leaves = [[5, 5], [10, 5], [5, 10], [10, 10]];
  const pixels = Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) =>
      leaves.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= 11)
    )
  );
  const sparkles = [];
  let point = null;
  let previous = null;
  let lastSparkle = null;
  let frame = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = false;
    schedule();
  }

  function drawClover(x, y) {
    const left = Math.round(x) - 16;
    const top = Math.round(y) - 16;
    context.fillStyle = "#174b38";
    context.fillRect(left + 14, top + 23, 6, 9);
    context.fillStyle = "#83bd62";
    context.fillRect(left + 16, top + 23, 2, 7);

    for (let row = 0; row < 16; row++) {
      for (let column = 0; column < 16; column++) {
        if (!pixels[row][column]) continue;
        const edge = !pixels[row - 1]?.[column] ||
          !pixels[row + 1]?.[column] ||
          !pixels[row]?.[column - 1] ||
          !pixels[row]?.[column + 1];
        context.fillStyle = edge
          ? "#174b38"
          : row < 8 ? "#a8dc79" : "#79bd65";
        context.fillRect(left + column * 2, top + row * 2, 2, 2);
      }
    }

    context.fillStyle = "#e6f3a7";
    context.fillRect(left + 10, top + 8, 2, 2);
    context.fillRect(left + 22, top + 8, 2, 2);
    context.fillRect(left + 10, top + 20, 2, 2);
    context.fillRect(left + 22, top + 20, 2, 2);
    context.fillStyle = "#f3e6a8";
    context.fillRect(left + 15, top + 15, 2, 2);
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let index = sparkles.length - 1; index >= 0; index--) {
      const sparkle = sparkles[index];
      const life = 1 - (now - sparkle.born) / 460;
      if (life <= 0) {
        sparkles.splice(index, 1);
        continue;
      }
      context.globalAlpha = life;
      context.fillStyle = sparkle.color;
      const x = Math.round(sparkle.x);
      const y = Math.round(sparkle.y - (1 - life) * 8);
      context.fillRect(x - 1, y - 1, 3, 3);
      context.fillRect(x - 4, y, 3, 1);
      context.fillRect(x + 2, y, 3, 1);
      context.fillRect(x, y - 4, 1, 3);
      context.fillRect(x, y + 2, 1, 3);
    }
    context.globalAlpha = 1;
    if (point) drawClover(point.x, point.y);
    if (sparkles.length) schedule();
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(draw);
  }

  function move(event) {
    if (event.pointerType !== "mouse") return;
    const next = { x: event.clientX, y: event.clientY };
    if (!reducedMotion.matches && previous &&
        (!lastSparkle || Math.hypot(next.x - lastSparkle.x, next.y - lastSparkle.y) > 14)) {
      sparkles.push({
        x: previous.x + (Math.random() - 0.5) * 14,
        y: previous.y + (Math.random() - 0.5) * 14,
        born: performance.now(),
        color: Math.random() < 0.5 ? "#b8e893" : "#f4e9a3"
      });
      if (sparkles.length > 35) sparkles.shift();
      lastSparkle = next;
    }
    previous = next;
    point = next;
    document.body.classList.add("pixel-cursor-active");
    schedule();
  }

  function clear() {
    point = null;
    previous = null;
    lastSparkle = null;
    sparkles.length = 0;
    document.body.classList.remove("pixel-cursor-active");
    schedule();
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("mouseleave", clear);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) sparkles.length = 0;
  });
})();
