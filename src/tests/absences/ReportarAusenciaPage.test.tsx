import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// La ruta se carga con `lazy` (react-hook-form + zod): la primera espera de la pantalla
// lleva más margen que el segundo por defecto, por si el chunk se transforma en frío.
const LAZY = { timeout: 3000 }

// Spec reportar-ausencia: contenido estático, campos del formulario y columna derecha,
// con los datos simulados reales de absences.data.ts.
// La ruta se carga con `lazy`: todo se espera con findBy* o waitFor.

const H1 = "Reportar Novedad de Ausencia"
const OVERLINE = "OCC Crew Operations • Novedades de Tripulación"
const DESCRIPTION =
  "Notifica a la supervisión de operaciones (OCC) sobre cualquier indisponibilidad médica, fatiga o calamidad imprevista para tu próximo servicio programado."

const FIELD = {
  reason: "Motivo de la Ausencia",
  notes: "Observaciones Adicionales",
  attachment: "Soporte o Incapacidad Médica",
} as const

const REASON_OPTIONS = [
  { value: "", text: "Selecciona la tipología de novedad operacional…" },
  { value: "incapacidad", text: "Incapacidad médica repentina" },
  { value: "fatiga", text: "Fatiga operacional / RAC 212" },
  { value: "calamidad", text: "Calamidad doméstica o familiar" },
  { value: "traslado", text: "Dificultad de traslado comprobada" },
]

const NOTES_PLACEHOLDER =
  "Indica brevemente los síntomas, diagnóstico inicial o detalles para la supervisión de despacho…"
const NOTES_HINT = "Máx. 300 caracteres"

const POLICY_POINTS = [
  "Permite al OCC activar la reserva sin impacto en el SLOT (CTOT).",
  "Las novedades por fatiga se amparan bajo el programa FRMS sin penalización.",
]
const MEDICAL_SERVICE =
  "Consultorio Muelle Nacional T1 disponible para valoración prioritaria."

const CRITICAL_NOTICE_TITLE = "Aviso Operacional Crítico"
const CRITICAL_NOTICE_TEXT =
  "Al enviar este reporte, el sistema liberará tu posición inmediatamente para que el algoritmo de supervisión OCC asigne un tripulante en guardia standby. Esta acción genera trazabilidad auditada bajo RAC 121."

const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

// Espera a que la pantalla tenga su <form> con el vuelo de F1 ya cargado.
const findLoadedForm = async () => {
  const main = await screen.findByRole("main")
  const form = await waitFor(() => {
    const element = main.querySelector("form")
    expect(element, "la pantalla debe tener un <form>").not.toBeNull()
    return element as HTMLFormElement
  }, LAZY)
  await waitFor(() => expect(form).toHaveTextContent("AV-8520"))
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return { main, form }
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

describe("Reportar Ausencia: cabecera", () => {
  it("RA-01: con el rol de tripulante se ven el h1 «Reportar Novedad de Ausencia», el antetítulo y la descripción", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)

    const h1 = await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const main = screen.getByRole("main")
    expect(main).toContainElement(h1)
    expect(main).toHaveTextContent(OVERLINE)
    expect(main).toHaveTextContent(DESCRIPTION)
  })
})

describe("Reportar Ausencia: campos del formulario", () => {
  it("RA-05: el <select> nativo «Motivo de la Ausencia» tiene la opción inicial vacía y las 4 opciones de la tabla con sus valores", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const { form } = await findLoadedForm()

    const reason = within(form).getByRole("combobox", { name: FIELD.reason })
    expect(reason.tagName).toBe("SELECT")
    const options = Array.from((reason as HTMLSelectElement).options).map(
      (option) => ({ value: option.value, text: option.textContent?.trim() })
    )
    expect(options).toEqual(REASON_OPTIONS)
    expect(reason).toHaveValue("")
  })

  it("RA-10: el textarea «Observaciones Adicionales» tiene maxLength 300, su marcador de posición y está unido a la pista «Máx. 300 caracteres» con aria-describedby", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const { form } = await findLoadedForm()

    const notes = within(form).getByRole("textbox", { name: FIELD.notes })
    expect(notes.tagName).toBe("TEXTAREA")
    expect(notes).toHaveAttribute("maxlength", "300")
    expect(notes).toHaveAttribute("placeholder", NOTES_PLACEHOLDER)
    expect(notes).toHaveAttribute("aria-describedby")
    expect(notes).toHaveAccessibleDescription(
      expect.stringContaining(NOTES_HINT)
    )
  })

  it("F4 y aviso crítico (contrato de textos): la zona de subida muestra sus dos textos y el aviso operacional es estático, sin role=alert", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const { form } = await findLoadedForm()

    const attachment = form.querySelector('input[type="file"]')
    expect(attachment, 'F4 debe ser un <input type="file">').not.toBeNull()
    expect(attachment).toHaveAccessibleName(FIELD.attachment)
    expect(attachment).toHaveAttribute("accept", ".pdf,.png,.jpg,.jpeg")
    expect(form).toHaveTextContent(
      "Arrastra o haz clic para subir comprobante médico o incapacidad"
    )
    expect(form).toHaveTextContent(
      "Formatos admitidos: PDF, PNG, JPG (Máx 10 MB)"
    )

    expect(form).toHaveTextContent(CRITICAL_NOTICE_TITLE)
    expect(form).toHaveTextContent(CRITICAL_NOTICE_TEXT)
    expect(
      within(form)
        .queryAllByRole("alert")
        .filter((element) =>
          element.textContent?.includes(CRITICAL_NOTICE_TITLE)
        )
    ).toHaveLength(0)
  })
})

describe("Reportar Ausencia: navegación", () => {
  it("RA-13: «Cancelar» es un enlace a /tripulante y lleva al Inicio", async () => {
    const user = userEvent.setup()
    const router = renderRoute(PATHS.tripulante.reportarAusencia)
    const { form } = await findLoadedForm()

    const cancel = within(form).getByRole("link", { name: "Cancelar" })
    expect(cancel).toHaveAttribute("href", PATHS.tripulante.inicio)

    await user.click(cancel)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
    )
  })
})

describe("Reportar Ausencia: columna derecha", () => {
  it("RA-14: se ven los h2 «Normativa de Reportes» y «Línea de Emergencia OCC», la lista de 2 puntos, el enlace telefónico y el Servicio Médico de Base", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const main = await screen.findByRole("main")

    expect(
      await within(main).findByRole(
        "heading",
        {
          level: 2,
          name: "Normativa de Reportes",
        },
        LAZY
      )
    ).toBeInTheDocument()
    expect(
      within(main).getByRole("heading", {
        level: 2,
        name: "Línea de Emergencia OCC",
      })
    ).toBeInTheDocument()

    const firstPoint = within(main).getByText(POLICY_POINTS[0])
    const list = firstPoint.closest("ul")
    expect(
      list,
      "los puntos de la normativa deben ir en un <ul>"
    ).not.toBeNull()
    const items = within(list as HTMLElement).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(POLICY_POINTS[0])
    expect(items[1]).toHaveTextContent(POLICY_POINTS[1])

    const call = within(main).getByRole("link", {
      name: "Llamar a la central OCC, +57 (1) 414-8800",
    })
    expect(call).toHaveAttribute("href", "tel:+5714148800")

    expect(main).toHaveTextContent(MEDICAL_SERVICE)
  })

  it("RA-14 (contrato de textos): R1 y R2 muestran sus subtítulos, recuadros y pie", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const main = await screen.findByRole("main")
    await within(main).findByRole(
      "heading",
      {
        level: 2,
        name: "Normativa de Reportes",
      },
      LAZY
    )

    for (const text of [
      "Regulación Aeronáutica",
      "Ventana Límite de Notificación",
      // El paréntesis «(STD - 1h 30m)» se comprueba aparte (A11Y-AUS-4): lleva texto para lector.
      "Recomendación de reporte con anticipación mínima de 2 horas previas a la hora de presentación de rampa (",
      "Supervisor de Guardia",
      "Canal directo telefónico y de frecuencia con el supervisor de guardia en turno activo las 24 horas.",
      "Central Telefónica Directa",
      "+57 (1) 414-8800",
      "Extensión 301",
      "Canal VHF 131.85 MHz",
      "SKBO-OCC-DESP",
    ]) {
      expect(main).toHaveTextContent(text)
    }
  })
})

describe("Reportar Ausencia: ajustes de lector de pantalla", () => {
  it("A11Y-AUS-4: «STD - 1h 30m» se ve igual pero el lector oye «STD menos 1 hora 30 minutos»", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const main = await screen.findByRole("main")
    await within(main).findByRole(
      "heading",
      { level: 2, name: "Normativa de Reportes" },
      LAZY
    )

    const visual = within(main).getByText("STD - 1h 30m")
    expect(visual).toHaveAttribute("aria-hidden", "true")
    expect(within(main).getByText("STD menos 1 hora 30 minutos")).toHaveClass(
      "sr-only"
    )
  })

  it("A11Y-AUS-5: el formulario es un landmark con el nombre del h1 y F1 ya no es una región", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const main = await screen.findByRole("main")
    expect(
      await within(main).findByRole(
        "form",
        { name: "Reportar Novedad de Ausencia" },
        LAZY
      )
    ).toBeInTheDocument()
    await within(main).findByRole("heading", {
      level: 2,
      name: "Vuelo o Turno Afectado",
    })
    expect(
      within(main).queryByRole("region", { name: "Vuelo o Turno Afectado" })
    ).toBeNull()
  })

  it("A11Y-AUS-6: «Enviar Aviso a Despacho» se describe con el aviso operacional crítico", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)
    const main = await screen.findByRole("main")
    const submit = await within(main).findByRole(
      "button",
      { name: "Enviar Aviso a Despacho" },
      LAZY
    )

    expect(submit).toHaveAccessibleDescription(
      /liberará tu posición inmediatamente/
    )
  })
})
