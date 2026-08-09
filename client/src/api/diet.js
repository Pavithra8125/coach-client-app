// Thin wrappers around the per-client diet endpoints (slice 5): daily macro
// targets (meal plan), the food log, water, and the supplement tracker.
import { apiFetch } from '../lib/api.js';

// Meal plan — the client's current daily macro targets (upsert; one per client)
export const getMealPlan = (clientId) => apiFetch(`/api/clients/${clientId}/meal-plan`);
export const saveMealPlan = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/meal-plan`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMealPlan = (clientId) =>
  apiFetch(`/api/clients/${clientId}/meal-plan`, { method: 'DELETE' });

// Food log — per-day entries plus running totals
export const getFoodLog = (clientId, date) =>
  apiFetch(`/api/clients/${clientId}/food-log?date=${encodeURIComponent(date)}`);
export const addFood = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/food-log`, { method: 'POST', body: JSON.stringify(data) });
export const deleteFood = (clientId, entryId) =>
  apiFetch(`/api/clients/${clientId}/food-log/${entryId}`, { method: 'DELETE' });

// Water — glasses per day (upsert)
export const getWater = (clientId, date) =>
  apiFetch(`/api/clients/${clientId}/water?date=${encodeURIComponent(date)}`);
export const setWater = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/water`, { method: 'PUT', body: JSON.stringify(data) });

// Supplements — the client's list, plus which were taken on a given day
export const getSupplements = (clientId) => apiFetch(`/api/clients/${clientId}/supplements`);
export const addSupplement = (clientId, name) =>
  apiFetch(`/api/clients/${clientId}/supplements`, { method: 'POST', body: JSON.stringify({ name }) });
export const deleteSupplement = (clientId, id) =>
  apiFetch(`/api/clients/${clientId}/supplements/${id}`, { method: 'DELETE' });
export const getSupplementLog = (clientId, date) =>
  apiFetch(`/api/clients/${clientId}/supplement-log?date=${encodeURIComponent(date)}`);
export const setSupplementLog = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/supplement-log`, { method: 'PUT', body: JSON.stringify(data) });
