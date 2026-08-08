// Thin fetch wrapper for the API. Throws an Error with the server's message
// on non-2xx responses, so callers can just show err.message.
export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error ?? `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
