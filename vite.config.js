import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths - this app is deployed as a GitHub Pages *project*
  // site (https://dryboss.github.io/hangman-friends/), not from the domain
  // root, and is also packaged into Capacitor. An absolute base of "/"
  // (Vite's default) breaks both: it points assets at the domain root
  // instead of the actual subfolder they're served from.
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
