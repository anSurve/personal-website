(function () {
  const entriesEl = document.getElementById("entries");
  const form = document.getElementById("guestbook-form");
  const statusEl = document.getElementById("form-status");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  async function loadEntries() {
    try {
      const res = await fetch(`${window.API_BASE_URL}/guestbook`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const entries = await res.json();

      if (!entries.length) {
        entriesEl.innerHTML = '<p class="empty-state">No entries yet. Be the first!</p>';
        return;
      }

      entriesEl.innerHTML = entries
        .map(
          (entry) => `
        <div class="card">
          <div class="meta">${escapeHtml(entry.name)} &middot; ${formatDate(entry.createdAt)}</div>
          <p>${escapeHtml(entry.message)}</p>
        </div>`
        )
        .join("");
    } catch (err) {
      console.error(err);
      entriesEl.innerHTML = '<p class="error-state">Could not load entries right now.</p>';
    }
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type || ""}`.trim();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    setStatus("Submitting...", "");

    const payload = {
      name: form.name.value,
      message: form.message.value,
      website: form.website.value, // honeypot
    };

    try {
      const res = await fetch(`${window.API_BASE_URL}/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed: ${res.status}`);
      }

      form.reset();
      setStatus("Thanks for signing the guestbook!", "success");
      loadEntries();
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Something went wrong. Please try again.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  loadEntries();
})();
