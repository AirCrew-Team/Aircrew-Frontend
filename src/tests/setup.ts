import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

afterEach(() => {
  cleanup()
  // La sesión simulada es global: se reinicia para que no pase de un test a otro.
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})
