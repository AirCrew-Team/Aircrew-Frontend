import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { toast } from "sonner"
import { afterAll, afterEach, beforeAll } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import { server } from "./utils/server"

// Las rutas lazy (Configuración, Reportar Ausencia) transforman su chunk en frío la
// primera vez: con la máquina cargada, 1 s por defecto no siempre basta y el test falla
// de forma intermitente. Solo amplía la espera máxima de findBy/waitFor.
configure({ asyncUtilTimeout: 3000 })

// jsdom no implementa showModal/close de <dialog>, que usa src/components/custom/Dialog.tsx
// (p. ej. la recuperación que abre el Login al tercer intento fallido).
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
}

// MSW simula el backend. Una petición sin handler es un error: así ningún test llama a
// la red real y LR-05 detecta si una cuenta demo llama al backend.
// MSW 3 llama a esta opción onUnhandledFrame (en MSW 2 era onUnhandledRequest).
beforeAll(() => server.listen({ onUnhandledFrame: "error" }))

afterEach(() => {
  cleanup()
  // Sonner guarda los toasts en un estado global y el Toaster del test siguiente
  // repite los que siguen activos. Se descartan después de desmontar (sin suscriptores
  // no hay renders fuera de act).
  toast.dismiss()
  // La sesión simulada es global: se reinicia para que no pase de un test a otro.
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  // Quita los handlers que añadió el test con server.use(...).
  server.resetHandlers()
})

afterAll(() => server.close())
