// Thin wrappers around the client endpoints. All use the shared apiFetch
// helper (session cookie is sent automatically, same-origin).
import { apiFetch } from '../lib/api.js';

export const listClients = () => apiFetch('/api/clients');
export const getClient = (id) => apiFetch(`/api/clients/${id}`);
export const createClient = (data) =>
  apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id, data) =>
  apiFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id) => apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
