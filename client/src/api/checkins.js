// Thin wrappers around the per-client weekly check-in endpoints (slice 6).
// A check-in is one row per client per date — saving a date replaces it.
import { apiFetch } from '../lib/api.js';

export const getCheckins = (clientId) => apiFetch(`/api/clients/${clientId}/checkins`);
export const saveCheckin = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/checkins`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCheckin = (clientId, id) =>
  apiFetch(`/api/clients/${clientId}/checkins/${id}`, { method: 'DELETE' });