// Thin wrapper around fetch() for the new design's pages. CSRF is handled
// globally in app.js (X-XSRF-TOKEN is attached to state-changing same-origin
// requests), so callers just hit the existing /api/* endpoints — the same ones
// the legacy AD.FACTORY / Growth Portal JS used. Every call returns parsed JSON
// and throws an Error (with the server's message when present) on a non-2xx.

async function request(method, url, body) {
  const init = { method, headers: { Accept: 'application/json' } };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url, body) => request('DELETE', url, body),
};

// Upload helper for multipart form posts (design images) — Content-Type is left
// to the browser so the multipart boundary is set; CSRF still applies via app.js.
export async function upload(url, formData) {
  const res = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body: formData });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Upload failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
