(function () {
  const trackListEl = document.getElementById("track-list");
  const audio = document.getElementById("audio-el");

  const playBtn = document.getElementById("play-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const seek = document.getElementById("seek");
  const currentTimeEl = document.getElementById("current-time");
  const durationEl = document.getElementById("duration");
  const volume = document.getElementById("volume");
  const npCover = document.getElementById("np-cover");
  const npTitle = document.getElementById("np-title");
  const npArtist = document.getElementById("np-artist");

  const PLAY_ICON = '<path d="M8 5v14l11-7z"></path>';
  const PAUSE_ICON = '<rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect>';
  const NOTE_ICON =
    '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>';

  let songs = [];
  let currentIndex = -1;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function renderTrackList() {
    if (!songs.length) {
      trackListEl.innerHTML = '<p class="empty-state">No songs yet.</p>';
      return;
    }
    trackListEl.innerHTML = songs
      .map((song, i) => {
        const cover = song.cover
          ? `<img src="../../${escapeHtml(song.cover)}" alt="" />`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${NOTE_ICON}</svg>`;
        return `
        <div class="track-row${i === currentIndex ? " active" : ""}" data-index="${i}" role="button" tabindex="0">
          <div class="track-cover">${cover}</div>
          <div class="track-info">
            <div class="track-title">${escapeHtml(song.title)}</div>
            <div class="track-artist">${escapeHtml(song.artist || "")}</div>
          </div>
          <div class="track-duration">${song.duration ? formatTime(song.duration) : ""}</div>
        </div>`;
      })
      .join("");

    trackListEl.querySelectorAll(".track-row").forEach((row) => {
      const play = () => loadTrack(Number(row.dataset.index), true);
      row.addEventListener("click", play);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          play();
        }
      });
    });
  }

  function loadTrack(index, autoplay) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];

    audio.src = `../../${song.file}`;
    npTitle.textContent = song.title;
    npArtist.textContent = song.artist || "";
    npCover.innerHTML = song.cover
      ? `<img src="../../${escapeHtml(song.cover)}" alt="" />`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${NOTE_ICON}</svg>`;

    [playBtn, prevBtn, nextBtn, seek].forEach((el) => (el.disabled = false));
    renderTrackList();

    if (autoplay) {
      audio.play();
    }
  }

  function togglePlay() {
    if (currentIndex === -1) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function playNext() {
    if (!songs.length) return;
    loadTrack((currentIndex + 1) % songs.length, true);
  }

  function playPrev() {
    if (!songs.length) return;
    loadTrack((currentIndex - 1 + songs.length) % songs.length, true);
  }

  audio.addEventListener("play", () => {
    playBtn.querySelector("svg").innerHTML = PAUSE_ICON;
    playBtn.setAttribute("aria-label", "Pause");
  });

  audio.addEventListener("pause", () => {
    playBtn.querySelector("svg").innerHTML = PLAY_ICON;
    playBtn.setAttribute("aria-label", "Play");
  });

  audio.addEventListener("timeupdate", () => {
    if (!isFinite(audio.duration)) return;
    seek.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("ended", playNext);

  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", playPrev);
  nextBtn.addEventListener("click", playNext);

  seek.addEventListener("input", () => {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = (seek.value / 100) * audio.duration;
  });

  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value);
  });

  async function loadManifest() {
    try {
      const res = await fetch("../../songs/manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      songs = await res.json();
      renderTrackList();
    } catch (err) {
      console.error(err);
      trackListEl.innerHTML = '<p class="empty-state">No songs yet.</p>';
    }
  }

  loadManifest();
})();
