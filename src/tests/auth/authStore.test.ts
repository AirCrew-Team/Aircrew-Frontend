import { describe, expect, it } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

// Spec login-real, F8 (tarea 3): el auth store gana `status` y `setUser`.
// setup.ts reinicia el store con getInitialState() después de cada test.

const REAL_USER: AuthUser = {
  id: "u-sup-1",
  displayName: "Sara Gómez",
  fullName: "Sara Gómez Ruiz",
  position: "Supervisor",
  role: ROLES.SUPER_VISOR,
}

describe("F8: estado del auth store", () => {
  it("F8: el estado inicial es { user: null, status: «checking» }", () => {
    const initial = useAuthStore.getInitialState()

    expect(initial.user).toBeNull()
    expect(initial.status).toBe("checking")
    expect(useAuthStore.getState().status).toBe("checking")
  })

  it("F8: setUser(user) guarda ese usuario y deja status «ready»", () => {
    useAuthStore.getState().setUser(REAL_USER)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(REAL_USER)
    expect(state.status).toBe("ready")
  })

  it("F8 (D4): setMockRole(rol) también deja status «ready» con el usuario simulado del rol", () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)

    const state = useAuthStore.getState()
    expect(state.user?.role).toBe(ROLES.SUPER_ADMIN)
    expect(state.status).toBe("ready")
  })

  it("F8: logout() tras setUser deja { user: null, status: «ready» }", () => {
    useAuthStore.getState().setUser(REAL_USER)

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.status).toBe("ready")
  })

  it("F8: logout() mientras se comprueba la sesión (checking) también deja «ready»", () => {
    expect(useAuthStore.getState().status).toBe("checking")

    useAuthStore.getState().logout()

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: "ready",
    })
  })
})
