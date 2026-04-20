import { defineConfig } from "vite";

/** Spiel per HTTP ausliefern (nötig für ES-Module + zuverlässiges Vollbild). */
export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    port: 5173,
    open: true,
    host: true,
  },
});
