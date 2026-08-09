// Thin wrappers around the workout endpoints (slice 4): the shared exercise
// library, the per-client plan, session logging, and the derived lift history.
import { apiFetch } from '../lib/api.js';

// Exercise library (shared across all clients)
export const listExercises = () => apiFetch('/api/exercises');
export const createExercise = (data) =>
  apiFetch('/api/exercises', { method: 'POST', body: JSON.stringify(data) });
export const updateExercise = (id, data) =>
  apiFetch(`/api/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteExercise = (id) =>
  apiFetch(`/api/exercises/${id}`, { method: 'DELETE' });

// Plan (per client)
export const getPlan = (clientId) => apiFetch(`/api/clients/${clientId}/plan`);
export const createPlanDay = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/plan/days`, { method: 'POST', body: JSON.stringify(data) });
export const updatePlanDay = (clientId, dayId, data) =>
  apiFetch(`/api/clients/${clientId}/plan/days/${dayId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePlanDay = (clientId, dayId) =>
  apiFetch(`/api/clients/${clientId}/plan/days/${dayId}`, { method: 'DELETE' });

// Session logging
export const getSessions = (clientId) => apiFetch(`/api/clients/${clientId}/sessions`);
export const logSession = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/sessions`, { method: 'POST', body: JSON.stringify(data) });
export const deleteSession = (clientId, sessionId) =>
  apiFetch(`/api/clients/${clientId}/sessions/${sessionId}`, { method: 'DELETE' });

// Derived: progressive overload + PRs
export const getLiftHistory = (clientId) => apiFetch(`/api/clients/${clientId}/lift-history`);
