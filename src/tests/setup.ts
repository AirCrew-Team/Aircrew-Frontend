import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

// Las rutas lazy (Configuración, Reportar Ausencia) transforman su chunk en frío la
// primera vez: con la máquina cargada, 1 s por defecto no siempre basta y el test falla
// de forma intermitente. Solo amplía la espera máxima de findBy/waitFor.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  // Sonner guarda los toasts en un estado global y el Toaster del test siguiente
  // repite los que siguen activos. Se descartan después de desmontar (sin suscriptores
  // no hay renders fuera de act).
  toast.dismiss()
  // La sesión simulada es global: se reinicia para que no pase de un test a otro.
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})
