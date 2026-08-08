// Thin wrappers around the per-client progress endpoints (weight + measurements).
// All use the shared apiFetch helper (session cookie sent automatically).
import { apiFetch } from '../lib/api.js';

export const getWeightEntries = (clientId) => apiFetch(`/api/clients/${clientId}/weight`);
export const logWeight = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/weight`, { method: 'POST', body: JSON.stringify(data) });
export const deleteWeightEntry = (clientId, entryId) =>
  apiFetch(`/api/clients/${clientId}/weight/${entryId}`, { method: 'DELETE' });

export const getMeasurements = (clientId) => apiFetch(`/api/clients/${clientId}/measurements`);
export const logMeasurements = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/measurements`, { method: 'POST', body: JSON.stringify(data) });
export const deleteMeasurement = (clientId, entryId) =>
  apiFetch(`/api/clients/${clientId}/measurements/${entryId}`, { method: 'DELETE' });
