// Thin wrappers around the gamification endpoints (slice 7): derived streaks /
// heatmap / badges, and CRUD for the coach-set milestone targets.
import { apiFetch } from '../lib/api.js';

export const getGamification = (clientId) => apiFetch(`/api/clients/${clientId}/gamification`);
export const getMilestones = (clientId) => apiFetch(`/api/clients/${clientId}/milestones`);
export const createMilestone = (clientId, data) =>
  apiFetch(`/api/clients/${clientId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
export const updateMilestone = (clientId, id, data) =>
  apiFetch(`/api/clients/${clientId}/milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMilestone = (clientId, id) =>
  apiFetch(`/api/clients/${clientId}/milestones/${id}`, { method: 'DELETE' });
