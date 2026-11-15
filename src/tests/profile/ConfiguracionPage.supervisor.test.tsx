import { waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"

import {
  findLoadedMain,
  findSuccessToast,
  getSectionByHeading,
  renderConfiguracion,
  SECURITY_HEADING,
} from "./profileTestUtils"

// Bloques propios del supervisor (spec configuracion-tripulante-supervisor, CS-04 a CS-09),
// con los datos simulados reales de profile.data.ts. Reemplazan los CP-10 y el CP-12 del
// supervisor, que esperaban la pantalla genérica sin bloques propios.
// Ojo con los caracteres: «–» es U+2013 y «·» es U+00B7 (copiados de la spec).

const SUPERVISOR_NAME = "Camila Restrepo"

const HEADER = {
  overline: "Expediente personal • Control de tripulaciones",
  title: "Mi Perfil y Ajustes de Supervisor",
  description:
    "Gestiona tus datos de contacto, consulta tu base y tu turno asignados y elige qué avisos del flujo de reemplazos recibes.",
  shiftTag: "Turno 14:00–22:00 UTC",
}

const QUICK_STATS: [string, string][] = [
  ["Base Asignada", "El Dorado, Bogotá (BOG)"],
  ["Turno", "Tarde · 14:00–22:00 UTC"],
  ["Área", "Control de Tripulaciones (OCC)"],
  ["Canal OCC", "Canal 1"],
]

const EMPLOYMENT_H2 =
  "2. Información Laboral y Turno (Solo Lectura - Registrada)"
const NOTIFICATIONS_H2 = "3. Notificaciones del Flujo de Reemplazos"

const SUPERVISOR_FORM_H2 = [
  "1. Información de Contacto Operativo (Editable)",
  EMPLOYMENT_H2,
  NOTIFICATIONS_H2,
  SECURITY_HEADING,
]

const EMPLOYMENT_FIELDS: [string, string][] = [
  ["Base Asignada", "Bogotá - El Dorado (BOG)"],
  ["Cargo Oficial", "Supervisora de Tripulaciones OCC"],
  ["Área", "Centro de Control Operacional (OCC)"],
  ["Turno Asignado", "Tarde · 14:00 a 22:00 UTC"],
  ["Fecha de Ingreso", "3 de Marzo de 2016 (10+ años)"],
  ["Canal de Radio", "Canal 1 · Coordinación OCC"],
]

const SUPERVISOR_SWITCHES: [string, string][] = [
  [
    "Nuevas Ausencias en tu Base",
    "Aviso inmediato cuando un tripulante de tu base reporta una ausencia durante tu turno.",
  ],
  [
    "Propuestas de la IA Listas",
    "Aviso cuando la IA termina de proponer candidatos para una solicitud y espera tu aprobación en Recomendaciones.",
  ],
  [
    "Solicitudes sin Candidatos",
    "Aviso cuando las reglas dejan una solicitud sin nadie apto y necesitas gestionarla a mano.",
  ],
  [
    "Plazos de Confirmación Vencidos",
    "Aviso cuando un tripulante aprobado no confirma a tiempo y la solicitud pasa a la siguiente opción.",
  ],
]

// h2 numerados del formulario, en orden del DOM.
const numberedH2 = (main: HTMLElement) =>
  within(main)
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent?.trim() ?? "")
    .filter((text) => /^\d+\./.test(text))

const textsOf = (elements: Iterable<Element>) =>
  Array.from(elements, (element) => element.textContent?.trim() ?? "")

const renderSupervisor = async () => {
  renderConfiguracion(ROLES.SUPER_VISOR)
  return findLoadedMain()
}

describe("Configuración del supervisor: cabecera e identidad", () => {
  it("CS-04: la cabecera tiene el antetítulo, el h1 «Mi Perfil y Ajustes de Supervisor», la descripción y la etiqueta «Turno 14:00–22:00 UTC»", async () => {
    const main = await renderSupervisor()

    expect(within(main).getByText(HEADER.overline)).toBeInTheDocument()
    expect(
      within(main).getByRole("heading", { level: 1, name: HEADER.title })
    ).toBeInTheDocument()
    expect(within(main).getByText(HEADER.description)).toBeInTheDocument()
    expect(within(main).getByText(HEADER.shiftTag)).toBeInTheDocument()
  })

  it("CS-04: la cabecera no tiene las etiquetas del tripulante («RAC 121 • Perfil conforme» y «UTC-5 (BOG)»)", async () => {
    const main = await renderSupervisor()

    // Ancla: la cabecera del supervisor ya está pintada.
    expect(
      within(main).getByRole("heading", { level: 1, name: HEADER.title })
    ).toBeInTheDocument()
    expect(within(main).queryByText(/RAC 121/)).toBeNull()
    expect(within(main).queryByText(/UTC-5/)).toBeNull()
    expect(within(main).queryByText(/Portal tripulación/)).toBeNull()
  })

  it("CS-05: I1 tiene la lista rápida del supervisor con sus 4 pares término/valor, en orden", async () => {
    const main = await renderSupervisor()

    const identity = getSectionByHeading(main, SUPERVISOR_NAME)
    const lists = identity.querySelectorAll("dl")
    expect(lists, "una sola lista rápida (dl) en I1").toHaveLength(1)
    expect(textsOf(lists[0].querySelectorAll("dt"))).toEqual(
      QUICK_STATS.map(([term]) => term)
    )
    expect(textsOf(lists[0].querySelectorAll("dd"))).toEqual(
      QUICK_STATS.map(([, value]) => value)
    )
  })

  it("CS-05: I1 no tiene los datos de vuelo del tripulante («CAT III Dual», «Flota Asignada», «Traslado a Base»…)", async () => {
    const main = await renderSupervisor()

    const identity = getSectionByHeading(main, SUPERVISOR_NAME)
    // Ancla: la lista rápida del supervisor ya está pintada.
    expect(identity.querySelector("dl")).not.toBeNull()
    expect(within(main).queryByText(/CAT III/i)).toBeNull()
    for (const term of [
      "Base Principal",
      "Flota Asignada",
      "Horas de Vuelo Totales",
      "Traslado a Base",
    ]) {
      expect(within(main).queryByText(term), `«${term}»`).toBeNull()
    }
  })
})

describe("Configuración del supervisor: formulario", () => {
  it("CS-06: los h2 del formulario van numerados del 1 al 4 con los textos del contrato", async () => {
    const main = await renderSupervisor()

    expect(numberedH2(main)).toEqual(SUPERVISOR_FORM_H2)
  })

  it("CS-07: «2. Información Laboral y Turno» tiene el rótulo «RRHH & Operaciones», 6 campos de solo lectura con sus valores y la nota de RRHH", async () => {
    const main = await renderSupervisor()

    const employment = getSectionByHeading(main, EMPLOYMENT_H2)
    expect(employment).toHaveTextContent("RRHH & Operaciones")
    expect(within(employment).getAllByRole("textbox")).toHaveLength(
      EMPLOYMENT_FIELDS.length
    )
    for (const [label, value] of EMPLOYMENT_FIELDS) {
      const field = within(employment).getByRole("textbox", { name: label })
      expect(field, `«${label}» debe ser de solo lectura`).toHaveAttribute(
        "readonly"
      )
      expect(field, `«${label}»`).toHaveValue(value)
    }
    expect(employment).toHaveTextContent(
      "Información registrada y auditada por Recursos Humanos y Operaciones de Vuelo. Para solicitar modificaciones, contacte a Gestión de Tripulaciones."
    )
  })

  it("CS-08: «3. Notificaciones del Flujo de Reemplazos» tiene el rótulo «Durante tu turno» y 4 interruptores con su título, su descripción y activados", async () => {
    const main = await renderSupervisor()

    const notifications = getSectionByHeading(main, NOTIFICATIONS_H2)
    expect(notifications).toHaveTextContent("Durante tu turno")
    expect(within(main).getAllByRole("switch")).toHaveLength(
      SUPERVISOR_SWITCHES.length
    )
    for (const [name, description] of SUPERVISOR_SWITCHES) {
      const toggle = within(notifications).getByRole("switch", { name })
      expect(toggle, `interruptor «${name}»`).toHaveAccessibleDescription(
        description
      )
      expect(toggle, `interruptor «${name}»`).toBeChecked()
    }
  })

  it("CS-08: al cambiar un interruptor y pulsar «Cancelar», vuelve a su valor", async () => {
    const user = userEvent.setup()
    const main = await renderSupervisor()

    const toggle = within(main).getByRole("switch", {
      name: SUPERVISOR_SWITCHES[0][0],
    })
    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    await user.click(within(main).getByRole("button", { name: "Cancelar" }))

    await waitFor(() => expect(toggle).toBeChecked())
  })

  it("CS-08: al cambiar un interruptor y guardar, aparece el toast y el valor se mantiene", async () => {
    const user = userEvent.setup()
    const main = await renderSupervisor()

    const toggle = within(main).getByRole("switch", {
      name: SUPERVISOR_SWITCHES[1][0],
    })
    await user.click(toggle)
    await user.click(
      within(main).getByRole("button", { name: "Guardar Cambios" })
    )

    await findSuccessToast()
    expect(toggle).not.toBeChecked()
  })
})

describe("Configuración del supervisor: bloques del tripulante ausentes", () => {
  it("CS-09: no ve «Consumo FDP», «Certificado Médico», «Estimación de tiempo al Hub», «Información Laboral y Escalafón» ni «Notificaciones Operativas y Guardias»", async () => {
    const main = await renderSupervisor()

    // Ancla: sus propios F2 y F3 ya están pintados, así que la ausencia no es vacía.
    getSectionByHeading(main, EMPLOYMENT_H2)
    getSectionByHeading(main, NOTIFICATIONS_H2)
    for (const text of [
      /Consumo FDP/i,
      /Certificado Médico/i,
      /Estimación de tiempo al Hub/i,
      /Información Laboral y Escalafón/i,
      /Notificaciones Operativas y Guardias/i,
    ]) {
      expect(main, String(text)).not.toHaveTextContent(text)
    }
    expect(within(main).queryByRole("meter")).toBeNull()
    // Como hoy, F1 no tiene el rótulo de despacho ni el margen de guardia.
    expect(within(main).queryByText("Despacho & OCC")).toBeNull()
    expect(within(main).queryByText(/Dentro de margen guardia/)).toBeNull()
  })
})
