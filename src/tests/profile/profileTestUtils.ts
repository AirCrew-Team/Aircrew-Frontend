import { screen, waitFor, within } from "@testing-library/react"
import { expect } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast, queryToast } from "../utils/toasts"

// Ruta fijada por el contrato de la spec configuracion-perfil (PATHS.configuracion).
// Se usa el literal para que, en rojo, los tests lleguen a la 404 y no a una ruta indefinida.
export const CONFIGURACION_PATH = "/configuracion"

export const NON_CREW_ROLES = [ROLES.SUPER_VISOR, ROLES.SUPER_ADMIN] as const

// Último h2 del formulario de cada rol: sirve de ancla de "ya cargó".
export const SECURITY_HEADING: Record<Role, string> = {
  [ROLES.TRIPULANTE]: "4. Seguridad y Credenciales",
  [ROLES.SUPER_VISOR]: "2. Seguridad y Credenciales",
  [ROLES.SUPER_ADMIN]: "2. Seguridad y Credenciales",
}

export const FIELD = {
  phone: "Celular de Emergencias / Guardias",
  email: "Correo Corporativo (Solo Lectura)",
  zone: "Zona de Residencia Registrada",
} as const

export const SWITCH = {
  urgent: "Alertas de Reemplazo Urgente",
  gates: "Cambios de Puerta o Itinerario",
  certifications: "Recordatorio de Vencimiento de Certificaciones",
} as const

export const SUCCESS_TITLE = "Perfil actualizado con éxito"
export const SUCCESS_DETAIL =
  "Los datos operativos y preferencias han sido transmitidos a OCC."

export const renderConfiguracion = (role: Role) => {
  useAuthStore.getState().setMockRole(role)
  return renderRoute(CONFIGURACION_PATH)
}

const statusesStartingWith = (container: HTMLElement, prefix: RegExp) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => prefix.test(element.textContent?.trim() ?? ""))

export const loadingStatuses = (container: HTMLElement) =>
  statusesStartingWith(container, /^cargando/i)

export const alertsWithText = (container: HTMLElement, text: string) =>
  within(container)
    .queryAllByRole("alert")
    .filter((element) => element.textContent?.trim() === text)

// Espera a que la página termine de cargar: el formulario está montado y nada sigue "Cargando…".
export const findLoadedMain = async (role: Role) => {
  const main = await screen.findByRole("main")
  await within(main).findByRole("heading", {
    level: 2,
    name: SECURITY_HEADING[role],
  })
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return main
}

// SN-01: la confirmación de guardado es un toast de sonner, no un role=status del formulario.
export const querySuccessToast = () => queryToast(SUCCESS_TITLE)

export const findSuccessToast = () => findToast(SUCCESS_TITLE)

// Los role=status de `container` que contienen el título de la confirmación (SN-01: ninguno).
export const successStatusesIn = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => element.textContent?.includes(SUCCESS_TITLE))

// Valor (dd) de un par etiqueta–valor (dt) de solo lectura.
export const getDefinitionFor = (container: HTMLElement, term: string) => {
  const dt = within(container).getByText(term, { selector: "dt" })
  const dd = dt.nextElementSibling
  expect(dd?.tagName, `«${term}» debe ir seguido de un <dd>`).toBe("DD")
  return dd as HTMLElement
}
