import { screen, waitFor, within } from "@testing-library/react"
import type { HttpHandler } from "msw"
import { expect } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import {
  crewMemberHandler,
  fakeProfileBackend,
  realProfile,
  REAL_USERS,
  US_CITIES,
  type FakeProfileOptions,
  type MyProfileBody,
  type RealAccountKey,
} from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec configuracion-real: una sola pantalla de Configuración para los tres roles.
// Los textos son literales de la spec. La ruta va como literal (PATHS.configuracion).
export const CONFIGURACION_PATH = "/configuracion"

export const H1 = "Mi perfil y configuración"

export const ROLE_LABEL: Record<RealAccountKey, string> = {
  crew: "Tripulante",
  supervisor: "Supervisor",
  admin: "Administrador",
}

export const REAL_KEYS = ["crew", "supervisor", "admin"] as const
export const NON_CREW_KEYS = ["supervisor", "admin"] as const

// Etiquetas de los campos de Contacto. Regex anclada al inicio: el <label> puede llevar
// detrás «(opcional)» o un asterisco aria-hidden. Ampliación A2: la residencia pasa a
// «Ciudad de residencia» y solo admite ciudades del catálogo.
export const FIELD = {
  phone: /^Celular/,
  email: /^Correo/,
  residence: /^Ciudad de residencia/,
} as const

export const SWITCH = {
  replacement: "Asignación de reemplazo",
  reported: "Nuevas ausencias reportadas",
  covered: "Ausencias cubiertas",
} as const

export const NOTIFICATIONS_NOTE =
  "Tus preferencias quedan guardadas. Las alertas dentro de la app llegarán en una próxima versión."
export const EMAIL_NOTE = "Lo cambia un administrador desde Usuarios."
export const EMPLOYMENT_NOTE = "La gestiona un supervisor; pídele los cambios."
// Nota de «Información laboral» del supervisor (A1).
export const SUPERVISOR_EMPLOYMENT_NOTE =
  "La gestiona un administrador; pídele los cambios."
// Error de la pantalla para una ciudad fuera del catálogo (A2).
export const CITY_ERROR = "Elige una ciudad de la lista."
export const SAVE = "Guardar cambios"
export const SAVING = "Guardando…"
export const SAVED_TOAST = "Cambios guardados."
export const DEMO_NOTICE =
  "Cuenta de demostración: inicia sesión con una cuenta real para ver y guardar tus datos."

// CF-01: textos inventados de las pantallas anteriores que no deben volver. Desde la
// ampliación A, «Turno» y «Atlanta» son datos reales del supervisor (CF-09), así que en
// su «Información laboral» se permiten; las opciones del <datalist> de ciudades tampoco
// cuentan (ver textWithout).
export const INVENTED_TEXTS = [
  "FDP",
  "Atlanta",
  "FAA",
  "SMS",
  "RAC 121",
  "Turno",
] as const

// Bloques de la pantalla: <section> con un encabezado que contiene el nombre del bloque
// (puede llevar número delante, como «2. Contacto»).
export const BLOCK = {
  contact: /Contacto/,
  employment: /Información laboral/,
  notifications: /Notificaciones/,
  security: /Seguridad/,
} as const

export const getSectionByHeading = (
  container: HTMLElement,
  name: string | RegExp
) => {
  const heading = within(container).getByRole("heading", { name })
  const section = heading.closest("section")
  expect(
    section,
    `«${String(name)}» debe ir dentro de una <section>`
  ).not.toBeNull()
  return section as HTMLElement
}

export const querySectionByHeading = (
  container: HTMLElement,
  name: string | RegExp
) => within(container).queryByRole("heading", { name })?.closest("section")

// Tarjeta de identidad: la <section> que contiene el nombre completo del store.
export const getIdentityCard = (main: HTMLElement, fullName: string) => {
  const name = within(main).getByText(fullName)
  const card = name.closest("section")
  expect(card, "la tarjeta de identidad debe ser una <section>").not.toBeNull()
  return card as HTMLElement
}

// Iniciales sin foto: como texto o, como en el navbar, en data-initials (CSS).
export const hasInitials = (container: HTMLElement, initials: string) =>
  within(container).queryByText(initials) !== null ||
  container.querySelector(`[data-initials="${initials}"]`) !== null

// Deshabilitado de forma nativa o con aria-disabled (Base UI).
export const isDisabled = (element: HTMLElement) =>
  element.hasAttribute("disabled") ||
  element.getAttribute("aria-disabled") === "true"

// Sesión real (setUser con un id que no es demo) y backend falso con estado. El
// tripulante recibe además GET /crew-members/me, salvo que se pasen otros handlers.
// `first`: handlers que van delante del backend falso (p. ej. un GET /users/me que
// falla o espera desde la primera carga).
export const openRealSession = (
  key: RealAccountKey,
  {
    profile = realProfile(key),
    options,
    crew = key === "crew" ? [crewMemberHandler()] : [],
    first = [],
    path = CONFIGURACION_PATH,
  }: {
    profile?: MyProfileBody
    options?: FakeProfileOptions
    crew?: HttpHandler[]
    first?: HttpHandler[]
    // Otra ruta (p. ej. para probar el navbar fuera de Configuración, CF-12).
    path?: string
  } = {}
) => {
  const backend = fakeProfileBackend(profile, options)
  server.use(...first, ...backend.handlers, ...crew)
  useAuthStore.getState().setUser(REAL_USERS[key])
  const router = renderRoute(path)
  return { backend, router, user: REAL_USERS[key], profile }
}

// Espera la pantalla nueva con los datos del servidor: el h1 y el correo de la cuenta
// en el campo «Correo» (solo lectura).
export const findLoadedMain = async (email: string) => {
  const main = await screen.findByRole("main")
  await within(main).findByRole("heading", { level: 1, name: H1 })
  const field = await within(main).findByLabelText(FIELD.email)
  await waitFor(() => expect(field).toHaveValue(email))
  return main
}

// Texto de un bloque de solo lectura, con el valor de cada campo en su sitio: vale
// tanto si los datos van como texto (dl, p…) como en inputs readonly.
export const readableText = (container: HTMLElement) => {
  const clone = container.cloneNode(true) as HTMLElement
  const originals = container.querySelectorAll("input, textarea")
  clone.querySelectorAll("input, textarea").forEach((field, index) => {
    const value = (originals[index] as HTMLInputElement).value
    field.replaceWith(document.createTextNode(` ${value} `))
  })
  return clone.textContent ?? ""
}

// Valor de un campo sin espacios (el celular se puede mostrar agrupado).
export const compact = (value: string) => value.replace(/\s/g, "")

// Texto visible de un contenedor sin las opciones de los <datalist> (pueden llevar la
// ciudad como texto, p. ej. «Atlanta, GA») ni los elementos excluidos.
export const textWithout = (
  container: HTMLElement,
  excluded: (Element | null | undefined)[] = []
) => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let text = ""
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest("datalist")) continue
    if (excluded.some((element) => element?.contains(node))) continue
    text += node.textContent ?? ""
  }
  return text
}

// <datalist> al que apunta el atributo `list` de un input (A2).
export const datalistOf = (input: HTMLElement) => {
  const id = input.getAttribute("list")
  expect(id, "el campo debe tener el atributo list").toBeTruthy()
  const datalist = id ? document.getElementById(id) : null
  expect(datalist?.tagName, "list debe apuntar a un <datalist>").toBe(
    "DATALIST"
  )
  return datalist as HTMLDataListElement
}

// Valores de las opciones del <datalist> de un input.
export const cityOptions = (input: HTMLElement) =>
  Array.from(datalistOf(input).querySelectorAll("option")).map(
    (option) => option.value
  )

// Espera a que el catálogo de ciudades esté en el <datalist> (antes de guardar: la
// validación de la ciudad depende de él).
export const waitForCities = (input: HTMLElement) =>
  waitFor(() => expect(cityOptions(input)).toEqual([...US_CITIES]))
