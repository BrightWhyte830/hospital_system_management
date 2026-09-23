/**
 * Thin fetch wrapper around the GhanaHealth Portal REST API.
 * Keeps the auth token in localStorage and throws a normal Error
 * (with the server's message) on any non-2xx response, so callers
 * can just try/catch instead of checking res.ok everywhere.
 */
const Api = (() => {
  const BASE = '/api';
  // Namespaced per page: the patient portal (index.html) and the staff/admin
  // console (admin.html) share one origin, so without this a token saved by
  // one would be read — and possibly cleared — by the other in another tab.
  const TOKEN_KEY = location.pathname.endsWith('admin.html') ? 'ghp_admin_token' : 'ghp_token';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = {};
    try { data = await res.json(); } catch (_) { /* empty body */ }

    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.details = data.details;
      throw err;
    }
    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),
    getToken, setToken, clearToken,
  };
})();
