// Service des jours fériés (stockés en SQLite via notre API locale).
// Les URL sont relatives : elles passent par le serveur de dev Vite.

export const getHolidays = () =>
  fetch("/api/holidays").then((r) => r.json());

export const createHoliday = (data) =>
  fetch("/api/holidays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateHoliday = (id, data) =>
  fetch(`/api/holidays/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteHoliday = (id) =>
  fetch(`/api/holidays/${id}`, { method: "DELETE" }).then((r) => r.json());

// Vide toute la table (appelé par le reset global).
export const clearHolidays = () =>
  fetch("/api/holidays", { method: "DELETE" }).then((r) => r.json());
