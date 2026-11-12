import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Inicio del supervisor (spec docs/specs/inicio-supervisor.md): estados de carga y error
// aislados por bloque (IS-07) y separación de los datos del admin (IS-08).

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de supervisorHome.data.ts y de adminHome.data.ts se envuelve: registra su
// nombre al llamarse y, si hay override, lo usa en lugar de la real. El test no importa
// estos módulos, así compila aunque supervisorHome.data.ts todavía no exista.
const data = vi.hoisted(() => ({
  supervisorCalls: [] as string[],
  adminCalls: [] as string[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/supervisorHome/data/supervisorHome.data",
  async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return Object.fromEntries(
      Object.entries(actual).map(([name, value]) => {
        if (typeof value !== "function") return [name, value]
        const real = value as DataFn
        return [
          name,
          (...args: unknown[]) => {
            data.supervisorCalls.push(name)
            return (data.overrides[name] ?? real)(...args)
          },
        ]
      })
    )
  }
)

vi.mock("@/modules/adminHome/data/adminHome.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          data.adminCalls.push(name)
          return real(...args)
        },
      ]
    })
  )
})

afterEach(() => {
  data.supervisorCalls = []
  data.adminCalls = []
  data.overrides = {}
})

const H1 = "Camila Restrepo, Bienvenida a AirCrew"
const never = () => new Promise(() => {})
const fail = () => Promise.reject(new Error("servicio caído"))

const renderHome = async () => {
  const router = renderRoute(PATHS.superVisor.inicio)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return router
}

// Las 5 funciones del contrato, con los textos de su bloque y un dato que solo aparece
// cuando ese bloque tiene datos (sirve para comprobar que los demás bloques siguen).
const BLOCKS = [
  {
    fn: "getSupervisionCenter",
    block: "bienvenida",
    loading: "Cargando condición operacional…",
    error: "No se pudo cargar la condición operacional.",
    shown: () => screen.findByText("Nivel Óptimo"),
  },
  {
    fn: "getShiftStatus",
    block: "foto del turno",
    loading: "Cargando estado del turno…",
    error: "No se pudo cargar el estado del turno.",
    shown: () =>
      screen.findByRole("heading", {
        level: 2,
        name: "Disponibilidad y Relevos en Tiempo Real",
      }),
  },
  {
    fn: "getReplacementRequestsSummary",
    block: "Solicitudes de Reemplazo",
    loading: "Cargando solicitudes de reemplazo…",
    error: "No se pudo cargar el resumen de solicitudes.",
    shown: () => screen.findByText("5 por aprobar"),
  },
  {
    fn: "getAbsencesSummary",
    block: "Ausencias",
    loading: "Cargando resumen de ausencias…",
    error: "No se pudo cargar el resumen de ausencias.",
    shown: () => screen.findByText("3 abiertas"),
  },
  {
    fn: "getCrewSummary",
    block: "Tripulación",
    loading: "Cargando resumen de tripulación…",
    error: "No se pudo cargar el resumen de tripulación.",
    shown: () => screen.findByText("34 en servicio"),
  },
]

describe("Inicio del supervisor: estados de datos (IS-07)", () => {
  it("IS-07 mientras cargan, cada bloque muestra su propio role=status", async () => {
    for (const { fn } of BLOCKS) data.overrides[fn] = never

    await renderHome()

    for (const { loading } of BLOCKS) {
      expect(await screen.findByText(loading)).toHaveAttribute("role", "status")
    }
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it("IS-07 cada indicador de carga está dentro de su propio bloque", async () => {
    for (const { fn } of BLOCKS) data.overrides[fn] = never

    await renderHome()

    const inside: [HTMLElement, string][] = [
      [
        screen.getByRole("region", { name: H1 }),
        "Cargando condición operacional…",
      ],
      [
        await screen.findByRole("region", { name: "Estado del turno" }),
        "Cargando estado del turno…",
      ],
      [
        screen.getByRole("article", { name: "Solicitudes de Reemplazo" }),
        "Cargando solicitudes de reemplazo…",
      ],
      [
        screen.getByRole("article", { name: "Ausencias" }),
        "Cargando resumen de ausencias…",
      ],
      [
        screen.getByRole("article", { name: "Tripulación" }),
        "Cargando resumen de tripulación…",
      ],
    ]
    for (const [block, loading] of inside) {
      expect(within(block).getByRole("status")).toHaveTextContent(loading)
    }
  })

  it.each(BLOCKS)(
    "IS-07 si falla $fn, solo el bloque «$block» muestra su role=alert y los demás siguen",
    async ({ fn, error }) => {
      data.overrides[fn] = fail

      await renderHome()

      expect(await screen.findByText(error)).toHaveAttribute("role", "alert")
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      for (const other of BLOCKS.filter((block) => block.fn !== fn)) {
        expect(
          await other.shown(),
          `el bloque «${other.block}» debe seguir con sus datos`
        ).toBeInTheDocument()
      }
    }
  )

  it.each([
    { fn: "getReplacementRequestsSummary", link: "Revisar Solicitudes" },
    { fn: "getAbsencesSummary", link: "Gestionar Ausencias" },
    { fn: "getCrewSummary", link: "Ver Tripulación" },
  ])(
    "IS-07 si falla $fn, su tarjeta conserva el enlace «$link»",
    async ({ fn, link }) => {
      data.overrides[fn] = fail

      await renderHome()

      await screen.findByRole("alert")
      expect(screen.getByRole("link", { name: link })).toBeInTheDocument()
    }
  )
})

describe("Inicio del supervisor: datos propios (IS-08)", () => {
  it("IS-08 la página pide las 5 funciones de supervisorHome.data y ninguna de adminHome.data", async () => {
    await renderHome()

    // Ancla positiva: sin ella, el registro del admin vacío pasaría con una página vacía.
    for (const { shown } of BLOCKS) expect(await shown()).toBeInTheDocument()
    await waitFor(() =>
      expect(new Set(data.supervisorCalls)).toEqual(
        new Set(BLOCKS.map((block) => block.fn))
      )
    )
    expect(data.adminCalls).toEqual([])
  })
})
