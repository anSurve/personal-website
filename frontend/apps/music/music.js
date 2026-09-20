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

  // --- Add Song form ---

  const addSongToggle = document.getElementById("add-song-toggle");
  const addSongForm = document.getElementById("add-song-form");
  const addSongCancel = document.getElementById("add-song-cancel");
  const addSongSubmit = document.getElementById("add-song-submit");
  const addSongStatus = document.getElementById("add-song-status");

  function setAddSongStatus(message, type) {
    addSongStatus.textContent = message;
    addSongStatus.className = `status-message ${type || ""}`.trim();
  }

  function toggleAddSongForm(show) {
    addSongForm.hidden = !show;
    if (show) {
      setAddSongStatus("", "");
      document.getElementById("song-title").focus();
    }
  }

  addSongToggle.addEventListener("click", () => toggleAddSongForm(addSongForm.hidden));
  addSongCancel.addEventListener("click", () => {
    addSongForm.reset();
    toggleAddSongForm(false);
  });

  async function uploadToPresignedUrl(url, file) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  }

  addSongForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("song-password").value;
    const title = document.getElementById("song-title").value.trim();
    const artist = document.getElementById("song-artist").value.trim();
    const audioFile = document.getElementById("song-audio").files[0];
    const coverFile = document.getElementById("song-cover").files[0];

    if (!title || !audioFile) {
      setAddSongStatus("Title and an audio file are required.", "error");
      return;
    }

    addSongSubmit.disabled = true;

    try {
      setAddSongStatus("Requesting upload URL...", "");
      const urlRes = await fetch(`${window.API_BASE_URL}/songs/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          title,
          filename: audioFile.name,
          contentType: audioFile.type,
          coverFilename: coverFile ? coverFile.name : undefined,
          coverContentType: coverFile ? coverFile.type : undefined,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${urlRes.status})`);
      }

      const { slug, audioKey, audioUploadUrl, coverKey, coverUploadUrl } = await urlRes.json();

      setAddSongStatus("Uploading audio...", "");
      await uploadToPresignedUrl(audioUploadUrl, audioFile);

      if (coverFile && coverUploadUrl) {
        setAddSongStatus("Uploading cover...", "");
        await uploadToPresignedUrl(coverUploadUrl, coverFile);
      }

      setAddSongStatus("Saving...", "");
      const confirmRes = await fetch(`${window.API_BASE_URL}/songs/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, slug, title, artist, audioKey, coverKey }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${confirmRes.status})`);
      }

      const entry = await confirmRes.json();
      songs = songs.filter((s) => s.id !== entry.id);
      songs.push(entry);
      renderTrackList();

      addSongForm.reset();
      setAddSongStatus(`Added "${entry.title}".`, "success");
      setTimeout(() => toggleAddSongForm(false), 1200);
    } catch (err) {
      console.error(err);
      setAddSongStatus(err.message || "Something went wrong.", "error");
    } finally {
      addSongSubmit.disabled = false;
    }
  });
})();
