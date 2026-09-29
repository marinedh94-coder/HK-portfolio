(() => {
  const audio = document.createElement("audio");
  audio.src = "assets/gentle-editorial-piano.wav";
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0.28;
  audio.setAttribute("aria-hidden", "true");
  document.body.appendChild(audio);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "music-toggle";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "감미로운 오리지널 피아노 음악 켜기");
  button.title = "감미로운 오리지널 피아노 · 직접 켜고 끄기";
  button.innerHTML = '<span class="music-icon" aria-hidden="true">♫</span><span class="music-label">음악 켜기</span>';
  document.body.appendChild(button);

  function update() {
    const playing = !audio.paused;
    button.setAttribute("aria-pressed", String(playing));
    button.setAttribute("aria-label", playing ? "배경음악 끄기" : "감미로운 오리지널 피아노 음악 켜기");
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
