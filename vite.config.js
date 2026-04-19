import { defineConfig } from "vite";

/** Sert le jeu en HTTP (nécessaire pour les modules ES + plein écran fiable). */
export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    port: 5173,
    open: true,
    host: true,
  },
});
