import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/tests/**/*.test.{ts,tsx}"],
    // Misma URL del gateway en todos los entornos de test. MSW intercepta las peticiones
    // (src/tests/utils/server.ts), así que no hace falta el backend.
    env: { VITE_URL_API_BACKEND: "http://localhost:3000" },
  },
})
