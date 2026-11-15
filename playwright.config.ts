import { defineConfig, devices } from "@playwright/test"

const isCI = Boolean(process.env.CI)

// Pruebas de extremo a extremo (spec e2e-playwright): se ejecutan contra el build de
// producción servido con `vite preview`, en Chromium de escritorio y en un móvil emulado.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "escritorio",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
      grepInvert: /@solo-movil/,
    },
    {
      name: "movil",
      use: { ...devices["Pixel 7"] },
      grep: /@movil|@solo-movil/,
    },
  ],
  webServer: {
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
})
