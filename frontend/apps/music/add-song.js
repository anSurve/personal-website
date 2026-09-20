(function () {
  const form = document.getElementById("add-song-form");
  const submitBtn = document.getElementById("add-song-submit");
  const statusEl = document.getElementById("add-song-status");
  const audioInput = document.getElementById("song-audio");
  const titleInput = document.getElementById("song-title");
  const artistInput = document.getElementById("song-artist");
  const audioMetaStatus = document.getElementById("audio-meta-status");
  const coverPreview = document.getElementById("cover-preview");
  const coverPreviewImg = document.getElementById("cover-preview-img");

  let extractedCoverFile = null;

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type || ""}`.trim();
  }

  function extensionForFormat(format) {
    if (/png/i.test(format)) return "png";
    if (/gif/i.test(format)) return "gif";
    return "jpg";
  }

  function readTags(file) {
    return new Promise((resolve, reject) => {
      if (!window.jsmediatags) {
        reject(new Error("jsmediatags not loaded"));
        return;
      }
      window.jsmediatags.read(file, { onSuccess: resolve, onError: reject });
    });
  }

  audioInput.addEventListener("change", async () => {
    extractedCoverFile = null;
    coverPreview.hidden = true;
    audioMetaStatus.textContent = "";

    const file = audioInput.files[0];
    if (!file) return;

    try {
      const tag = await readTags(file);
      const { title, artist, picture } = tag.tags || {};
      const foundBits = [];

      if (title && !titleInput.value) {
        titleInput.value = title;
        foundBits.push("title");
      }
      if (artist && !artistInput.value) {
        artistInput.value = artist;
        foundBits.push("artist");
      }

      if (picture && picture.data && picture.data.length) {
        const bytes = new Uint8Array(picture.data);
        const format = picture.format && picture.format.startsWith("image/") ? picture.format : `image/${picture.format || "jpeg"}`;
        const blob = new Blob([bytes], { type: format });
        extractedCoverFile = new File([blob], `cover.${extensionForFormat(format)}`, { type: format });
        coverPreviewImg.src = URL.createObjectURL(blob);
        coverPreview.hidden = false;
        foundBits.push("cover art");
      }

      if (foundBits.length) {
        audioMetaStatus.textContent = `Found ${foundBits.join(", ")} in the file's tags.`;
        audioMetaStatus.className = "status-message success";
      }
    } catch (err) {
      // No tags, or an unsupported/corrupt tag block -- not an error worth
      // surfacing, the user can just fill the fields in manually.
      console.warn("Could not read audio tags:", err);
    }
  });

  async function uploadToPresignedUrl(url, file) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("song-password").value;
    const title = titleInput.value.trim();
    const artist = artistInput.value.trim();
    const audioFile = audioInput.files[0];
    const coverFile = document.getElementById("song-cover").files[0] || extractedCoverFile;

    if (!title || !audioFile) {
      setStatus("Title and an audio file are required.", "error");
      return;
    }

    submitBtn.disabled = true;

    try {
      setStatus("Requesting upload URL...", "");
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

      setStatus("Uploading audio...", "");
      await uploadToPresignedUrl(audioUploadUrl, audioFile);

      if (coverFile && coverUploadUrl) {
        setStatus("Uploading cover...", "");
        await uploadToPresignedUrl(coverUploadUrl, coverFile);
      }

      setStatus("Saving...", "");
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
      setStatus(`Added "${entry.title}". Taking you back...`, "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Something went wrong.", "error");
      submitBtn.disabled = false;
    }
  });
})();
