import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { getCertifications } from "@/modules/shared/certifications/data/certifications.data"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import {
  CONFIGURACION_PATH,
  findLoadedMain,
  getDefinitionFor,
  getSectionByHeading,
  renderConfiguracion,
  SECURITY_HEADING,
  SWITCH,
} from "./profileTestUtils"

// Pantalla completa con los datos simulados reales de profile.data.ts.
// El h1, el título y la ruta final por rol los cubren AppRouter.test y documentTitle.test
// a través de ROUTE_CASES (CP-01 y CP-03).
// Los bloques propios del supervisor (CS-04 a CS-09) están en ConfiguracionPage.supervisor.test.tsx
// y el panel de contraseña (CS-16 y CS-17), en ConfiguracionPage.password.test.tsx.

const CREW_FORM_H2 = [
  "1. Información de Contacto Operativo (Editable)",
  "2. Información Laboral y Escalafón (Solo Lectura - Registrada)",
  "3. Notificaciones Operativas y Guardias",
  SECURITY_HEADING,
]

// CS-13: tabla local de meses en minúscula (la del aviso I4; F2 conserva sus mayúsculas).
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

// «19 de diciembre de 2026», sin cero inicial. El ISO de solo día se parte a mano:
// new Date(iso) lo leería en UTC y en Bogotá daría el día anterior.
const renewalTextFor = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number)
  return `Próxima renovación programada para el ${day} de ${MONTHS[month - 1]} de ${year} en CEMAE Bogotá.`
}

const URGENT_DESCRIPTION =
  "Aviso inmediato por SMS y notificación Push sonora cuando el Supervisor te asigne un reemplazo, para que lo confirmes dentro del plazo."

const NAME_BY_ROLE = {
  [ROLES.TRIPULANTE]: {
    fullName: "Juan Pablo Navarro",
    position: "Primer Oficial #2287",
  },
  [ROLES.SUPER_VISOR]: {
    fullName: "Camila Restrepo",
    position: "Supervisora OCC",
  },
  [ROLES.SUPER_ADMIN]: {
    fullName: "Admin AirCrew",
    position: "Super Administrador",
  },
}

// h2 numerados del formulario, en orden del DOM.
const numberedH2 = (main: HTMLElement) =>
  within(main)
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent?.trim() ?? "")
    .filter((text) => /^\d+\./.test(text))

describe("Configuración: ruta y protección", () => {
  it("CP-01: PATHS.configuracion es «/configuracion», en la raíz de PATHS", () => {
    expect(PATHS.configuracion).toBe(CONFIGURACION_PATH)
  })

  it("CP-02: sin sesión, /configuracion redirige a /login", async () => {
    useAuthStore.setState({ user: null })

    const router = renderRoute(CONFIGURACION_PATH)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
  })
})

describe("Configuración: identidad desde el store", () => {
  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "CP-06: con un %s, la tarjeta de identidad muestra el nombre completo (h2) y el cargo del store",
    async (role) => {
      const { fullName, position } = NAME_BY_ROLE[role]

      renderConfiguracion(role)

      const main = await findLoadedMain()
      expect(
        within(main).getByRole("heading", { level: 2, name: fullName })
      ).toBeInTheDocument()
      expect(within(main).getByText(position)).toBeInTheDocument()
    }
  )

  it("CP-08: si cambia el usuario del store, el perfil muestra el nuevo nombre y cargo", async () => {
    // LG-08: el store arranca sin sesión.
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    // Mismo id para que los datos simulados del tripulante sigan resolviendo.
    useAuthStore.setState({
      user: {
        ...(user as NonNullable<typeof user>),
        displayName: "Laura",
        fullName: "Laura Gómez Rincón",
        position: "Capitana #1001",
      },
    })

    renderRoute(CONFIGURACION_PATH)

    const main = await findLoadedMain()
    expect(
      within(main).getByRole("heading", {
        level: 2,
        name: "Laura Gómez Rincón",
      })
    ).toBeInTheDocument()
    expect(within(main).getByText("Capitana #1001")).toBeInTheDocument()
    expect(
      within(main).queryByRole("heading", { name: "Juan Pablo Navarro" })
    ).not.toBeInTheDocument()
  })

  it("CP-06: la etiqueta de estado del tripulante es «Activo • ID: AC-2287»", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(main).toHaveTextContent(/Activo • ID: AC-2287/)
  })
})

describe("Configuración: bloques del tripulante", () => {
  it("CP-09: la cabecera tiene antetítulo, h1, descripción y las etiquetas «RAC 121 • Perfil conforme» y «UTC-5 (BOG)»", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(
      within(main).getByText("Expediente personal • Portal tripulación")
    ).toBeInTheDocument()
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Mi Perfil y Ajustes de Tripulante",
      })
    ).toBeInTheDocument()
    expect(main).toHaveTextContent(
      /Gestiona tus datos de contacto operativo, consulta tu información laboral registrada/
    )
    expect(
      within(main).getByText("RAC 121 • Perfil conforme")
    ).toBeInTheDocument()
    expect(within(main).getByText("UTC-5 (BOG)")).toBeInTheDocument()
  })

  it("CP-09 y CP-25: I1 muestra «CAT III Dual» y la lista rápida como pares dt/dd con los valores de la referencia", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(within(main).getByText("CAT III Dual")).toBeInTheDocument()
    expect(getDefinitionFor(main, "Base Principal")).toHaveTextContent(
      "El Dorado, Bogotá (BOG)"
    )
    expect(getDefinitionFor(main, "Flota Asignada")).toHaveTextContent(
      "Airbus A320 / A321"
    )
    expect(getDefinitionFor(main, "Horas de Vuelo Totales")).toHaveTextContent(
      "3,420 hrs"
    )
    expect(getDefinitionFor(main, "Traslado a Base")).toHaveTextContent(
      "25 min (Fontibón)"
    )
  })

  it("CP-09 y CP-25: I3 tiene el h2 «Consumo FDP Mensual» y un meter de 45 de 90 horas, «50.0% utilizado»", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(
      within(main).getByRole("heading", {
        level: 2,
        name: "Consumo FDP Mensual",
      })
    ).toBeInTheDocument()
    const meter = within(main).getByRole("meter", {
      name: "Consumo FDP Mensual",
    })
    expect(meter).toHaveAttribute("aria-valuemin", "0")
    expect(meter).toHaveAttribute("aria-valuemax", "90")
    expect(meter).toHaveAttribute("aria-valuenow", "45")
    expect(meter).toHaveAttribute("aria-valuetext", "45 de 90 horas")
    expect(main).toHaveTextContent(/50\.0% utilizado/i)
  })

  it("CP-09: I4 tiene el h2 «Certificado Médico Clase 1 Vigente»", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(
      within(main).getByRole("heading", {
        level: 2,
        name: "Certificado Médico Clase 1 Vigente",
      })
    ).toBeInTheDocument()
  })

  it("CS-13: la próxima renovación de I4 es la fecha de vencimiento de «Evaluación Médica Clase 1» en Certificaciones, con el mes en minúscula", async () => {
    const certifications = await getCertifications()
    const medical = certifications.find(({ id }) => id === "medical-class-1")
    expect(medical?.expiresAt, "expiresAt de medical-class-1").toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    )

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(main).toHaveTextContent(renewalTextFor(medical?.expiresAt as string))
  })

  it("CP-09 y CP-25: F1 muestra «Despacho & OCC» y la estimación al hub como par dt/dd «25 minutos»", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(within(main).getByText("Despacho & OCC")).toBeInTheDocument()
    expect(
      getDefinitionFor(main, "Estimación de tiempo al Hub (BOG)")
    ).toHaveTextContent("25 minutos")
    expect(main).toHaveTextContent("Dentro de margen guardia (<60m)")
  })

  it("CP-09 y CS-14: F2 tiene 6 campos de solo lectura con label y sus valores (ingreso «5+ años»), y la nota de RRHH", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    const fields: [string, string][] = [
      ["Base Principal", "Bogotá - El Dorado (BOG)"],
      [
        "Cargo Oficial / Escalafón",
        "Primer Oficial / Copiloto de Línea Aérea (F/O Nivel 3)",
      ],
      ["Flota Autorizada", "Airbus A320 / A321 Family"],
      ["Fecha de Ingreso", "12 de Febrero de 2021 (5+ años)"],
      ["Horas Totales de Vuelo", "3,420 hrs (Bitácora certificada)"],
      ["Límite Mensual FDP", "45h / 90h máx legal (50% en margen seguro)"],
    ]
    for (const [label, value] of fields) {
      const field = within(main).getByRole("textbox", { name: label })
      expect(field, `«${label}» debe ser de solo lectura`).toHaveAttribute(
        "readonly"
      )
      expect(field).toHaveValue(value)
    }
    expect(main).toHaveTextContent(
      /Información registrada y auditada por Recursos Humanos y Operaciones de Vuelo\./
    )
  })

  it("CP-09: F3 tiene los tres interruptores de notificaciones", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(within(main).getAllByRole("switch")).toHaveLength(3)
  })

  it("CS-14: «Alertas de Reemplazo Urgente» conserva su título y su descripción se redacta según el flujo de reemplazos", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(
      within(main).getByRole("switch", { name: SWITCH.urgent })
    ).toHaveAccessibleDescription(URGENT_DESCRIPTION)
  })

  it("CP-09: F5 tiene la nota de sincronización y los botones «Cancelar» y «Guardar Cambios»", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(main).toHaveTextContent(
      "Los cambios de contacto se sincronizan instantáneamente con el OCC Bogotá."
    )
    expect(
      within(main).getByRole("button", { name: "Cancelar" })
    ).toHaveAttribute("type", "button")
    expect(
      within(main).getByRole("button", { name: "Guardar Cambios" })
    ).toHaveAttribute("type", "submit")
  })

  it("CP-12 y CS-15: los h2 del formulario del tripulante van numerados del 1 al 4", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    expect(numberedH2(main)).toEqual(CREW_FORM_H2)
  })
})

describe("Configuración: seguridad común (sin MFA ni llave física)", () => {
  const SECURITY_ROLES = [ROLES.TRIPULANTE, ROLES.SUPER_VISOR]

  it.each(SECURITY_ROLES)(
    "CS-01: con un %s, no aparecen «Autenticación Multifactor», «Llave FÍSICA», «YubiKey», «FIDO2» ni «Hardware 2FA», ni el botón «Configurar YubiKey»",
    async (role) => {
      renderConfiguracion(role)

      const main = await findLoadedMain()
      for (const text of [
        /Autenticación Multifactor/i,
        /Llave FÍSICA/i,
        /YubiKey/i,
        /FIDO2/i,
        /Hardware 2FA/i,
      ]) {
        expect(main, String(text)).not.toHaveTextContent(text)
      }
      expect(
        within(main).queryByRole("button", { name: /Configurar YubiKey/i })
      ).toBeNull()
    }
  )

  it.each([
    [ROLES.TRIPULANTE, 42],
    [ROLES.SUPER_VISOR, 18],
  ])(
    "CS-02: con un %s, F4 tiene el h2 «4. Seguridad y Contraseña», su texto, «Último cambio: hace %i días» y el botón «Cambiar contraseña» habilitado",
    async (role, days) => {
      renderConfiguracion(role)

      const main = await findLoadedMain()
      const security = getSectionByHeading(main, SECURITY_HEADING)
      expect(security).toHaveTextContent(
        "Tu contraseña protege el acceso a tus vuelos, tus ausencias y tus datos de contacto."
      )
      expect(security).toHaveTextContent(
        new RegExp(`Último cambio: hace ${days} días`)
      )
      // Panel cerrado: el botón para abrirlo, sin campos.
      expect(
        within(security).queryByLabelText("Contraseña Actual")
      ).not.toBeInTheDocument()
      const change = within(security).getByRole("button", {
        name: "Cambiar contraseña",
      })
      expect(change).toBeEnabled()
      expect(change).not.toHaveAttribute("aria-disabled", "true")
      expect(change).toHaveAttribute("type", "button")
      expect(
        screen.queryByRole("button", {
          name: /Cambiar Contraseña, próximamente/i,
        })
      ).toBeNull()
    }
  )
})

describe("Configuración: estructura accesible y disposición", () => {
  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "CP-25: con un %s, hay un único h1 en la página",
    async (role) => {
      renderConfiguracion(role)

      await findLoadedMain()
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    }
  )

  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "CP-25: con un %s, todos los íconos SVG del contenido llevan aria-hidden",
    async (role) => {
      renderConfiguracion(role)

      const main = await findLoadedMain()
      const icons = Array.from(main.querySelectorAll("svg"))
      expect(icons.length).toBeGreaterThan(0)
      for (const icon of icons) {
        expect(icon).toHaveAttribute("aria-hidden", "true")
      }
    }
  )

  // CP-23, comprobación mínima: jsdom no aplica Tailwind, así que solo se mira la clase del
  // contenedor y el orden del DOM. El resto (F1 y F2 en columnas, barra apilada, 320 px) es manual.
  it("CP-23: el contenido va en un grid lg:grid-cols-3 y la columna izquierda (identidad) va antes del formulario", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    const nameHeading = within(main).getByRole("heading", {
      level: 2,
      name: "Juan Pablo Navarro",
    })
    const form = main.querySelector("form")
    expect(form, "F1 a F5 van dentro de un <form>").not.toBeNull()
    const grid = (form as HTMLElement).closest('[class~="lg:grid-cols-3"]')
    expect(grid, "contenedor con la clase lg:grid-cols-3").not.toBeNull()
    expect(grid).toContainElement(nameHeading)
    expect(
      nameHeading.compareDocumentPosition(form as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      "la tarjeta de identidad debe ir antes del formulario en el DOM"
    ).toBeTruthy()
  })

  it("CP-15 (estructura): F1 a F5 van dentro de un único <form> con noValidate", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    const forms = main.querySelectorAll("form")
    expect(forms).toHaveLength(1)
    const form = forms[0]
    expect(form).toHaveAttribute("novalidate")
    expect(form).toContainElement(
      within(main).getByRole("textbox", {
        name: "Celular de Emergencias / Guardias",
      })
    )
    expect(form).toContainElement(
      within(main).getByRole("heading", {
        level: 2,
        name: SECURITY_HEADING,
      })
    )
    expect(form).toContainElement(
      within(main).getByRole("button", { name: "Guardar Cambios" })
    )
  })
})
