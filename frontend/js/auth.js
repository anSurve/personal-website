// Site-wide sign-in with Amazon Cognito (email/password, plus Google when
// configured), using the OAuth authorization-code flow with PKCE.
//
// Needs window.AUTH_CONFIG from js/config.js. Adds a "Sign in" button / user
// menu to every page's nav.site-nav, and exposes window.SiteAuth for apps:
//   SiteAuth.isSignedIn(), .user(), .getIdToken(), .apiFetch(path, init),
//   .signIn(), .signOut(); fires "siteauth:change" on window.
(() => {
  const cfg = window.AUTH_CONFIG || {};
  const enabled = !!(cfg.domain && cfg.clientId);
  const TOKENS = "site-auth-tokens";
  const PENDING = "site-auth-pending";
  // Site root = the folder above this script (…/js/auth.js -> …/)
  const ROOT = new URL("..", document.currentScript.src);
  const redirectUri = new URL("auth/callback.html", ROOT).href;
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  // Cognito only redirects back to HTTPS (or localhost) addresses
  const canSignInHere = location.protocol === "https:" || local;

  const store = {
    get(k, area = localStorage) { try { return JSON.parse(area.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v, area = localStorage) { try { area.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k, area = localStorage) { try { area.removeItem(k); } catch (e) {} },
  };

  const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const randomString = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
  async function challengeFor(verifier) {
    return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  }
  function decodeJwt(token) {
    try {
      const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(part.padEnd(part.length + (4 - part.length % 4) % 4, "=")))));
    } catch (e) { return null; }
  }

  async function tokenRequest(params) {
    const res = await fetch(`https://${cfg.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cfg.clientId, ...params }),
    });
    if (!res.ok) throw new Error(`Token request failed (${res.status})`);
    return res.json();
  }
  function saveTokens(t, keepRefresh) {
    const prev = store.get(TOKENS) || {};
    store.set(TOKENS, {
      id_token: t.id_token,
      access_token: t.access_token,
      refresh_token: t.refresh_token || keepRefresh || prev.refresh_token,
      expires_at: Date.now() + (t.expires_in || 3600) * 1000,
    });
  }

  function user() {
    const t = store.get(TOKENS);
    const c = t && decodeJwt(t.id_token);
    if (!c) return null;
    return { sub: c.sub, email: c.email, name: c.name || c.given_name || (c.email || "").split("@")[0], picture: c.picture || null };
  }
  const isSignedIn = () => !!user();

  let refreshing = null;
  async function getIdToken() {
    const t = store.get(TOKENS);
    if (!t) return null;
    if (t.expires_at - Date.now() > 60 * 1000) return t.id_token;
    if (!t.refresh_token) { clear(); return null; }
    refreshing = refreshing || tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token })
      .then(n => { saveTokens(n, t.refresh_token); return n.id_token; })
      .catch(() => { clear(); return null; })
      .finally(() => { refreshing = null; });
    return refreshing;
  }

  async function apiFetch(path, init = {}, retried = false) {
    const token = await getIdToken();
    if (!token) throw new Error("Not signed in");
    const res = await fetch((window.API_BASE_URL || "") + path, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: token, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (res.status === 401 && !retried) {
      const t = store.get(TOKENS);
      if (t) { t.expires_at = 0; store.set(TOKENS, t); }
      return apiFetch(path, init, true);
    }
    return res;
  }

  function changed() {
    renderNav();
    window.dispatchEvent(new CustomEvent("siteauth:change", { detail: user() }));
  }
  function clear() { store.del(TOKENS); changed(); }

  async function signIn({ provider } = {}) {
    if (!enabled) return;
    if (!canSignInHere) {
      // On the plain-HTTP address: send people to the HTTPS site instead
      location.href = cfg.siteUrl ? new URL(location.pathname + location.hash, cfg.siteUrl).href : location.href.replace(/^http:/, "https:");
      return;
    }
    const verifier = randomString(48), state = randomString(16);
    store.set(PENDING, { verifier, state, returnTo: location.href }, sessionStorage);
    const q = new URLSearchParams({
      response_type: "code", client_id: cfg.clientId, redirect_uri: redirectUri, scope: "openid email profile",
      state, code_challenge: await challengeFor(verifier), code_challenge_method: "S256",
    });
    if (provider) q.set("identity_provider", provider);
    location.href = `https://${cfg.domain}/oauth2/authorize?${q}`;
  }

  function signOut() {
    const t = store.get(TOKENS);
    store.del(TOKENS);
    store.set(PENDING, { returnTo: location.href }, sessionStorage);
    // Revoke the refresh token, then end the Cognito session too
    if (t && t.refresh_token) {
      fetch(`https://${cfg.domain}/oauth2/revoke`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: t.refresh_token, client_id: cfg.clientId }), keepalive: true }).catch(() => {});
    }
    location.href = `https://${cfg.domain}/logout?${new URLSearchParams({ client_id: cfg.clientId, logout_uri: redirectUri })}`;
  }

  // Runs on auth/callback.html after Cognito redirects back (sign-in or sign-out)
  async function handleCallback() {
    const q = new URLSearchParams(location.search);
    const pending = store.get(PENDING, sessionStorage) || {};
    store.del(PENDING, sessionStorage);
    const home = new URL("index.html", ROOT).href;
    const back = pending.returnTo && pending.returnTo.startsWith(ROOT.origin) ? pending.returnTo : home;
    if (q.get("error")) throw new Error(q.get("error_description") || q.get("error"));
    if (!q.get("code")) { location.replace(back); return; } // returning from sign-out
    if (!pending.verifier || q.get("state") !== pending.state) throw new Error("This sign-in link has expired. Please try again.");
    const tokens = await tokenRequest({ grant_type: "authorization_code", code: q.get("code"), redirect_uri: redirectUri, code_verifier: pending.verifier });
    saveTokens(tokens);
    location.replace(back);
  }

  // ---------- Header widget ----------
  function renderNav() {
    const nav = document.querySelector("nav.site-nav");
    if (!nav || !enabled) return;
    let slot = nav.querySelector(".auth-slot");
    if (!slot) { slot = document.createElement("div"); slot.className = "auth-slot"; nav.appendChild(slot); }
    const u = user();
    if (!u) {
      slot.innerHTML = `<button type="button" class="auth-btn">Sign in</button>`;
      slot.querySelector("button").addEventListener("click", () => signIn());
      return;
    }
    const initial = (u.name || u.email || "?").trim().charAt(0).toUpperCase();
    slot.innerHTML = `
      <button type="button" class="auth-user" aria-haspopup="true" aria-expanded="false">
        ${u.picture ? `<img src="${encodeURI(u.picture)}" alt="" referrerpolicy="no-referrer">` : `<span>${initial.replace(/[<>&"]/g, "")}</span>`}
      </button>
      <div class="auth-menu" hidden>
        <b></b><small></small>
        <button type="button" class="auth-out">Sign out</button>
      </div>`;
    slot.querySelector(".auth-menu b").textContent = u.name || "";
    slot.querySelector(".auth-menu small").textContent = u.email || "";
    const btn = slot.querySelector(".auth-user"), menu = slot.querySelector(".auth-menu");
    btn.title = `Signed in as ${u.email || u.name}`;
    btn.addEventListener("click", e => { e.stopPropagation(); toggleMenu(menu.hidden); });
    slot.querySelector(".auth-out").addEventListener("click", signOut);
  }
  function toggleMenu(open) {
    const menu = document.querySelector(".auth-slot .auth-menu"), btn = document.querySelector(".auth-slot .auth-user");
    if (!menu || !btn) return;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  }
  document.addEventListener("click", e => { if (!e.target.closest(".auth-slot")) toggleMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") toggleMenu(false); });

  window.SiteAuth = { enabled, isSignedIn, user, getIdToken, apiFetch, signIn, signOut, handleCallback };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderNav); else renderNav();
  // Keep tabs in sync when signing in/out in another tab
  window.addEventListener("storage", e => { if (e.key === TOKENS) changed(); });
})();
