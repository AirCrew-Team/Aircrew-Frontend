import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import {
  accountErrorHandler,
  accountHandler,
  crewMemberErrorHandler,
  crewMemberHandler,
  REAL_ACCOUNTS,
  REAL_CREW_MEMBER,
  REAL_USERS,
} from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import {
  CONFIGURACION_PATH,
  getSectionByHeading,
  SECURITY_HEADING,
} from "./profileTestUtils"

// Spec configuracion-sesion-real: con una sesión real (setUser con un id que no es demo)
// /configuracion muestra los datos que ofrece el backend (/auth/me y /crew-members/me) y
// datos de ejemplo en el resto. CR-07 (cuentas demo sin cambios) lo cubren los tests
// existentes de Configuración.

// Rellenan el panel de contraseña con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

const NOTICE =
  "Algunos datos son de ejemplo: el servidor todavía no los ofrece y los cambios no se guardan en el servidor."
const PROFILE_ERROR = "No se pudo cargar el perfil."
const PASSWORD_NOT_CONNECTED =
  "El cambio de contraseña todavía no está conectado al servidor."

const EMAIL_LABEL = /^Correo Corporativo/

const openRealSession = (user: AuthUser) => {
  useAuthStore.getState().setUser(user)
  return renderRoute(CONFIGURACION_PATH)
}

// El correo real llega al campo de solo lectura «Correo Corporativo».
const expectEmail = async (email: string) => {
  const field = await screen.findByLabelText(EMAIL_LABEL)
  await waitFor(() => expect(field).toHaveValue(email))
}

describe("CR-01: tripulante real", () => {
  it("CR-01: muestra su correo, código, cargo, base y estado reales, sin «No se pudo cargar el perfil»", async () => {
    server.use(accountHandler(REAL_ACCOUNTS.crew), crewMemberHandler())

    openRealSession(REAL_USERS.crew)

    await expectEmail(REAL_ACCOUNTS.crew.email)
    // Estado y código, en la tarjeta de identidad: «En servicio • ID: EMP-100».
    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName === "P" &&
          /En servicio\s*•\s*ID:\s*EMP-100/.test(element.textContent ?? "")
      )
    ).toBeInTheDocument()
    // Cargo oficial (campo de solo lectura de la sección 2).
    expect(screen.getByLabelText("Cargo Oficial / Escalafón")).toHaveValue(
      REAL_CREW_MEMBER.position
    )
    // Base: el texto de la base contiene el código de la ubicación (campo y lista rápida).
    expect(
      (screen.getByLabelText("Base Principal") as HTMLInputElement).value
    ).toContain("MDE")
    const baseTerm = screen.getByText("Base Principal", { selector: "dt" })
    expect(baseTerm.nextElementSibling).toHaveTextContent(/MDE/)
    expect(screen.queryByText(PROFILE_ERROR)).not.toBeInTheDocument()
  })
})

describe("CR-02: supervisor real", () => {
  it("CR-02: carga con su correo real y los datos de ejemplo del supervisor", async () => {
    server.use(accountHandler(REAL_ACCOUNTS.supervisor))

    openRealSession(REAL_USERS.supervisor)

    await expectEmail(REAL_ACCOUNTS.supervisor.email)
    // Datos de ejemplo del supervisor: su código de empleado de la plantilla.
    expect(await screen.findByText(/ID:\s*AC-0412/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Guardar Cambios" })
    ).toBeInTheDocument()
    expect(screen.queryByText(PROFILE_ERROR)).not.toBeInTheDocument()
  })
})

describe("CR-03: admin real", () => {
  it("CR-03: la pantalla del operador carga con su nombre y su correo reales", async () => {
    server.use(accountHandler(REAL_ACCOUNTS.admin))

    openRealSession(REAL_USERS.admin)

    const name = await screen.findByLabelText(/^Nombre Completo/)
    await waitFor(() => expect(name).toHaveValue(REAL_ACCOUNTS.admin.name))
    expect(screen.getByLabelText(EMAIL_LABEL)).toHaveValue(
      REAL_ACCOUNTS.admin.email
    )
    expect(
      screen.getByRole("button", { name: "Guardar Cambios" })
    ).toBeInTheDocument()
    expect(screen.queryByText(PROFILE_ERROR)).not.toBeInTheDocument()
  })
})

describe("CR-04: aviso de datos de ejemplo", () => {
  it.each([
    ["tripulante", REAL_USERS.crew, REAL_ACCOUNTS.crew],
    ["supervisor", REAL_USERS.supervisor, REAL_ACCOUNTS.supervisor],
    ["admin", REAL_USERS.admin, REAL_ACCOUNTS.admin],
  ] as const)(
    "CR-04: con un %s de sesión real se ve el aviso",
    async (_label, user, account) => {
      server.use(accountHandler(account), crewMemberHandler())

      openRealSession(user)

      expect(await screen.findByText(NOTICE)).toBeInTheDocument()
      // No es una región viva: no se anuncia solo.
      expect(screen.getByText(NOTICE).closest("[role]")).toBeNull()
    }
  )

  it("CR-04: con una cuenta demo no se ve el aviso", async () => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)

    renderRoute(CONFIGURACION_PATH)

    // La pantalla ya cargó (formulario montado) y el aviso no está.
    await screen.findByRole("button", { name: "Guardar Cambios" })
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })
})

describe("CR-05: fallos del servidor", () => {
  it("CR-05: si /auth/me responde 500, se ve «No se pudo cargar el perfil.»", async () => {
    server.use(accountErrorHandler(), crewMemberHandler())

    openRealSession(REAL_USERS.crew)

    expect(await screen.findByText(PROFILE_ERROR)).toHaveAttribute(
      "role",
      "alert"
    )
    expect(
      screen.queryByRole("button", { name: "Guardar Cambios" })
    ).not.toBeInTheDocument()
  })

  it("CR-05: si solo falla /crew-members/me, el tripulante ve su correo real y no el error de perfil", async () => {
    server.use(accountHandler(REAL_ACCOUNTS.crew), crewMemberErrorHandler())

    openRealSession(REAL_USERS.crew)

    await expectEmail(REAL_ACCOUNTS.crew.email)
    expect(screen.queryByText(PROFILE_ERROR)).not.toBeInTheDocument()
  })
})

describe("CR-06: cambio de contraseña con sesión real", () => {
  it("CR-06: enviar el cambio muestra que todavía no está conectado al servidor", async () => {
    server.use(accountHandler(REAL_ACCOUNTS.crew), crewMemberHandler())
    const user = userEvent.setup()
    openRealSession(REAL_USERS.crew)
    await expectEmail(REAL_ACCOUNTS.crew.email)
    const security = getSectionByHeading(
      await screen.findByRole("main"),
      SECURITY_HEADING
    )

    await user.click(
      within(security).getByRole("button", { name: "Cambiar contraseña" })
    )
    const panel = within(
      await within(security).findByRole("group", { name: "Cambiar contraseña" })
    )
    await user.type(panel.getByLabelText("Contraseña Actual"), "ClaveActual1!")
    await user.type(panel.getByLabelText("Nueva Contraseña"), "Nueva2026!x")
    await user.type(panel.getByLabelText("Confirmar Contraseña"), "Nueva2026!x")
    await user.click(
      panel.getByRole("button", { name: "Actualizar contraseña" })
    )

    expect(await panel.findByText(PASSWORD_NOT_CONNECTED)).toBeInTheDocument()
  })
})
