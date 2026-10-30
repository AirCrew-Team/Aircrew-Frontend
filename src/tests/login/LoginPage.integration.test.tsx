import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import {
  ROLE_LABELS,
  type Role as LoginRole,
  type Session,
} from "@/modules/login/types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec login-integracion. Los tests no tocan el store: cada uno empieza con el estado
// inicial (setup.ts lo reinicia con getInitialState()). renderRoute monta el Toaster,
// pero el toast de bienvenida sigue siendo una comprobación manual de la spec.
// authService simula 350 ms de latencia con timers reales, por eso se espera con findBy/waitFor.

const DEMO_PASSWORD = "1234567"

// Margen para las esperas posteriores a la latencia de authService (350 ms) con la suite en paralelo.
const AFTER_LOGIN_WAIT = { timeout: 2000 }

const waitForPath = (router: ReturnType<typeof renderRoute>, path: string) =>
  waitFor(
    () => expect(router.state.location.pathname).toBe(path),
    AFTER_LOGIN_WAIT
  )

type UserEventInstance = ReturnType<typeof userEvent.setup>

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

const logoutFromProfileMenu = async (user: UserEventInstance) => {
  await user.click(
    await screen.findByRole("button", { name: /menú de perfil/i })
  )
  await user.click(
    await screen.findByRole("menuitem", { name: "Cerrar sesión" })
  )
}

const DEMO_ACCOUNTS: {
  criterion: string
  email: string
  role: Role
  home: string
}[] = [
  {
    criterion: "LG-02",
    email: "tripulante@gmail.com",
    role: ROLES.TRIPULANTE,
    home: PATHS.tripulante.inicio,
  },
  {
    criterion: "LG-03",
    email: "supervisor@gmail.com",
    role: ROLES.SUPER_VISOR,
    home: PATHS.superVisor.inicio,
  },
  {
    criterion: "LG-04",
    email: "admin@gmail.com",
    role: ROLES.SUPER_ADMIN,
    home: PATHS.superAdmin.inicio,
  },
]

describe("LG-01: sin sesión inicial", () => {
  it("LG-01: el estado inicial del store tiene user === null", () => {
    expect(useAuthStore.getInitialState().user).toBeNull()
  })

  it.each([PATHS.root, PATHS.tripulante.inicio])(
    "LG-01: sin tocar el store, %s termina en /login",
    async (path) => {
      const router = renderRoute(path)

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(PATHS.login)
      )
    }
  )
})

describe("LG-02 a LG-04: iniciar sesión con las cuentas demo", () => {
  it.each(DEMO_ACCOUNTS)(
    "$criterion: con $email y la clave demo, se llega a $home (con replace) y el store tiene el rol $role",
    async ({ email, role, home }) => {
      const user = userEvent.setup()
      const router = renderRoute(PATHS.login)

      await loginWith(user, email, DEMO_PASSWORD)

      await waitForPath(router, home)
      expect(router.state.historyAction).toBe("REPLACE")
      expect(useAuthStore.getState().user?.role).toBe(role)
    }
  )

  it("LG-02: tras entrar como tripulante, el navbar muestra «Juan Pablo»", async () => {
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, "tripulante@gmail.com", DEMO_PASSWORD)

    // El <header> del Login también cuenta como banner: se espera antes a salir de /login.
    await waitForPath(router, PATHS.tripulante.inicio)
    const trigger = await screen.findByRole("button", {
      name: "Menú de perfil de Juan Pablo",
    })
    expect(
      trigger.closest("header"),
      "el botón debe estar en el navbar"
    ).not.toBeNull()
    expect(within(trigger).getByText("Juan Pablo")).toBeInTheDocument()
  })
})

describe("LG-09: foco en el contenido tras iniciar sesión", () => {
  it.each(DEMO_ACCOUNTS)(
    "LG-09: tras entrar con $email, el foco termina en el <main id=«contenido»> de $home",
    async ({ email, home }) => {
      const user = userEvent.setup()
      const router = renderRoute(PATHS.login)

      await loginWith(user, email, DEMO_PASSWORD)

      // El Login también tiene un <main>: se espera antes a salir de /login.
      await waitForPath(router, home)
      await waitFor(() => {
        const main = screen.getByRole("main")
        expect(main).toHaveAttribute("id", "contenido")
        expect(main).toHaveFocus()
      })
      // «Termina»: sigue ahí cuando la pantalla de inicio ya pintó su h1.
      const main = screen.getByRole("main")
      await within(main).findAllByRole("heading", { level: 1 })
      expect(main).toHaveFocus()
    }
  )
})

describe("LG-05: credenciales incorrectas", () => {
  it("LG-05: con una contraseña incorrecta, se queda en /login, muestra el alert y el store sigue sin sesión", async () => {
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, "tripulante@gmail.com", "clave-incorrecta")

    expect(
      await screen.findByRole("alert", {}, AFTER_LOGIN_WAIT)
    ).toHaveTextContent("Correo o contraseña incorrectos.")
    expect(router.state.location.pathname).toBe(PATHS.login)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("LG-06: cerrar sesión y entrar con otra cuenta", () => {
  it("LG-06: tras entrar como tripulante y «Cerrar sesión», al entrar como supervisor se llega a /supervisor", async () => {
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await loginWith(user, "tripulante@gmail.com", DEMO_PASSWORD)
    await waitForPath(router, PATHS.tripulante.inicio)

    await logoutFromProfileMenu(user)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
    expect(useAuthStore.getState().user).toBeNull()

    await loginWith(user, "supervisor@gmail.com", DEMO_PASSWORD)

    await waitForPath(router, PATHS.superVisor.inicio)
    expect(useAuthStore.getState().user?.role).toBe(ROLES.SUPER_VISOR)
  })
})

describe("LG-07: un solo juego de roles", () => {
  it("LG-07: ROLES vale exactamente crew, supervisor y admin, con las mismas claves", () => {
    expect(ROLES).toEqual({
      TRIPULANTE: "crew",
      SUPER_VISOR: "supervisor",
      SUPER_ADMIN: "admin",
    })
    expect([...Object.values(ROLES)].sort()).toEqual([
      "admin",
      "crew",
      "supervisor",
    ])
  })

  it("LG-07: Role de la app y Role del Login son el mismo tipo (también lo comprueba pnpm typecheck)", () => {
    // Login → app: Session.role se asigna a Role sin traducción.
    const session: Session = { email: "tripulante@gmail.com", role: "crew" }
    const fromLogin: Role = session.role
    // App → Login: cada valor de ROLES es un Role del Login.
    const toLogin: LoginRole[] = Object.values(ROLES)

    expect(fromLogin).toBe(ROLES.TRIPULANTE)
    expect(toLogin.every((role) => role in ROLE_LABELS)).toBe(true)
  })
})
