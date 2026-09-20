(function () {
  const form = document.getElementById("add-song-form");
  const submitBtn = document.getElementById("add-song-submit");
  const statusEl = document.getElementById("add-song-status");

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type || ""}`.trim();
  }

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
    const title = document.getElementById("song-title").value.trim();
    const artist = document.getElementById("song-artist").value.trim();
    const audioFile = document.getElementById("song-audio").files[0];
    const coverFile = document.getElementById("song-cover").files[0];

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
