import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { COVERED_ABSENCE, REPORTED_ABSENCE } from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { queryAllToasts } from "../utils/toasts"
import {
  alertsIn,
  type BellItem,
  clickBellItem,
  dayButton,
  DEFAULT_REQUEST,
  expectAbsenceDetailOpen,
  expectFlightSelected,
  expectMenuClosed,
  expectParamCleared,
  expectRequestSelected,
  expectVisited,
  findBellItem,
  flightTab,
  localDay,
  localInstant,
  mockBell,
  mockSupervisorBackend,
  openBell,
  OTHER_REQUEST,
  queryBellItem,
  recordLocations,
  requestTab,
  TARGET_DAY_DEFAULT_FLIGHT,
  TARGET_DAY_OFFSET,
  TARGET_FLIGHT,
  TARGET_REQUEST,
  TODAY_DEFAULT_FLIGHT,
} from "./notificationsTestUtils"

// Spec docs/specs/notificaciones-navegables.md, parte B, con la campana del supervisor
// (sesión real). Contrato del orquestador:
// - cada aviso con destino es un `menuitem` cuyo nombre contiene el mensaje; se activa con
//   clic o Enter, el menú se cierra y la app navega;
// - Ausencias: ?ausencia=<data.absence.id> abre el popup de detalle;
// - Solicitudes de reemplazo: ?solicitud=<data.absence_id> selecciona la pestaña;
// - Programación: ?vuelo=<data.flight_id>&fecha=<día local de data.departure_at> elige el
//   día (aria-pressed) y el vuelo (aria-selected);
// - la pantalla de destino quita el parámetro con replace tras leerlo.

const H1 = {
  ausencias: "Ausencias",
  solicitudes: "Recomendaciones de Reemplazo",
  programacion: "Programación",
}
const DETAIL_ERROR = "No se pudo cargar el detalle de la ausencia."
const CLOSE_DETAIL = "Cerrar detalle de la ausencia"

// Avisos tal como los guarda el backend (`data` de GET /api/notification/notifications).
const REPORTED: BellItem = {
  id: "n-reported",
  type: "absence:reported",
  message: "EMP-100 no podrá volar (incapacidad).",
  data: { absence: { id: REPORTED_ABSENCE.id, status: "reported" } },
}
const COVERED: BellItem = {
  id: "n-covered",
  type: "absence:covered",
  message: "La ausencia de EMP-200 ya tiene reemplazo.",
  data: { absence: { id: COVERED_ABSENCE.id, status: "covered" } },
}
const SUGGESTIONS: BellItem = {
  id: "n-suggestions",
  type: "absence:suggestions_ready",
  message: "La IA terminó de buscar reemplazos para el vuelo DL-1002.",
  data: { absence_id: TARGET_REQUEST.id, state: "ready" },
}
const DEADLINE: BellItem = {
  id: "n-deadline",
  type: "absence:deadline_missed",
  message: "Venció el plazo del reemplazo en el vuelo DL-1002.",
  data: { absence_id: TARGET_REQUEST.id },
}
const slotVacated = (flightId: string, departureAt: string): BellItem => ({
  id: `n-slot-${flightId}`,
  type: "flight:slot_vacated",
  message: `Puesto vacante en el vuelo ${flightId}: se eliminó la cuenta del tripulante.`,
  data: {
    flight_id: flightId,
    flight_number: TARGET_FLIGHT.flightNumber,
    origin: "JFK",
    destination: "LAX",
    departure_at: departureAt,
    slot_id: "captain",
    role: "Capitán",
  },
})
// Sale hoy + 3 a las 23:30 locales: en Bogotá el día UTC ya es hoy + 4.
const SLOT_VACATED = slotVacated(
  TARGET_FLIGHT.id,
  localInstant(TARGET_DAY_OFFSET, 23, 30)
)

// Sesión real del supervisor, su backend y la campana; monta `path` y espera su h1.
const openAs = async (path: string, h1: string, bell: BellItem[]) => {
  const detailIds = mockSupervisorBackend()
  const bellState = mockBell(bell)
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  const user = userEvent.setup()
  const router = renderRoute(path)
  const visited = recordLocations(router)
  await screen.findByRole("heading", { level: 1, name: h1, hidden: true })
  return { user, router, visited, detailIds, bellState }
}

const openSolicitudes = async (path: string, bell: BellItem[] = []) => {
  const opened = await openAs(path, H1.solicitudes, bell)
  await waitFor(() => requestTab(DEFAULT_REQUEST.flight_number))
  return opened
}

const openProgramacion = async (path: string, bell: BellItem[] = []) => {
  const opened = await openAs(path, H1.programacion, bell)
  await waitFor(() => flightTab(TODAY_DEFAULT_FLIGHT.flightNumber))
  return opened
}

describe("NL-01: avisos de ausencia → detalle en Ausencias", () => {
  it("NL-01: pulsar «absence:reported» lleva a Ausencias con el detalle de esa ausencia abierto y cierra el menú", async () => {
    const { user, router, visited, detailIds } = await openProgramacion(
      PATHS.superVisor.programacion,
      [REPORTED, COVERED]
    )

    await clickBellItem(user, REPORTED.message)

    await expectVisited(visited, PATHS.superVisor.ausencias, {
      ausencia: REPORTED_ABSENCE.id,
    })
    await expectMenuClosed()
    await screen.findByRole("heading", {
      level: 1,
      name: H1.ausencias,
      hidden: true,
    })
    const dialog = await expectAbsenceDetailOpen(REPORTED_ABSENCE.crew_name)
    expect(dialog).not.toHaveTextContent(COVERED_ABSENCE.crew_name)
    expect(detailIds).toContain(REPORTED_ABSENCE.id)
    await expectParamCleared(router, PATHS.superVisor.ausencias)
  })

  it("NL-01: pulsar «absence:covered» lleva a Ausencias con el detalle de esa ausencia abierto", async () => {
    const { user, router, visited } = await openProgramacion(
      PATHS.superVisor.programacion,
      [REPORTED, COVERED]
    )

    await clickBellItem(user, COVERED.message)

    await expectVisited(visited, PATHS.superVisor.ausencias, {
      ausencia: COVERED_ABSENCE.id,
    })
    const dialog = await expectAbsenceDetailOpen(COVERED_ABSENCE.crew_name)
    expect(dialog).not.toHaveTextContent(REPORTED_ABSENCE.crew_name)
    await expectParamCleared(router, PATHS.superVisor.ausencias)
  })

  it("NL-01 (URL): /supervisor/ausencias?ausencia=<id> abre el detalle de esa ausencia y quita el parámetro", async () => {
    const { router } = await openAs(
      `${PATHS.superVisor.ausencias}?ausencia=${COVERED_ABSENCE.id}`,
      H1.ausencias,
      []
    )

    await expectAbsenceDetailOpen(COVERED_ABSENCE.crew_name)
    await expectParamCleared(router, PATHS.superVisor.ausencias)
  })
})

describe("NL-02: avisos de la IA y del plazo → solicitud seleccionada", () => {
  it.each([
    ["absence:suggestions_ready", SUGGESTIONS],
    ["absence:deadline_missed", DEADLINE],
  ])(
    "NL-02: pulsar «%s» lleva a Solicitudes de reemplazo con esa solicitud seleccionada",
    async (_type, item) => {
      const { user, router, visited } = await openAs(
        PATHS.superVisor.ausencias,
        H1.ausencias,
        [item]
      )

      await clickBellItem(user, item.message)

      await expectVisited(visited, PATHS.superVisor.solicitudesReemplazo, {
        solicitud: TARGET_REQUEST.id,
      })
      await expectMenuClosed()
      await screen.findByRole("heading", { level: 1, name: H1.solicitudes })
      await expectRequestSelected(TARGET_REQUEST.flight_number)
      expect(requestTab(DEFAULT_REQUEST.flight_number)).toHaveAttribute(
        "aria-selected",
        "false"
      )
      await expectParamCleared(router, PATHS.superVisor.solicitudesReemplazo)
    }
  )

  it("NL-02 (URL): /supervisor/solicitudes-reemplazo?solicitud=<id> selecciona esa solicitud (no la primera) y quita el parámetro", async () => {
    const { router } = await openSolicitudes(
      `${PATHS.superVisor.solicitudesReemplazo}?solicitud=${TARGET_REQUEST.id}`
    )

    await expectRequestSelected(TARGET_REQUEST.flight_number)
    await expectParamCleared(router, PATHS.superVisor.solicitudesReemplazo)
    // Sigue seleccionada tras quitar el parámetro.
    expect(requestTab(TARGET_REQUEST.flight_number)).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })
})

describe("NL-03: puesto vacante → día y vuelo en Programación", () => {
  it("NL-03: pulsar «flight:slot_vacated» lleva a Programación en el día local del vuelo, con ese vuelo seleccionado", async () => {
    const { user, router, visited } = await openAs(
      PATHS.superVisor.ausencias,
      H1.ausencias,
      [SLOT_VACATED]
    )

    await clickBellItem(user, SLOT_VACATED.message)

    await expectVisited(visited, PATHS.superVisor.programacion, {
      vuelo: TARGET_FLIGHT.id,
      fecha: localDay(TARGET_DAY_OFFSET),
    })
    await expectMenuClosed()
    await screen.findByRole("heading", { level: 1, name: H1.programacion })
    await expectFlightSelected(TARGET_DAY_OFFSET, TARGET_FLIGHT.flightNumber)
    expect(dayButton(0)).toHaveAttribute("aria-pressed", "false")
    expect(flightTab(TARGET_DAY_DEFAULT_FLIGHT.flightNumber)).toHaveAttribute(
      "aria-selected",
      "false"
    )
    await expectParamCleared(router, PATHS.superVisor.programacion)
  })

  it("NL-03 (URL): /supervisor/programacion?vuelo=<id>&fecha=<día> elige ese día y ese vuelo y quita los parámetros", async () => {
    const { router } = await openAs(
      `${PATHS.superVisor.programacion}?vuelo=${TARGET_FLIGHT.id}&fecha=${localDay(TARGET_DAY_OFFSET)}`,
      H1.programacion,
      []
    )

    await expectFlightSelected(TARGET_DAY_OFFSET, TARGET_FLIGHT.flightNumber)
    await expectParamCleared(router, PATHS.superVisor.programacion)
    expect(flightTab(TARGET_FLIGHT.flightNumber)).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })
})

describe("NL-05: ya en la pantalla de destino y pulsando dos veces el mismo aviso", () => {
  it("NL-05: en Ausencias, el aviso abre el detalle; tras cerrarlo, el mismo aviso lo vuelve a abrir", async () => {
    const { user, router } = await openAs(
      PATHS.superVisor.ausencias,
      H1.ausencias,
      [REPORTED]
    )

    await clickBellItem(user, REPORTED.message)
    const dialog = await expectAbsenceDetailOpen(REPORTED_ABSENCE.crew_name)
    await expectParamCleared(router, PATHS.superVisor.ausencias)

    await user.click(within(dialog).getByRole("button", { name: CLOSE_DETAIL }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )

    await clickBellItem(user, REPORTED.message)
    await expectAbsenceDetailOpen(REPORTED_ABSENCE.crew_name)
    await expectParamCleared(router, PATHS.superVisor.ausencias)
  })

  it("NL-05: en Solicitudes de reemplazo, el aviso selecciona su solicitud; tras elegir otra a mano, el mismo aviso la vuelve a seleccionar", async () => {
    const { user, router } = await openSolicitudes(
      PATHS.superVisor.solicitudesReemplazo,
      [SUGGESTIONS]
    )
    await expectRequestSelected(DEFAULT_REQUEST.flight_number)

    await clickBellItem(user, SUGGESTIONS.message)
    await expectRequestSelected(TARGET_REQUEST.flight_number)
    await expectParamCleared(router, PATHS.superVisor.solicitudesReemplazo)

    await user.click(requestTab(OTHER_REQUEST.flight_number))
    await expectRequestSelected(OTHER_REQUEST.flight_number)

    await clickBellItem(user, SUGGESTIONS.message)
    await expectRequestSelected(TARGET_REQUEST.flight_number)
  })

  it("NL-05: en Programación, el aviso elige su día y su vuelo; tras volver a hoy, el mismo aviso los vuelve a elegir", async () => {
    const { user, router } = await openProgramacion(
      PATHS.superVisor.programacion,
      [SLOT_VACATED]
    )

    await clickBellItem(user, SLOT_VACATED.message)
    await expectFlightSelected(TARGET_DAY_OFFSET, TARGET_FLIGHT.flightNumber)
    await expectParamCleared(router, PATHS.superVisor.programacion)

    await user.click(dayButton(0))
    await waitFor(() =>
      expect(dayButton(0)).toHaveAttribute("aria-pressed", "true")
    )

    await clickBellItem(user, SLOT_VACATED.message)
    await expectFlightSelected(TARGET_DAY_OFFSET, TARGET_FLIGHT.flightNumber)
  })
})

describe("NL-06: avisos sin id o con un elemento que ya no está", () => {
  it("NL-06: un aviso sin el id que necesita, o de un tipo desconocido, se muestra en la campana sin ser un ítem pulsable (y uno con id sí lo es)", async () => {
    const withoutIds: BellItem[] = [
      {
        id: "n-1",
        type: "absence:reported",
        message: "Aviso antiguo de ausencia sin id.",
        data: {},
      },
      {
        id: "n-2",
        type: "absence:covered",
        message: "Aviso antiguo de cubierta sin id.",
        data: { absence: {} },
      },
      {
        id: "n-3",
        type: "absence:suggestions_ready",
        message: "Aviso antiguo de la IA sin id.",
        data: { state: "ready" },
      },
      {
        id: "n-4",
        type: "absence:deadline_missed",
        message: "Aviso antiguo de plazo sin id.",
        data: {},
      },
      {
        id: "n-5",
        type: "flight:slot_vacated",
        message: "Aviso antiguo de puesto vacante sin vuelo.",
        data: { departure_at: localInstant(TARGET_DAY_OFFSET, 23, 30) },
      },
      {
        id: "n-6",
        type: "flight:delayed",
        message: "Aviso de un tipo que la app no conoce.",
        data: { absence_id: TARGET_REQUEST.id, flight_id: TARGET_FLIGHT.id },
      },
    ]
    const { user } = await openAs(PATHS.superVisor.ausencias, H1.ausencias, [
      REPORTED,
      ...withoutIds,
    ])

    const menu = await openBell(user)

    expect(await findBellItem(REPORTED.message)).toBeInTheDocument()
    for (const item of withoutIds) {
      expect(within(menu).getByText(item.message)).toBeInTheDocument()
      expect(queryBellItem(item.message), item.type).not.toBeInTheDocument()
    }
  })

  it("NL-06: un aviso de una ausencia que ya no existe lleva a Ausencias y el popup muestra solo el error propio del detalle", async () => {
    const GONE: BellItem = {
      ...REPORTED,
      id: "n-gone",
      message: "EMP-900 no podrá volar (fatiga).",
      data: { absence: { id: "abs-borrada" } },
    }
    const { user, visited, detailIds } = await openProgramacion(
      PATHS.superVisor.programacion,
      [GONE]
    )

    await clickBellItem(user, GONE.message)

    await expectVisited(visited, PATHS.superVisor.ausencias, {
      ausencia: "abs-borrada",
    })
    const dialog = await screen.findByRole("dialog")
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(DETAIL_ERROR)
    )
    expect(detailIds).toContain("abs-borrada")
    // Ningún otro error: ni en el tablero ni como toast.
    expect(alertsIn(screen.getByRole("main", { hidden: true }))).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("NL-06: un aviso de una solicitud que ya no está en la cola lleva a Solicitudes de reemplazo con la selección por defecto y sin error", async () => {
    const RESOLVED: BellItem = {
      ...SUGGESTIONS,
      id: "n-resolved",
      message:
        "La IA terminó de buscar reemplazos para una solicitud ya resuelta.",
      data: { absence_id: "abs-resuelta", state: "ready" },
    }
    const { user, router, visited } = await openAs(
      PATHS.superVisor.ausencias,
      H1.ausencias,
      [RESOLVED]
    )

    await clickBellItem(user, RESOLVED.message)

    await expectVisited(visited, PATHS.superVisor.solicitudesReemplazo, {
      solicitud: "abs-resuelta",
    })
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        PATHS.superVisor.solicitudesReemplazo
      )
    )
    await expectRequestSelected(DEFAULT_REQUEST.flight_number)
    expect(alertsIn(screen.getByRole("main", { hidden: true }))).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("NL-06: un puesto vacante de un vuelo que no está ese día (hoy) lleva a Programación en hoy, con la selección por defecto y sin error", async () => {
    const MISSING = slotVacated("f-borrado", localInstant(0, 23, 30))
    const { user, router, visited } = await openAs(
      PATHS.superVisor.ausencias,
      H1.ausencias,
      [MISSING]
    )

    await clickBellItem(user, MISSING.message)

    await expectVisited(visited, PATHS.superVisor.programacion, {
      vuelo: "f-borrado",
      fecha: localDay(0),
    })
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.superVisor.programacion)
    )
    await expectFlightSelected(0, TODAY_DEFAULT_FLIGHT.flightNumber)
    expect(alertsIn(screen.getByRole("main", { hidden: true }))).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  // Decisión del orquestador: con la fecha dentro de los 7 días, Programación se queda en
  // el día del aviso aunque el vuelo ya no esté.
  it("NL-06: un puesto vacante de un vuelo que ya no está en su día (hoy + 3) lleva a Programación en ese día, con la selección por defecto del día y sin error", async () => {
    const MISSING = slotVacated(
      "f-borrado",
      localInstant(TARGET_DAY_OFFSET, 12, 0)
    )
    const { user, router, visited } = await openAs(
      PATHS.superVisor.ausencias,
      H1.ausencias,
      [MISSING]
    )

    await clickBellItem(user, MISSING.message)

    await expectVisited(visited, PATHS.superVisor.programacion, {
      vuelo: "f-borrado",
      fecha: localDay(TARGET_DAY_OFFSET),
    })
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.superVisor.programacion)
    )
    await expectFlightSelected(
      TARGET_DAY_OFFSET,
      TARGET_DAY_DEFAULT_FLIGHT.flightNumber
    )
    expect(alertsIn(screen.getByRole("main", { hidden: true }))).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("NL-06: un puesto vacante de un vuelo fuera de los 7 días lleva a Programación en hoy, con la selección por defecto y sin error", async () => {
    // El vuelo existe (hoy + 3), pero la fecha del aviso cae fuera del selector.
    const FAR = slotVacated(TARGET_FLIGHT.id, localInstant(10, 12, 0))
    const { user, router, visited } = await openAs(
      PATHS.superVisor.ausencias,
      H1.ausencias,
      [FAR]
    )

    await clickBellItem(user, FAR.message)

    await expectVisited(visited, PATHS.superVisor.programacion, {
      vuelo: TARGET_FLIGHT.id,
      fecha: localDay(10),
    })
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.superVisor.programacion)
    )
    await expectFlightSelected(0, TODAY_DEFAULT_FLIGHT.flightNumber)
    expect(alertsIn(screen.getByRole("main", { hidden: true }))).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })
})

describe("NL-07: teclado", () => {
  it("NL-07: con el foco en la campana, Enter la abre en el primer aviso y otro Enter lo activa: navega al destino y el menú se cierra", async () => {
    const { user, visited } = await openProgramacion(
      PATHS.superVisor.programacion,
      [REPORTED]
    )
    const trigger = await screen.findByRole("button", {
      name: /^Notificaciones/,
    })
    // Esperar a que el aviso haya llegado (el nombre dice «1 sin leer»).
    await waitFor(() => expect(trigger).toHaveAccessibleName(/1 sin leer/))

    trigger.focus()
    await user.keyboard("{Enter}")
    const item = await findBellItem(REPORTED.message)
    await waitFor(() => expect(item).toHaveFocus())
    await user.keyboard("{Enter}")

    await expectVisited(visited, PATHS.superVisor.ausencias, {
      ausencia: REPORTED_ABSENCE.id,
    })
    await expectMenuClosed()
    await expectAbsenceDetailOpen(REPORTED_ABSENCE.crew_name)
  })
})
