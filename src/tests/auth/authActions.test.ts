import { createElement } from "react"
import { render, waitFor } from "@testing-library/react"
import { isAxiosError } from "axios"
import { http, HttpResponse } from "msw"
import { Toaster } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getCurrentUser,
  getMyCrewProfile,
  login,
  logout,
  toAuthUser,
  UnknownRoleError,
} from "@/App/actions/auth/auth.actions"
import { ROLES } from "@/App/types/auth.types"
import apiClient from "@/service/api-client"
import { useAuthStore } from "@/stores/auth.store"

import {
  API_URL,
  API_USERS,
  AUTH_URLS,
  CREW_PROFILE,
  errorBody,
  FAKE_TOKEN,
  loginBody,
  meBody,
  type ApiUser,
} from "../mocks/authApi"
import { queryAllToasts, queryToast } from "../utils/toasts"
import { server } from "../utils/server"

// Spec login-real, tarea 4 (F1, F2, F3, F6): acciones de auth, traducción del rol,
// AuthUser e interceptor de 401. El backend se simula con MSW (src/tests/utils/server.ts).

const EXPIRED_TEXT = "Tu sesión venció. Inicia sesión de nuevo."

// Cuenta las peticiones al perfil de crew y responde con `respond`.
const mockCrewProfile = (
  respond: () => Response = () => HttpResponse.json(CREW_PROFILE)
) => {
  const calls: Request[] = []
  server.use(
    http.get(AUTH_URLS.crewProfile, ({ request }) => {
      calls.push(request)
      return respond()
    })
  )
  return calls
}

const mockLoginResponse = (user: ApiUser) => {
  const bodies: unknown[] = []
  server.use(
    http.post(AUTH_URLS.login, async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(loginBody(user))
    })
  )
  return bodies
}

// Toaster de sonner sin el envoltorio de la app (ese necesita ThemeProvider).
const mountToaster = () => render(createElement(Toaster))

// Deja pasar un ciclo para que sonner pinte un toast emitido justo antes.
const flush = () => new Promise((resolve) => setTimeout(resolve, 50))

describe("F2 y LR-02: traducción del rol del backend", () => {
  it.each([
    {
      apiRole: "super_admin",
      role: ROLES.SUPER_ADMIN,
      user: API_USERS.superAdmin,
    },
    {
      apiRole: "supervisor",
      role: ROLES.SUPER_VISOR,
      user: API_USERS.supervisor,
    },
    { apiRole: "crew", role: ROLES.TRIPULANTE, user: API_USERS.crew },
  ])(
    "F2: toAuthUser traduce el rol $apiRole a «$role»",
    async ({ user, role }) => {
      mockCrewProfile()

      const authUser = await toAuthUser(user)

      expect(authUser.role).toBe(role)
      expect(authUser.id).toBe(user.id)
    }
  )

  it("LR-02: toAuthUser con el rol «pilot» lanza UnknownRoleError", async () => {
    mockCrewProfile()

    await expect(
      toAuthUser({ ...API_USERS.supervisor, role: "pilot" })
    ).rejects.toBeInstanceOf(UnknownRoleError)
  })

  it("LR-02: login() con un usuario de rol «pilot» lanza UnknownRoleError (sin sesión)", async () => {
    mockCrewProfile()
    mockLoginResponse({ ...API_USERS.supervisor, role: "pilot" })

    await expect(
      login(API_USERS.supervisor.email, "clave-real")
    ).rejects.toBeInstanceOf(UnknownRoleError)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("F1: login(), getCurrentUser() y logout() llaman al backend", () => {
  it("F1 (LR-01): login() envía { email, password } a POST /api/admin/auth/login y devuelve el AuthUser", async () => {
    const bodies = mockLoginResponse(API_USERS.superAdmin)

    const authUser = await login(API_USERS.superAdmin.email, "clave-real")

    expect(bodies).toEqual([
      { email: API_USERS.superAdmin.email, password: "clave-real" },
    ])
    expect(authUser).toEqual({
      id: API_USERS.superAdmin.id,
      displayName: "Admin Real",
      fullName: "Admin Real",
      position: "Super Administrador",
      role: ROLES.SUPER_ADMIN,
    })
  })

  it("F1 (LR-03): login() con un 401 relanza el AxiosError con status 401", async () => {
    server.use(
      http.post(AUTH_URLS.login, () =>
        HttpResponse.json(errorBody("Credenciales inválidas"), { status: 401 })
      )
    )

    const error = await login("nadie@aircrew.com", "mala").catch(
      (reason: unknown) => reason
    )

    expect(isAxiosError(error), "debe relanzar el error de Axios").toBe(true)
    expect(isAxiosError(error) && error.response?.status).toBe(401)
  })

  it("F1 (LR-06): getCurrentUser() pide GET /api/admin/auth/me y devuelve el AuthUser", async () => {
    server.use(
      http.get(AUTH_URLS.me, () =>
        HttpResponse.json(meBody(API_USERS.supervisor))
      )
    )

    await expect(getCurrentUser()).resolves.toEqual({
      id: API_USERS.supervisor.id,
      displayName: "Sara Gómez",
      fullName: "Sara Gómez Ruiz",
      position: "Supervisor",
      role: ROLES.SUPER_VISOR,
    })
  })

  it("F1 (LR-07): getCurrentUser() rechaza si /auth/me responde 401", async () => {
    await expect(getCurrentUser()).rejects.toBeDefined()
  })

  it("F1 (LR-09): logout() hace POST /api/admin/auth/logout", async () => {
    let calls = 0
    server.use(
      http.post(AUTH_URLS.logout, () => {
        calls += 1
        return new HttpResponse(null, { status: 204 })
      })
    )

    await expect(logout()).resolves.toBeUndefined()
    expect(calls).toBe(1)
  })

  it("F1: getMyCrewProfile() pide GET /api/crew/crew-members/me y devuelve position y employee_code", async () => {
    const calls = mockCrewProfile()

    const profile = await getMyCrewProfile()

    expect(calls).toHaveLength(1)
    expect(profile).toMatchObject({
      position: "Capitán",
      employee_code: "EMP-001",
    })
  })
})

describe("F3: del usuario del backend a AuthUser", () => {
  it("F3 (punto de vigilancia 4): «  Ana   María  López » → displayName «Ana María» y fullName «Ana María López»", async () => {
    const authUser = await toAuthUser({
      id: "u-9",
      name: "  Ana   María  López ",
      role: "supervisor",
    })

    expect(authUser.displayName).toBe("Ana María")
    expect(authUser.fullName).toBe("Ana María López")
  })

  it("F3 (punto de vigilancia 4): un nombre de una sola palabra «Cher» → displayName «Cher»", async () => {
    const authUser = await toAuthUser({
      id: "u-10",
      name: "Cher",
      role: "supervisor",
    })

    expect(authUser.displayName).toBe("Cher")
    expect(authUser.fullName).toBe("Cher")
  })

  it("F3 (LR-01): crew con perfil { Capitán, EMP-001 } → position «Capitán #EMP-001»", async () => {
    const calls = mockCrewProfile()

    const authUser = await toAuthUser(API_USERS.crew)

    expect(calls).toHaveLength(1)
    expect(authUser.position).toBe("Capitán #EMP-001")
  })

  it.each([
    { status: 500, label: "500" },
    { status: 401, label: "401" },
  ])(
    "F3 (LR-11): si el perfil de crew responde $label, position «Tripulante» y sin toast",
    async ({ status }) => {
      mountToaster()
      mockCrewProfile(() =>
        HttpResponse.json(errorBody("Fallo del perfil"), { status })
      )

      const authUser = await toAuthUser(API_USERS.crew)
      await flush()

      expect(authUser.role).toBe(ROLES.TRIPULANTE)
      expect(authUser.position).toBe("Tripulante")
      expect(queryAllToasts(), "no debe salir ningún toast").toHaveLength(0)
    }
  )

  it.each([
    { user: API_USERS.supervisor, position: "Supervisor" },
    { user: API_USERS.superAdmin, position: "Super Administrador" },
  ])(
    "F3: $user.role → position «$position» sin pedir el perfil de crew",
    async ({ user, position }) => {
      const calls = mockCrewProfile()

      const authUser = await toAuthUser(user)

      expect(authUser.position).toBe(position)
      expect(calls).toHaveLength(0)
    }
  )
})

describe("F6 y LR-08: interceptor de 401 de apiClient", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_URL}/api/crew/x`, () =>
        HttpResponse.json(errorBody("Token vencido"), { status: 401 })
      )
    )
  })

  it("LR-08 (punto de vigilancia 3): sin usuario un 401 no da toast; con usuario, tres 401 en paralelo cierran la sesión con un solo toast", async () => {
    mountToaster()

    // Sin sesión en el store: el 401 se relanza y no hay toast.
    const alone = await apiClient.get("/api/crew/x").catch((e: unknown) => e)
    expect(isAxiosError(alone) && alone.response?.status).toBe(401)
    await flush()
    expect(queryAllToasts(), "sin usuario no hay toast").toHaveLength(0)

    // Con sesión: ráfaga de tres 401.
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    const results = await Promise.allSettled([
      apiClient.get("/api/crew/x"),
      apiClient.get("/api/crew/x"),
      apiClient.get("/api/crew/x"),
    ])

    for (const result of results) {
      expect(result.status, "cada petición se relanza").toBe("rejected")
      const reason = result.status === "rejected" ? result.reason : null
      expect(isAxiosError(reason) && reason.response?.status).toBe(401)
    }
    expect(useAuthStore.getState().user).toBeNull()
    await waitFor(() => expect(queryToast(EXPIRED_TEXT)).not.toBeNull())
    await flush()
    const toasts = queryAllToasts()
    expect(toasts, "un solo toast por ráfaga").toHaveLength(1)
    expect(toasts[0]).toHaveAttribute("data-type", "error")
  })

  it("F6: un 401 de /api/admin/auth/me con usuario en el store no cierra la sesión ni da toast", async () => {
    mountToaster()
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)

    await expect(getCurrentUser()).rejects.toBeDefined()
    await flush()

    expect(useAuthStore.getState().user?.role).toBe(ROLES.SUPER_VISOR)
    expect(queryAllToasts()).toHaveLength(0)
  })
})

describe("LR-10: el token nunca se guarda en el navegador", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = "sonda=; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  })

  it("LR-10: tras login() ni localStorage, ni sessionStorage, ni document.cookie reciben el token", async () => {
    // Storage.prototype cubre localStorage y sessionStorage (en jsdom, definir setItem
    // en la instancia lo guardaría como un ítem).
    const storageSpy = vi.spyOn(Storage.prototype, "setItem")
    const cookieSpy = vi.spyOn(document, "cookie", "set")

    // Sonda: los espías sí ven las escrituras (si no, el test pasaría en falso).
    localStorage.setItem("sonda", "1")
    sessionStorage.setItem("sonda", "1")
    document.cookie = "sonda=1"
    expect(storageSpy).toHaveBeenCalledTimes(2)
    expect(cookieSpy).toHaveBeenCalledWith("sonda=1")
    storageSpy.mockClear()
    cookieSpy.mockClear()

    mockLoginResponse(API_USERS.superAdmin)
    const authUser = await login(API_USERS.superAdmin.email, "clave-real")

    expect(authUser.role).toBe(ROLES.SUPER_ADMIN)
    const written = [
      ...storageSpy.mock.calls.flat(),
      ...cookieSpy.mock.calls.flat(),
    ].map(String)
    expect(written.some((value) => value.includes(FAKE_TOKEN))).toBe(false)
    expect(document.cookie).not.toContain(FAKE_TOKEN)
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i) ?? ""
        expect(storage.getItem(key) ?? "").not.toContain(FAKE_TOKEN)
      }
    }
    // Tampoco viaja en el AuthUser que devuelve la acción.
    expect(JSON.stringify(authUser)).not.toContain(FAKE_TOKEN)
  })
})
