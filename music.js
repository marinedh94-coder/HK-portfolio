(() => {
  const audio = document.createElement("audio");
  audio.src = "assets/cafe-waltz.wav";
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0.35;
  audio.setAttribute("aria-hidden", "true");
  document.body.appendChild(audio);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "music-toggle";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "오리지널 카페 왈츠 음악 켜기");
  button.title = "오리지널 카페 왈츠 · 직접 켜고 끄기";
  button.innerHTML = '<span class="music-icon" aria-hidden="true">♫</span><span class="music-label">음악 켜기</span>';
  document.body.appendChild(button);

  function update() {
    const playing = !audio.paused;
    button.setAttribute("aria-pressed", String(playing));
    button.setAttribute("aria-label", playing ? "배경음악 끄기" : "오리지널 카페 왈츠 음악 켜기");
    button.querySelector(".music-label").textContent = playing ? "음악 끄기" : "음악 켜기";
  }

  button.addEventListener("click", async () => {
    if (!audio.paused) {
      audio.pause();
      update();
      return;
    }
    try {
      await audio.play();
      update();
    } catch {
      button.querySelector(".music-label").textContent = "재생할 수 없어요";
      button.setAttribute("aria-label", "음악 재생 실패, 다시 시도하기");
    }
  });
  audio.addEventListener("pause", update);
  audio.addEventListener("play", update);
})();
