import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  API_USERS,
  AUTH_URLS,
  CREW_PROFILE,
  errorBody,
  loginBody,
  type ApiUser,
} from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast, queryAllToasts } from "../utils/toasts"

// Spec login-real, tarea 5 (F4, F5b): el formulario de Login contra el backend real
// (simulado con MSW). Las cuentas demo siguen sin llamar al backend (D4).

const REAL_PASSWORD = "clave-real-123"
const DEMO_PASSWORD = "1234567"

const TEXTS = {
  invalid: "Correo o contraseña incorrectos.",
  locked:
    "Se alcanzó el límite de intentos. Recupera tu contraseña para continuar.",
  network: "No pudimos conectar con el servidor. Intenta de nuevo.",
  unknownRole:
    "Tu cuenta tiene un rol que AirCrew no reconoce. Contacta al administrador.",
  expired: "Tu sesión venció. Inicia sesión de nuevo.",
}

// Margen para las esperas tras el clic (las cuentas demo tardan 350 ms simulados).
const AFTER_LOGIN_WAIT = { timeout: 2000 }

type UserEventInstance = ReturnType<typeof userEvent.setup>

const waitForPath = (router: ReturnType<typeof renderRoute>, path: string) =>
  waitFor(
    () => expect(router.state.location.pathname).toBe(path),
    AFTER_LOGIN_WAIT
  )

const loginWith = async (
  user: UserEventInstance,
  email: string,
  password: string
) => {
  await user.type(await screen.findByRole("textbox", { name: "Correo" }), email)
  // El botón «Mostrar contraseña» también menciona la contraseña: se acota al input.
  await user.type(
    screen.getByLabelText("Contraseña", { selector: "input" }),
    password
  )
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }))
}

// Reenvía el formulario con los mismos datos cuando terminó el envío anterior.
const submitAgain = async (user: UserEventInstance) => {
  const button = await screen.findByRole("button", { name: "Iniciar sesión" })
  await waitFor(() => expect(button).toBeEnabled())
  await user.click(button)
}

// Texto exacto del alert del formulario.
const findFormAlert = async () =>
  (await screen.findByRole("alert", {}, AFTER_LOGIN_WAIT)).textContent?.trim()

// POST /auth/login responde en orden con cada respuesta de la lista y cuenta las llamadas.
const mockLoginSequence = (responses: Array<() => Response>) => {
  let calls = 0
  server.use(
    http.post(AUTH_URLS.login, () => {
      const respond = responses[Math.min(calls, responses.length - 1)]
      calls += 1
      return respond()
    })
  )
  return () => calls
}

const loginOk = (user: ApiUser) => () => HttpResponse.json(loginBody(user))
const status = (code: number) => () =>
  HttpResponse.json(errorBody(`Error ${code}`), { status: code })

const mockCrewProfile = (respond: () => Response) =>
  server.use(http.get(AUTH_URLS.crewProfile, respond))

// El trigger del menú de perfil del navbar («Menú de perfil de {displayName} {position}»).
const findNavbarProfile = async (name: string) => {
  const trigger = await screen.findByRole(
    "button",
    { name: `Menú de perfil de ${name}` },
    AFTER_LOGIN_WAIT
  )
  expect(trigger.closest("header"), "debe estar en el navbar").not.toBeNull()
  return trigger
}

describe("LR-01: credenciales reales correctas", () => {
  it("LR-01 (punto de vigilancia 1): super_admin «Admin Real» entra a /admin con su nombre en el navbar, el toast de bienvenida y el foco en main", async () => {
    mockLoginSequence([loginOk(API_USERS.superAdmin)])
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, API_USERS.superAdmin.email, REAL_PASSWORD)

    await waitForPath(router, PATHS.superAdmin.inicio)
    const trigger = await findNavbarProfile("Admin Real Super Administrador")
    expect(within(trigger).getByText("Admin Real")).toBeInTheDocument()
    expect(useAuthStore.getState().user).toMatchObject({
      id: API_USERS.superAdmin.id,
      fullName: "Admin Real",
      role: ROLES.SUPER_ADMIN,
    })
    await findToast("Bienvenido a AirCrew, Administrador.")

    // Una sola navegación, el <Navigate replace state={{ focusMain: true }}> reactivo
    // de LoginPage: el foco tiene que terminar en el <main id="contenido"> del inicio.
    await waitFor(() => {
      const main = screen.getByRole("main")
      expect(main).toHaveAttribute("id", "contenido")
      expect(main).toHaveFocus()
    })
    const main = screen.getByRole("main")
    await within(main).findAllByRole("heading", { level: 1 })
    expect(main).toHaveFocus()
  })

  it("LR-01: supervisor «Sara Gómez Ruiz» entra a /supervisor con «Sara Gómez» y el cargo «Supervisor»", async () => {
    mockLoginSequence([loginOk(API_USERS.supervisor)])
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, API_USERS.supervisor.email, REAL_PASSWORD)

    await waitForPath(router, PATHS.superVisor.inicio)
    await findNavbarProfile("Sara Gómez Supervisor")
    expect(useAuthStore.getState().user?.role).toBe(ROLES.SUPER_VISOR)
  })

  it("LR-01: crew con perfil entra a /tripulante con el cargo «Capitán #EMP-001» que sale de crew", async () => {
    mockLoginSequence([loginOk(API_USERS.crew)])
    mockCrewProfile(() => HttpResponse.json(CREW_PROFILE))
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, API_USERS.crew.email, REAL_PASSWORD)

    await waitForPath(router, PATHS.tripulante.inicio)
    await findNavbarProfile("Luis Pérez Capitán #EMP-001")
    expect(useAuthStore.getState().user?.role).toBe(ROLES.TRIPULANTE)
  })

  // Spec cierre-pendientes, D12: antes LR-11 fijaba que el 401 de crew-members/me NO
  // cerraba la sesión (el tripulante seguía en el Inicio con el error del bloque). Se
  // quita esa exclusión: durante el login (sin sesión en el store) el 401 solo deja el
  // cargo «Tripulante», pero el mismo 401 en el Inicio, ya con sesión, la cierra.
  it("FE1-F2 (D12, antes LR-11): si el perfil de crew responde 401, el login entra a /tripulante y el 401 del Inicio cierra la sesión: termina en /login con un único toast «Tu sesión venció. Inicia sesión de nuevo.»", async () => {
    mockLoginSequence([loginOk(API_USERS.crew)])
    // 401 persistente: lo recibe el login (sin sesión) y la petición del Inicio real.
    let crewProfileCalls = 0
    server.use(
      http.get(AUTH_URLS.crewProfile, () => {
        crewProfileCalls += 1
        return status(401)()
      })
    )
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)
    // El paso por /tripulante es transitorio: se registra en lugar de esperarlo.
    const visited: string[] = []
    router.subscribe((state) => visited.push(state.location.pathname))

    await loginWith(user, API_USERS.crew.email, REAL_PASSWORD)

    // Ancla: el login y el Inicio pidieron el perfil (si no, el cierre no se probaría).
    await waitFor(
      () => expect(crewProfileCalls).toBeGreaterThanOrEqual(2),
      AFTER_LOGIN_WAIT
    )
    expect(visited, "el login llegó a entrar").toContain(
      PATHS.tripulante.inicio
    )
    await waitForPath(router, PATHS.login)
    const toast = await findToast(TEXTS.expired)
    expect(toast).toHaveAttribute("data-type", "error")
    expect(useAuthStore.getState().user).toBeNull()
    // Margen para una ráfaga de 401: sigue habiendo un solo aviso de sesión vencida.
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(
      queryAllToasts().filter(
        (item) =>
          item.querySelector("[data-title]")?.textContent?.trim() ===
          TEXTS.expired
      ),
      "un solo toast de sesión vencida"
    ).toHaveLength(1)
    expect(router.state.location.pathname).toBe(PATHS.login)
  })
})

describe("LR-03: credenciales incorrectas (401)", () => {
  it("LR-03: un 401 muestra el error de credenciales y al tercero se bloquea", async () => {
    const calls = mockLoginSequence([status(401)])
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, "nadie@aircrew.com", REAL_PASSWORD)
    expect(await findFormAlert()).toBe(TEXTS.invalid)
    expect(calls()).toBe(1)

    await submitAgain(user)
    await waitFor(() => expect(calls()).toBe(2))
    await submitAgain(user)

    // Al tercero se abre la recuperación (diálogo modal): el texto puede quedar fuera
    // del árbol accesible, por eso se busca por texto y no por role.
    expect(
      await screen.findByText(TEXTS.locked, {}, AFTER_LOGIN_WAIT)
    ).toBeInTheDocument()
    expect(calls()).toBe(3)
    expect(router.state.location.pathname).toBe(PATHS.login)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("LR-04: error de red o 5xx en el login", () => {
  it.each([
    { label: "500", respond: status(500) },
    { label: "error de red", respond: () => HttpResponse.error() },
  ])(
    "LR-04: con $label se muestra «No pudimos conectar con el servidor. Intenta de nuevo.»",
    async ({ respond }) => {
      mockLoginSequence([respond])
      const user = userEvent.setup()
      const router = renderRoute(PATHS.login)

      await loginWith(user, "nadie@aircrew.com", REAL_PASSWORD)

      expect(await findFormAlert()).toBe(TEXTS.network)
      expect(router.state.location.pathname).toBe(PATHS.login)
      expect(useAuthStore.getState().user).toBeNull()
    }
  )

  it("LR-04: 500 y error de red no suman intento (un tercer intento con 401 no bloquea)", async () => {
    const calls = mockLoginSequence([
      status(500),
      () => HttpResponse.error(),
      status(401),
    ])
    const user = userEvent.setup()
    renderRoute(PATHS.login)

    await loginWith(user, "nadie@aircrew.com", REAL_PASSWORD)
    expect(await findFormAlert()).toBe(TEXTS.network)
    await submitAgain(user)
    await waitFor(() => expect(calls()).toBe(2))
    await submitAgain(user)
    await waitFor(() => expect(calls()).toBe(3))

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(TEXTS.invalid)
    )
    expect(screen.queryByText(TEXTS.locked)).toBeNull()
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled()
  })
})

describe("LR-02: rol desconocido", () => {
  it("LR-02: si el backend devuelve el rol «pilot», se muestra el error y sigue en /login sin sesión", async () => {
    mockLoginSequence([loginOk({ ...API_USERS.supervisor, role: "pilot" })])
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, API_USERS.supervisor.email, REAL_PASSWORD)

    expect(await findFormAlert()).toBe(TEXTS.unknownRole)
    expect(router.state.location.pathname).toBe(PATHS.login)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("LR-02: con el rol «pilot» el frontend cierra la cookie que puso el backend (POST /auth/logout exactamente 1 vez)", async () => {
    mockLoginSequence([loginOk({ ...API_USERS.supervisor, role: "pilot" })])
    let logoutCalls = 0
    server.use(
      http.post(AUTH_URLS.logout, () => {
        logoutCalls += 1
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()
    renderRoute(PATHS.login)

    await loginWith(user, API_USERS.supervisor.email, REAL_PASSWORD)

    expect(await findFormAlert()).toBe(TEXTS.unknownRole)
    await waitFor(() => expect(logoutCalls).toBe(1))
    // Margen para detectar una segunda llamada tardía.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(logoutCalls).toBe(1)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("LR-05: las cuentas demo no llaman al backend", () => {
  it.each([
    { email: "admin@gmail.com", home: PATHS.superAdmin.inicio },
    { email: "supervisor@gmail.com", home: PATHS.superVisor.inicio },
    { email: "tripulante@gmail.com", home: PATHS.tripulante.inicio },
  ])(
    "LR-05: $email con la clave demo entra a $home y POST /auth/login no se llama",
    async ({ email, home }) => {
      const calls = mockLoginSequence([status(500)])
      const user = userEvent.setup()
      const router = renderRoute(PATHS.login)

      await loginWith(user, email, DEMO_PASSWORD)

      await waitForPath(router, home)
      expect(calls()).toBe(0)
    }
  )
})

describe("LR-07b: /login con una sesión confirmada", () => {
  const REAL_USERS: Record<Role, AuthUser> = {
    [ROLES.SUPER_ADMIN]: {
      id: API_USERS.superAdmin.id,
      displayName: "Admin Real",
      fullName: "Admin Real",
      position: "Super Administrador",
      role: ROLES.SUPER_ADMIN,
    },
    [ROLES.SUPER_VISOR]: {
      id: API_USERS.supervisor.id,
      displayName: "Sara Gómez",
      fullName: "Sara Gómez Ruiz",
      position: "Supervisor",
      role: ROLES.SUPER_VISOR,
    },
    [ROLES.TRIPULANTE]: {
      id: API_USERS.crew.id,
      displayName: "Luis Pérez",
      fullName: "Luis Pérez Mora",
      position: "Capitán #EMP-001",
      role: ROLES.TRIPULANTE,
    },
  }

  it.each(Object.values(ROLES))(
    "LR-07b: con setUser de un %s, entrar a /login termina en el inicio del rol",
    async (role) => {
      // Spec ausencias-reales: el Inicio real del tripulante pide crew-members/me.
      mockCrewProfile(() => HttpResponse.json(CREW_PROFILE))
      useAuthStore.getState().setUser(REAL_USERS[role])

      const router = renderRoute(PATHS.login)

      await waitForPath(router, HOME_PATH_BY_ROLE[role])
    }
  )
})
