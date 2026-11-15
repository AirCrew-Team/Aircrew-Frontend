import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { CUENTAS, loginAs, type Rol } from "./support/auth.ts"
import {
  goToConfiguracion,
  goToSection,
  waitForLoaded,
} from "./support/navigation.ts"

// E2E-11: sin violaciones critical ni serious de WCAG 2.1 A/AA en cada pantalla, ya cargada.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

// Las pantallas se escanean sin los toasts: loginAs ya no espera a que se vaya el de
// bienvenida, y con él dentro el resultado dependería de cuánto tarde cada prueba. Los
// toasts tienen su propio escaneo (abajo).
const TOASTER = "[data-sonner-toaster]"

const expectNoSeriousViolations = async (
  page: Page,
  scope: "pantalla" | "toasts" = "pantalla"
) => {
  await waitForLoaded(page)
  const builder = new AxeBuilder({ page }).withTags(TAGS)
  if (scope === "toasts") builder.include(TOASTER)
  else builder.exclude(TOASTER)
  const { violations } = await builder.analyze()
  const graves = violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => ({
      regla: v.id,
      impacto: v.impact,
      nodos: v.nodes.map((node) => ({
        selector: node.target.join(" "),
        html: node.html.slice(0, 160),
      })),
    }))
  expect(graves).toEqual([])
}

const pantallas: {
  nombre: string
  rol: Rol
  abrir?: (page: Page) => Promise<void>
}[] = [
  { nombre: "Inicio del tripulante", rol: "tripulante" },
  { nombre: "Inicio del supervisor", rol: "supervisor" },
  { nombre: "Inicio del admin", rol: "admin" },
  {
    nombre: "Recomendaciones",
    rol: "supervisor",
    abrir: (page) =>
      goToSection(page, "Recomendaciones", "Recomendaciones de Reemplazo"),
  },
  {
    nombre: "Ausencias",
    rol: "supervisor",
    abrir: (page) => goToSection(page, "Ausencias", "Ausencias"),
  },
  {
    nombre: "Tripulación",
    rol: "supervisor",
    abrir: (page) => goToSection(page, "Tripulación", "Tripulación"),
  },
  {
    nombre: "Reportar Ausencia",
    rol: "tripulante",
    abrir: (page) =>
      goToSection(page, "Reportar Ausencia", "Reportar Novedad de Ausencia"),
  },
  {
    nombre: "Configuración del tripulante",
    rol: "tripulante",
    abrir: (page) => goToConfiguracion(page, "tripulante"),
  },
  {
    nombre: "Configuración del supervisor",
    rol: "supervisor",
    abrir: (page) => goToConfiguracion(page, "supervisor"),
  },
]

test.describe("E2E-11 Accesibilidad automática (axe)", () => {
  for (const { nombre, rol, abrir } of pantallas) {
    test(`E2E-11 ${nombre} no tiene violaciones critical ni serious de WCAG 2.1 A/AA`, async ({
      page,
    }) => {
      await loginAs(page, rol)
      if (abrir) await abrir(page)
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)

      await expectNoSeriousViolations(page)
    })
  }
})

// Toast de éxito de sonner (richColors), el mismo estilo de todas las confirmaciones de la
// app («Perfil actualizado con éxito», «Contraseña actualizada»…). Se escanea con el de
// bienvenida, que sale justo al entrar.
test("E2E-11 el toast de éxito (bienvenida) no tiene violaciones critical ni serious de WCAG 2.1 A/AA", async ({
  page,
}) => {
  await loginAs(page, "tripulante")
  await expect(
    page
      .getByRole("region", { name: /Notificaciones/ })
      .getByRole("listitem")
      .filter({
        hasText: `Bienvenido a AirCrew, ${CUENTAS.tripulante.rolLabel}.`,
      })
  ).toBeVisible()

  await expectNoSeriousViolations(page, "toasts")
})
