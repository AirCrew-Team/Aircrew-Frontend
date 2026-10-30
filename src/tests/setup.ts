import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

afterEach(() => {
  cleanup()
  // Sonner guarda los toasts en un estado global y el Toaster del test siguiente
  // repite los que siguen activos. Se descartan después de desmontar (sin suscriptores
  // no hay renders fuera de act).
  toast.dismiss()
  // La sesión simulada es global: se reinicia para que no pase de un test a otro.
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})
