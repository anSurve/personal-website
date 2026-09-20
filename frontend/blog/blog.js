(function () {
  const postsEl = document.getElementById("posts");

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

  async function loadPosts() {
    try {
      const res = await fetch(`${window.API_BASE_URL}/posts`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const posts = await res.json();

      if (!posts.length) {
        postsEl.innerHTML = '<p class="empty-state">No posts yet. Check back soon.</p>';
        return;
      }

      postsEl.innerHTML = posts
        .map(
          (post) => `
        <article class="card">
          <a class="card-link" href="post.html?id=${encodeURIComponent(post.id)}">
            <h2>${escapeHtml(post.title)}</h2>
            <div class="meta">${formatDate(post.createdAt)}</div>
            <p>${escapeHtml(post.summary || "")}</p>
          </a>
        </article>`
        )
        .join("");
    } catch (err) {
      console.error(err);
      postsEl.innerHTML = '<p class="error-state">Could not load posts right now.</p>';
    }
  }

  loadPosts();
})();
