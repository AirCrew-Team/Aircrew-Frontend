import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast, toastDescription } from "../utils/toasts"

// Inicio del super admin: secciones, accesos a los módulos, estados de carga y error
// aislados por sección, y la confirmación simulada de la dotación.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de adminHome.data.ts se envuelve para poder forzar carga o error.
// Sin override, delega en la función real (datos simulados de la referencia).
const adminHomeData = vi.hoisted(() => ({
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/adminHome/data/adminHome.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) =>
          (adminHomeData.overrides[name] ?? real)(...args),
      ]
    })
  )
})

afterEach(() => {
  adminHomeData.overrides = {}
})

const H1 = "Admin AirCrew, Bienvenido a AirCrew"
const never = () => new Promise(() => {})
const fail = () => Promise.reject(new Error("servicio caído"))

const renderHome = async () => {
  const router = renderRoute(PATHS.superAdmin.inicio)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return router
}

describe("Inicio del super admin: contenido", () => {
  it("muestra la bienvenida, la sede y la condición operacional", async () => {
    await renderHome()

    expect(
      await screen.findByText("Jefatura de Operaciones de Vuelo")
    ).toBeInTheDocument()
    expect(screen.getByText("Base Eldorado")).toBeInTheDocument()
    expect(
      screen.getByText("Centro de Operaciones y Despacho Aéreo • Turno Activo")
    ).toBeInTheDocument()
    expect(screen.getByText("Nivel Óptimo")).toBeInTheDocument()
  })

  it("el reloj maestro muestra la hora UTC y debajo la local, sin segundos", async () => {
    await renderHome()

    const [utc, local] = document.querySelectorAll("time")
    expect(utc?.textContent).toMatch(/^\d{2}:\d{2} UTC$/)
    expect(local?.textContent).toMatch(/^\d{2}:\d{2} Local$/)
  })

  it("muestra el estado de la base con la pista activa y el QNH", async () => {
    await renderHome()

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Operaciones Normales • Base Central Bogotá Eldorado",
      })
    ).toBeInTheDocument()
    expect(screen.getByText("RWY 13R")).toBeInTheDocument()
    expect(screen.getByText("1022 hPa")).toBeInTheDocument()
  })

  it.each([
    {
      title: "Gestión de Usuarios",
      badge: "34 tripulantes registrados",
      metric: "92% Apto",
    },
    {
      title: "Flota de Aeronaves",
      badge: "18 activas",
      metric: "18 / 18 Operativas",
    },
    {
      title: "Certificaciones y Licencias",
      badge: "4 por renovar",
      metric: "4 Alertas en 30d",
    },
  ])(
    "la tarjeta «$title» muestra su etiqueta y su dato",
    async ({ title, badge, metric }) => {
      await renderHome()

      const card = (
        await screen.findByRole("heading", { level: 2, name: title })
      ).closest("article") as HTMLElement
      expect(await within(card).findByText(badge)).toBeInTheDocument()
      expect(within(card).getByText(metric)).toBeInTheDocument()
    }
  )

  it.each([
    { link: "Ir a Usuarios", path: PATHS.superAdmin.usuarios },
    { link: "Ver Aeronaves", path: PATHS.superAdmin.aeronaves },
    {
      link: "Revisar Certificaciones",
      path: PATHS.superAdmin.certificaciones,
    },
  ])("«$link» lleva a $path", async ({ link, path }) => {
    const user = userEvent.setup()
    const router = await renderHome()

    await user.click(screen.getByRole("link", { name: link }))

    await waitFor(() => expect(router.state.location.pathname).toBe(path))
  })

  it("el navbar del admin tiene Inicio, Usuarios, Aeronaves y Certificaciones", async () => {
    await renderHome()

    const nav = screen.getAllByRole("navigation")[0]
    for (const label of [
      "Inicio",
      "Usuarios",
      "Aeronaves",
      "Certificaciones",
    ]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument()
    }
    expect(
      within(nav).queryByRole("link", { name: "Reportes" })
    ).not.toBeInTheDocument()
  })
})

describe("Inicio del super admin: estados de datos", () => {
  it("mientras cargan, cada sección muestra su propio indicador", async () => {
    for (const name of [
      "getOpsCenter",
      "getAirportStatus",
      "getUsersSummary",
      "getFleetSummary",
      "getCertificationsRenewals",
      "getStandbySummary",
    ]) {
      adminHomeData.overrides[name] = never
    }

    await renderHome()

    for (const text of [
      "Cargando condición operacional…",
      "Cargando estado de la base…",
      "Cargando resumen de usuarios…",
      "Cargando estado de la flota…",
      "Cargando vigencias…",
      "Cargando resumen de guardias…",
    ]) {
      expect(screen.getByText(text)).toHaveAttribute("role", "status")
    }
  })

  it("si falla la flota, solo su tarjeta muestra el error y las demás siguen", async () => {
    adminHomeData.overrides.getFleetSummary = fail

    await renderHome()

    expect(
      await screen.findByText("No se pudo cargar el estado de la flota.")
    ).toHaveAttribute("role", "alert")
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    // El resto de la pantalla mantiene sus datos y el acceso a Aeronaves sigue disponible.
    expect(
      await screen.findByText("34 tripulantes registrados")
    ).toBeInTheDocument()
    expect(screen.getByText("RWY 13R")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Ver Aeronaves" })
    ).toBeInTheDocument()
  })

  it("si falla el estado de la base, el banner muestra el error", async () => {
    adminHomeData.overrides.getAirportStatus = fail

    await renderHome()

    expect(
      await screen.findByText("No se pudo cargar el estado de la base.")
    ).toHaveAttribute("role", "alert")
    expect(
      await screen.findByText("Sistema de suplencias en guardia listo")
    ).toBeInTheDocument()
  })
})

describe("Inicio del super admin: confirmar dotación", () => {
  it("confirma con un toast y deja el botón en «Dotación Confirmada»", async () => {
    const user = userEvent.setup()
    await renderHome()

    await user.click(
      await screen.findByRole("button", { name: "Confirmar Dotación" })
    )

    const toast = await findToast("Dotación confirmada")
    expect(toastDescription(toast)).toBe(
      "Turno de la Tarde: 3 tripulantes en Standby."
    )
    const button = screen.getByRole("button", { name: "Dotación Confirmada" })
    expect(button).toHaveAttribute("aria-disabled", "true")
    expect(button).toHaveFocus()
  })
})
