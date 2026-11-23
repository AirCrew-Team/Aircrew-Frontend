import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { queryClient } from "@/lib/query-client"
import { useAuthStore } from "@/stores/auth.store"

// Spec cierre-tareas-johan, D3: el auth store limpia la caché de TanStack Query al cerrar
// sesión y al pasar a otro usuario, para que nadie vea datos del anterior.
// Se usa el cliente único de la app (`@/lib/query-client`): renderRoute crea el suyo, así
// que nada más en los tests lo toca. setup.ts reinicia el store con setState, sin limpiar.

const USER_A: AuthUser = {
  id: "u-real-a",
  displayName: "Laura Méndez",
  fullName: "Laura Méndez Ríos",
  position: "Primer Oficial",
  role: ROLES.TRIPULANTE,
}

const USER_B: AuthUser = {
  id: "u-real-b",
  displayName: "Mateo Salazar",
  fullName: "Mateo Salazar Gil",
  position: "Supervisor",
  role: ROLES.SUPER_VISOR,
}

const cachedQueries = () => queryClient.getQueryCache().getAll()

const fillCache = () => {
  queryClient.setQueryData(["profile", "me"], { name: "datos del usuario" })
  queryClient.setQueryData(["absences", "list"], [])
  expect(cachedQueries()).toHaveLength(2)
}

beforeEach(() => {
  queryClient.clear()
})

afterEach(() => {
  queryClient.clear()
})

describe("D3: el auth store limpia la caché de datos", () => {
  it("D3: después de logout() la caché queda vacía", () => {
    useAuthStore.getState().setUser(USER_A)
    fillCache()

    useAuthStore.getState().logout()

    expect(cachedQueries()).toEqual([])
  })

  it("D3: setUser de otro usuario vacía la caché", () => {
    useAuthStore.getState().setUser(USER_A)
    fillCache()

    useAuthStore.getState().setUser(USER_B)

    expect(cachedQueries()).toEqual([])
    expect(useAuthStore.getState().user).toEqual(USER_B)
  })

  it("D3: setMockRole de otro rol («Rol (dev)») vacía la caché", () => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    fillCache()

    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)

    expect(cachedQueries()).toEqual([])
  })

  it("D3: pasar de una sesión real a una cuenta demo vacía la caché", () => {
    useAuthStore.getState().setUser(USER_A)
    fillCache()

    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)

    expect(cachedQueries()).toEqual([])
  })

  it("D3: setUser del mismo usuario (otro objeto con el mismo id, como al restaurar la sesión) conserva la caché", () => {
    useAuthStore.getState().setUser(USER_A)
    fillCache()

    useAuthStore.getState().setUser({ ...USER_A, displayName: "Laura" })

    expect(cachedQueries()).toHaveLength(2)
    expect(useAuthStore.getState().user?.displayName).toBe("Laura")
  })

  it("D3: setMockRole del mismo rol conserva la caché", () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    fillCache()

    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)

    expect(cachedQueries()).toHaveLength(2)
  })
})
