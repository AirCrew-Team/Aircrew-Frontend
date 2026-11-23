import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  EMPTY_CERTIFICATION,
  mockMyAssignments,
  mockMyCertification,
  mockNextAssignment,
} from "../mocks/crewFlightsApi"
import { crewMemberHandler, REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import {
  type BellItem,
  clickBellItem,
  expectMenuClosed,
  findBellItem,
  mockBell,
  openBell,
  queryBellItem,
  recordLocations,
} from "./notificationsTestUtils"

// Spec docs/specs/notificaciones-navegables.md, parte B, con la campana del tripulante
// (sesión real). Contrato: `assignment:replacement` → /tripulante (Inicio) y
// `certification:registered` / `certification:verified` → /tripulante/certificaciones,
// sin parámetros. Cada aviso con destino es un `menuitem` cuyo nombre contiene el mensaje.

const H1 = {
  inicio: `${REAL_USERS.crew.displayName}, Bienvenido a AirCrew`,
  certificaciones: "Certificaciones y Licencias",
}

const REPLACEMENT: BellItem = {
  id: "n-replacement",
  type: "assignment:replacement",
  message: "Te asignaron como reemplazo en el vuelo DL2201.",
  data: { assignment_id: "as-1", flight_id: "f-2201", flight_number: "DL2201" },
}
const REGISTERED: BellItem = {
  id: "n-registered",
  type: "certification:registered",
  message: "Se registró tu certificado 2775981.",
  data: { certification_id: "cert-1" },
}
const VERIFIED: BellItem = {
  id: "n-verified",
  type: "certification:verified",
  message: "Tu certificado 2775981 fue verificado.",
  data: { certification_id: "cert-1" },
}

// Sesión real del tripulante y lo que piden su Inicio y Certificaciones: sin vuelos, sin
// reemplazos y sin certificación.
const openAs = async (path: string, h1: string, bell: BellItem[]) => {
  server.use(crewMemberHandler())
  mockMyAssignments([])
  mockNextAssignment(null)
  mockMyCertification(EMPTY_CERTIFICATION)
  mockBell(bell)
  useAuthStore.getState().setUser(REAL_USERS.crew)
  const user = userEvent.setup()
  const router = renderRoute(path)
  const visited = recordLocations(router)
  await screen.findByRole("heading", { level: 1, name: h1 })
  return { user, router, visited }
}

describe("NL-04: campana del tripulante", () => {
  it("NL-04: pulsar «assignment:replacement» lleva al Inicio y cierra el menú", async () => {
    const { user, router, visited } = await openAs(
      PATHS.tripulante.certificaciones,
      H1.certificaciones,
      [REPLACEMENT, VERIFIED]
    )

    await clickBellItem(user, REPLACEMENT.message)

    await waitFor(() => expect(visited).toContain(PATHS.tripulante.inicio))
    await expectMenuClosed()
    await screen.findByRole("heading", { level: 1, name: H1.inicio })
    expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
  })

  it.each([
    ["certification:registered", REGISTERED],
    ["certification:verified", VERIFIED],
  ])(
    "NL-04: pulsar «%s» lleva a Certificaciones y cierra el menú",
    async (_type, item) => {
      const { user, router, visited } = await openAs(
        PATHS.tripulante.inicio,
        H1.inicio,
        [REPLACEMENT, item]
      )

      await clickBellItem(user, item.message)

      await waitFor(() =>
        expect(visited).toContain(PATHS.tripulante.certificaciones)
      )
      await expectMenuClosed()
      await screen.findByRole("heading", { level: 1, name: H1.certificaciones })
      expect(router.state.location.pathname).toBe(
        PATHS.tripulante.certificaciones
      )
    }
  )
})

describe("NL-05: tripulante ya en la pantalla de destino", () => {
  it("NL-05: en Certificaciones, pulsar dos veces un aviso de certificación deja la pantalla abierta y cierra el menú cada vez", async () => {
    const { user, router } = await openAs(
      PATHS.tripulante.certificaciones,
      H1.certificaciones,
      [VERIFIED]
    )

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await clickBellItem(user, VERIFIED.message)
      await expectMenuClosed()
      expect(router.state.location.pathname).toBe(
        PATHS.tripulante.certificaciones
      )
      expect(
        screen.getByRole("heading", { level: 1, name: H1.certificaciones })
      ).toBeInTheDocument()
    }
  })
})

describe("NL-06: tripulante, avisos sin destino", () => {
  it("NL-06: un aviso de tipo desconocido se muestra en la campana sin ser un ítem pulsable (y uno conocido sí lo es)", async () => {
    const UNKNOWN: BellItem = {
      id: "n-unknown",
      type: "crew:something_new",
      message: "Aviso de un tipo que la app no conoce.",
      data: { certification_id: "cert-1" },
    }
    const { user } = await openAs(PATHS.tripulante.inicio, H1.inicio, [
      VERIFIED,
      UNKNOWN,
    ])

    const menu = await openBell(user)

    expect(await findBellItem(VERIFIED.message)).toBeInTheDocument()
    expect(within(menu).getByText(UNKNOWN.message)).toBeInTheDocument()
    expect(queryBellItem(UNKNOWN.message)).not.toBeInTheDocument()
  })
})

describe("NL-07: tripulante, teclado", () => {
  it("NL-07: con el foco en la campana, Enter la abre en el aviso y otro Enter lleva a Certificaciones con el menú cerrado", async () => {
    const { user, visited } = await openAs(PATHS.tripulante.inicio, H1.inicio, [
      REGISTERED,
    ])
    const trigger = await screen.findByRole("button", {
      name: /^Notificaciones/,
    })
    await waitFor(() => expect(trigger).toHaveAccessibleName(/1 sin leer/))

    trigger.focus()
    await user.keyboard("{Enter}")
    const item = await findBellItem(REGISTERED.message)
    await waitFor(() => expect(item).toHaveFocus())
    await user.keyboard("{Enter}")

    await waitFor(() =>
      expect(visited).toContain(PATHS.tripulante.certificaciones)
    )
    await expectMenuClosed()
    await screen.findByRole("heading", { level: 1, name: H1.certificaciones })
  })
})
