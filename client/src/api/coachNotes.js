// Thin wrappers around the per-client coach's log endpoints (slice 6). The
// log is private dated journal notes, newest first.
import { apiFetch } from '../lib/api.js';

export const getCoachNotes = (clientId) => apiFetch(`/api/clients/${clientId}/coach-notes`);
export const addCoachNote = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/coach-notes`, { method: 'POST', body: JSON.stringify(data) });
export const deleteCoachNote = (clientId, id) =>
  apiFetch(`/api/clients/${clientId}/coach-notes/${id}`, { method: 'DELETE' });