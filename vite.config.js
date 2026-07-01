import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import apiApp from "./server/index.js";

// Plugin qui monte notre API Express (thème SQLite, photos, proxy Dolibarr)
// DANS le serveur de dev Vite. Résultat : `npm run dev` sert le front ET l'API,
// donc plus besoin de lancer `npm run server` séparément.
const backendApp = () => ({
  name: "backend-express-app",
  configureServer(server) {
    server.middlewares.use(apiApp);
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), backendApp()],
});
