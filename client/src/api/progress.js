// Unified measurements endpoints (weight + body stats)
import { apiFetch } from '../lib/api.js';

export const getMeasurements = (clientId) => apiFetch(`/api/clients/${clientId}/measurements`);

export const createMeasurement = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/measurements`, { method: 'POST', body: JSON.stringify(data) });

export const updateMeasurement = (entryId, data) =>
  apiFetch(`/api/measurements/${entryId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteMeasurement = (entryId) =>
  apiFetch(`/api/measurements/${entryId}`, { method: 'DELETE' });
