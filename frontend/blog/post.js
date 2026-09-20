(function () {
  const postEl = document.getElementById("post");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  async function loadPost() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      postEl.innerHTML = '<p class="error-state">No post specified.</p>';
      return;
    }

    try {
      const res = await fetch(`${window.API_BASE_URL}/posts/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        postEl.innerHTML = '<p class="error-state">Post not found.</p>';
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const post = await res.json();

      document.title = `${post.title} - Aniket Surve`;
      postEl.innerHTML = `
        <h1>${escapeHtml(post.title)}</h1>
        <div class="meta">${formatDate(post.createdAt)}</div>
        <div class="post-content">${post.content || ""}</div>
      `;
    } catch (err) {
      console.error(err);
      postEl.innerHTML = '<p class="error-state">Could not load this post right now.</p>';
    }
  }

  loadPost();
})();
