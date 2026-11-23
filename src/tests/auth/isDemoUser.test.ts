import { describe, expect, it } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Contrato compartido de la spec ausencias-reales: distingue la sesión demo de la real.
describe("isDemoUser", () => {
  it("es true para los usuarios simulados de cada rol", () => {
    for (const role of Object.values(ROLES)) {
      useAuthStore.getState().setMockRole(role)
      expect(isDemoUser(useAuthStore.getState().user)).toBe(true)
    }
  })

  it("es false para un usuario real y sin sesión", () => {
    const real: AuthUser = {
      id: "u-real-1",
      displayName: "Ana",
      fullName: "Ana Torres",
      position: "Tripulante",
      role: ROLES.TRIPULANTE,
    }
    expect(isDemoUser(real)).toBe(false)
    expect(isDemoUser(null)).toBe(false)
  })
})
