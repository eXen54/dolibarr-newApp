import axios from "axios";

// URL relative : les requêtes passent par le serveur de dev Vite, qui monte
// notre API Express (proxy Dolibarr). Aucun serveur séparé à lancer.
const API_BASE = "/dolibarr-api";
const API_KEY = "0484jI75pnIwAyQX4GD8N1cyb5AfKfgA";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    DOLAPIKEY: API_KEY,
    "Content-Type": "application/json",
  },
});

export default api;
