import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse } from "msw"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  ABSENCES_URL,
  absenceError,
  type ApiAbsence,
  attachmentUrl,
  COVERED_ABSENCE,
  mockAbsencesList,
  mockAbsencesListError,
  mockAttachment,
  recordRequests,
  REPORTED_ABSENCE,
} from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { findToast, queryAllToasts } from "../utils/toasts"
import {
  alertsWithText,
  loadingStatuses,
  normalize,
  type User,
} from "./realAbsencesTestUtils"

// Spec ausencias-reales, F4: el tablero de Ausencias del supervisor con sesión real usa
// GET /api/crew/absences (AU-08) y «Ver detalle» abre un popup con GET /absences/:id
// (AU-09). El comprobante se previsualiza dentro del popup y se descarga con un enlace
// (Ampliación A, AU-13 a AU-17; sustituye la descarga de AU-10): desde FE-7 de
// cierre-pendientes, al blob de la vista previa o, sin blob, por apiClient. Con
// showSaveFilePicker, «Descargar» abre «Guardar como», y la vista previa gana modos de
// tamaño y «Abrir en pestaña nueva» (Ampliación B, AU-18 a AU-22). El supervisor demo
// sigue con los datos de ejemplo (AU-11).

const H1 = "Ausencias"
const PENDING = "Por aprobar"
const WAITING = "Esperando confirmación"
// Hoy la columna se llama «Cubiertas»; la spec dice «Cubierta»: se aceptan las dos.
const COVERED = /^Cubiertas? \(1\)$/
const DETAIL = /^Ver detalle/
// Ampliación A: textos fijados por la spec.
const PREVIEW = "Previsualizar"
const LOADING_PREVIEW = "Cargando vista previa…"
const HIDE_PREVIEW = "Ocultar vista previa"
const DOWNLOAD = "Descargar"
const CANNOT_PREVIEW = "No se puede previsualizar este tipo de archivo."
const PREVIEW_ERROR = "No se pudo cargar la vista previa. Intenta de nuevo."
// Ampliación C: el popup usa el patrón de los demás detalles (encabezado fijo con su X).
const DIALOG_TITLE = "Detalle de la ausencia"
const CLOSE_DIALOG = "Cerrar detalle de la ausencia"
const NO_ATTACHMENT = "Sin comprobante adjunto"
const REPORTED_CHIP = "Pendiente de reemplazo"
const COVERED_CHIP = "Cubierta"
// D2 (spec cierre-tareas-johan): la lista real trae todas las ausencias, no solo las
// de hoy ni las del turno.
const EMPTY_BOARD = "No hay ausencias reportadas."
const EYEBROW = "Seguimiento de ausencias · Horas en UTC"
const DESCRIPTION = "Estado del reemplazo de cada ausencia reportada."
const BOARD_ERROR = "No se pudieron cargar las ausencias."

const REPORTED_LABEL = "Incapacidad médica repentina"
const COVERED_LABEL = "Calamidad doméstica o familiar"

const column = (main: HTMLElement, name: string | RegExp) =>
  within(main).getByRole("region", { name })

const card = (container: HTMLElement, crewName: string) =>
  within(container).getByRole("article", { name: crewName })

const openBoard = async () => {
  const user = userEvent.setup()
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  renderRoute(PATHS.superVisor.ausencias)
  await screen.findByRole("heading", { level: 1, name: H1 })
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return { user, main }
}

const openDetail = async (crewName: string) => {
  const { user, main } = await openBoard()
  const article = await within(main).findByRole("article", { name: crewName })
  await user.click(within(article).getByRole("button", { name: DETAIL }))
  const dialog = await screen.findByRole("dialog")
  return { user, main, dialog }
}

// El popup ya cargó su detalle (sin «Cargando…» dentro).
const waitForDetail = async (dialog: HTMLElement, crewName: string) => {
  await waitFor(() => expect(dialog).toHaveTextContent(crewName))
  await waitFor(() => expect(loadingStatuses(dialog)).toHaveLength(0))
}

describe("AU-08: tablero con sesión real", () => {
  it("AU-08: «reported» va a «Por aprobar», «covered» a la columna de cubiertas y «Esperando confirmación» queda vacía", async () => {
    mockAbsencesList()
    const { main } = await openBoard()

    const pending = await within(main).findByRole("region", {
      name: `${PENDING} (1)`,
    })
    expect(within(pending).getAllByRole("article")).toEqual([
      card(pending, REPORTED_ABSENCE.crew_name),
    ])
    const covered = column(main, COVERED)
    expect(within(covered).getAllByRole("article")).toEqual([
      card(covered, COVERED_ABSENCE.crew_name),
    ])
    const waiting = column(main, `${WAITING} (0)`)
    expect(within(waiting).queryAllByRole("article")).toHaveLength(0)
    // Nada de los datos de ejemplo.
    expect(main).not.toHaveTextContent("AV-1288")
  })

  it("AU-08: la tarjeta «reported» muestra el nombre, «Pendiente de reemplazo», «20 nov – 22 nov · 3 días», el cargo, el motivo y quién reportó (hora UTC)", async () => {
    mockAbsencesList()
    const { main } = await openBoard()

    const article = await within(main).findByRole("article", {
      name: REPORTED_ABSENCE.crew_name,
    })
    expect(
      within(article).getByRole("heading", {
        name: REPORTED_ABSENCE.crew_name,
      })
    ).toBeInTheDocument()
    expect(article).toHaveTextContent(REPORTED_CHIP)
    expect(article).toHaveTextContent("20 nov – 22 nov · 3 días")
    expect(article).toHaveTextContent(REPORTED_ABSENCE.position)
    expect(article).toHaveTextContent(REPORTED_LABEL)
    // created_at 2026-11-19T14:30Z; la pantalla dice «Horas en UTC».
    expect(normalize(article.textContent)).toMatch(
      /Reportó: Laura Méndez Ríos · 19 nov.{0,15}14:30/
    )
    expect(within(article).getByRole("button", { name: DETAIL })).toBeEnabled()
  })

  it("AU-08: la tarjeta «covered» muestra «Cubierta», «3 dic – 4 dic · 2 días», el cargo y el motivo", async () => {
    mockAbsencesList()
    const { main } = await openBoard()

    const article = await within(main).findByRole("article", {
      name: COVERED_ABSENCE.crew_name,
    })
    expect(article).toHaveTextContent(COVERED_CHIP)
    expect(article).toHaveTextContent("3 dic – 4 dic · 2 días")
    expect(article).toHaveTextContent(COVERED_ABSENCE.position)
    expect(article).toHaveTextContent(COVERED_LABEL)
    expect(normalize(article.textContent)).toMatch(
      /Reportó: Pedro Gómez Ruiz · 19 nov.{0,15}15:00/
    )
  })

  it("AU-08: las tarjetas reales no tienen las líneas de la IA ni el historial", async () => {
    mockAbsencesList()
    const { main } = await openBoard()
    await within(main).findByRole("article", {
      name: REPORTED_ABSENCE.crew_name,
    })

    expect(
      within(main).queryAllByRole("button", { name: /historial/i })
    ).toHaveLength(0)
    expect(main).not.toHaveTextContent(/La IA propuso/)
    expect(main).not.toHaveTextContent(/Ningún tripulante cumple/)
  })

  it("AU-08: con la lista vacía se muestra el estado vacío del tablero", async () => {
    mockAbsencesList([])
    const { main } = await openBoard()

    expect(await within(main).findByText(EMPTY_BOARD)).toBeInTheDocument()
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
  })

  it("D2: la cabecera y el vacío no hablan de «Hoy» ni del «turno»", async () => {
    mockAbsencesList([])
    const { main } = await openBoard()
    await within(main).findByText(EMPTY_BOARD)

    expect(within(main).getByText(EYEBROW)).toBeInTheDocument()
    expect(within(main).getByText(DESCRIPTION)).toBeInTheDocument()
    expect(main).not.toHaveTextContent(/\bHoy\b/)
    expect(main).not.toHaveTextContent(/turno/i)
  })

  it("AU-08: si GET /api/crew/absences falla, se muestra el error del bloque", async () => {
    mockAbsencesListError()
    useAuthStore.getState().setUser(REAL_USERS.supervisor)
    renderRoute(PATHS.superVisor.ausencias)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(
        within(main)
          .queryAllByRole("alert")
          .filter((alert) => normalize(alert.textContent) === BOARD_ERROR)
      ).toHaveLength(1)
    )
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
  })
})

describe("AU-09: popup de detalle", () => {
  it("AU-09: «Ver detalle» pide GET /api/crew/absences/:id y abre un diálogo con nombre accesible", async () => {
    const detailIds = mockAbsencesList()
    const { dialog } = await openDetail(REPORTED_ABSENCE.crew_name)

    expect(dialog).toHaveAccessibleName()
    await waitForDetail(dialog, REPORTED_ABSENCE.crew_name)
    expect(detailIds.length).toBeGreaterThan(0)
    expect(new Set(detailIds)).toEqual(new Set([REPORTED_ABSENCE.id]))
  })

  it("AU-09: el popup muestra el tripulante (nombre, código y cargo), el motivo, desde, hasta y días, las observaciones, la fecha del reporte y el estado", async () => {
    mockAbsencesList()
    const { dialog } = await openDetail(REPORTED_ABSENCE.crew_name)
    await waitForDetail(dialog, REPORTED_ABSENCE.crew_name)

    for (const text of [
      REPORTED_ABSENCE.crew_name,
      REPORTED_ABSENCE.employee_code,
      REPORTED_ABSENCE.position,
      REPORTED_LABEL,
      "20 nov",
      "22 nov",
      "3 días",
      "Fiebre alta desde la madrugada.",
      REPORTED_CHIP,
    ]) {
      expect(dialog).toHaveTextContent(text)
    }
    // Fecha y hora del reporte, en UTC como el resto de la pantalla.
    expect(normalize(dialog.textContent)).toMatch(/19 nov.{0,15}14:30/)
  })

  it("AU-09: con una ausencia cubierta el popup muestra «Sin observaciones», el estado, el reemplazo y la fecha en que se cubrió", async () => {
    mockAbsencesList()
    const { dialog } = await openDetail(COVERED_ABSENCE.crew_name)
    await waitForDetail(dialog, COVERED_ABSENCE.crew_name)

    for (const text of [
      COVERED_ABSENCE.employee_code,
      COVERED_LABEL,
      "3 dic",
      "4 dic",
      "2 días",
      "Sin observaciones",
      COVERED_CHIP,
      "Sofía Herrera Paz",
    ]) {
      expect(dialog).toHaveTextContent(text)
    }
    // covered_at 2026-11-19T18:00Z.
    expect(normalize(dialog.textContent)).toMatch(/19 nov.{0,15}18:00/)
  })

  it("AU-09: mientras carga el detalle, el popup muestra un role=status «Cargando…» propio", async () => {
    // El detalle no responde hasta que termina el test (compuerta), así se ve la carga.
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    onTestFinished(() => release())
    mockAbsencesList(undefined, async () => {
      await gate
      return absenceError(500, "Error interno")
    })
    const { dialog } = await openDetail(REPORTED_ABSENCE.crew_name)

    await waitFor(() => expect(loadingStatuses(dialog)).toHaveLength(1))
    expect(within(dialog).queryByRole("button", { name: PREVIEW })).toBeNull()
  })

  it("AU-09: si falla el detalle, el popup muestra un role=alert propio y el tablero sigue igual", async () => {
    mockAbsencesList(undefined, () => absenceError(500, "Error interno"))
    const { main, dialog } = await openDetail(REPORTED_ABSENCE.crew_name)

    await waitFor(() =>
      expect(within(dialog).getAllByRole("alert").length).toBeGreaterThan(0)
    )
    expect(dialog).not.toHaveTextContent("Error interno")
    expect(within(dialog).queryByRole("button", { name: PREVIEW })).toBeNull()
    // El error es del popup, no del tablero.
    expect(main).not.toHaveTextContent(BOARD_ERROR)
  })
})

// Ampliación C: encabezado fijo (título y X) y cuerpo con su propio desplazamiento.
describe("AU-23 y AU-24: popup con encabezado fijo", () => {
  it("AU-23: el popup se llama «Detalle de la ausencia» y la X «Cerrar detalle de la ausencia» lo cierra", async () => {
    mockAbsencesList()
    const { user, dialog } = await openDetail(REPORTED_ABSENCE.crew_name)

    expect(dialog).toHaveAccessibleName(DIALOG_TITLE)

    await user.click(within(dialog).getByRole("button", { name: CLOSE_DIALOG }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("AU-24: el título y la X quedan fuera del contenedor con scroll (.overflow-y-auto); los datos y el comprobante, dentro", async () => {
    mockAbsencesList()
    const { dialog } = await openDetail(REPORTED_ABSENCE.crew_name)
    await waitForDetail(dialog, REPORTED_ABSENCE.crew_name)

    const scrollers = dialog.querySelectorAll(".overflow-y-auto")
    expect(scrollers).toHaveLength(1)
    const body = scrollers[0] as HTMLElement

    const title = within(dialog).getByRole("heading", { name: DIALOG_TITLE })
    const close = within(dialog).getByRole("button", { name: CLOSE_DIALOG })
    expect(body).not.toContainElement(title)
    expect(body).not.toContainElement(close)
    expect(body).toContainElement(within(dialog).getByText("Motivo"))
    expect(body).toContainElement(
      within(dialog).getByRole("button", { name: PREVIEW })
    )
  })
})

// Ampliación A: el bloque «Comprobante» solo tiene «Previsualizar». La vista previa se
// muestra dentro del popup y, junto a ella, el enlace «Descargar» (al blob ya cargado
// desde FE-7; no crea blobs nuevos).
describe("AU-13 a AU-17: comprobante con vista previa", () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  // Una URL distinta por llamada: con StrictMode (renderRoute) un efecto puede crear,
  // liberar y volver a crear la URL al montar. Lo que importa es la URL que se muestra.
  let blobCount = 0
  const createObjectURL = vi.fn((blob: Blob) => {
    blobCount += 1
    return `blob:comprobante-${blobCount}-${blob.size}`
  })
  const revokeObjectURL = vi.fn()
  const createdUrls = () =>
    createObjectURL.mock.results.map((result) => String(result.value))
  // Clics programáticos sobre un <a> (la descarga antigua con blob los hacía).
  let programmaticClicks: string[] = []

  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  const PDF = new TextEncoder().encode("%PDF-1.4 prueba")

  // La misma ausencia con otro comprobante: el tipo se toma del detalle.
  const withAttachment = (fileName: string, mimeType: string) => ({
    ...REPORTED_ABSENCE,
    attachment: { file_name: fileName, mime_type: mimeType, size_bytes: 2048 },
  })
  const PDF_ABSENCE = REPORTED_ABSENCE
  const PNG_ABSENCE = withAttachment("incapacidad-laura.png", "image/png")
  const JPG_ABSENCE = withAttachment("incapacidad-laura.jpg", "image/jpeg")
  // Supuesto: image/gif sirve de tipo no previsualizable (no es PDF, PNG ni JPG).
  const GIF_ABSENCE = withAttachment("incapacidad-laura.gif", "image/gif")

  const fileResponse = (body: Uint8Array, mimeType: string) => () =>
    new HttpResponse(body, { headers: { "Content-Type": mimeType } })

  // Abre el detalle ya cargado de una ausencia (con nombre: es el de su tarjeta) con el
  // comprobante dado.
  const openAttachment = async (
    absence: ApiAbsence & { crew_name: string },
    respond: () => Response | Promise<Response> = fileResponse(
      PDF,
      "application/pdf"
    )
  ) => {
    mockAbsencesList([absence])
    const attachmentIds = mockAttachment(respond)
    const opened = await openDetail(absence.crew_name)
    await waitForDetail(opened.dialog, absence.crew_name)
    return { ...opened, attachmentIds }
  }

  // Síncrono a propósito: si no existe, el test falla en el acto y no espera 3 s.
  const previewButton = (dialog: HTMLElement) =>
    within(dialog).getByRole("button", { name: PREVIEW })

  // Abre la vista previa y espera a que termine de cargar.
  const openPreview = async (user: User, dialog: HTMLElement) => {
    await user.click(previewButton(dialog))
    return within(dialog).findByRole("button", { name: HIDE_PREVIEW })
  }

  const downloadLinks = (dialog: HTMLElement) => [
    ...within(dialog).queryAllByRole("link", { name: /descargar/i }),
    ...within(dialog).queryAllByRole("button", { name: /descargar/i }),
  ]

  // Registra si la app canceló el último clic y después lo cancela aquí, porque jsdom no
  // implementa la navegación. React atiende el clic antes (en su raíz).
  const trackNavigation = () => {
    const state: { preventedByApp: boolean | null } = { preventedByApp: null }
    const stopNavigation = (event: Event) => {
      state.preventedByApp = event.defaultPrevented
      event.preventDefault()
    }
    document.addEventListener("click", stopNavigation)
    onTestFinished(() => document.removeEventListener("click", stopNavigation))
    return state
  }

  beforeEach(() => {
    // AU-20: jsdom no tiene showSaveFilePicker; ningún test lo deja definido.
    Reflect.deleteProperty(window, "showSaveFilePicker")
    programmaticClicks = []
    blobCount = 0
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    // jsdom no implementa createObjectURL ni revokeObjectURL.
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      programmaticClicks.push(this.getAttribute("href") ?? "")
    })
  })

  afterEach(() => {
    // Este afterEach corre antes que el de setup.ts: se desmonta aquí, mientras
    // revokeObjectURL sigue simulado, por si la vista previa quedó abierta y se libera
    // al desmontar (el de jsdom no existe y lanzaría).
    cleanup()
    vi.restoreAllMocks()
    Object.defineProperty(URL, "createObjectURL", {
      value: originalCreate,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      value: originalRevoke,
      configurable: true,
      writable: true,
    })
  })

  it("AU-13: con comprobante, el bloque muestra el nombre, el tamaño y un único botón «Previsualizar», sin ningún «Descargar»", async () => {
    const { dialog, attachmentIds } = await openAttachment(PDF_ABSENCE)

    expect(dialog).toHaveTextContent("incapacidad-laura.pdf")
    // 2048 bytes: supuesto de formato en KB («2 KB», «2,0 KB» o «2.0 KB»).
    expect(normalize(dialog.textContent)).toMatch(/\b2([.,]0)?\s?KB\b/i)
    expect(dialog).not.toHaveTextContent(NO_ATTACHMENT)
    // Aparte de la X del popup, el único botón es «Previsualizar».
    const buttons = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label") !== CLOSE_DIALOG)
    expect(buttons).toEqual([previewButton(dialog)])
    expect(previewButton(dialog)).toBeEnabled()
    expect(downloadLinks(dialog)).toEqual([])
    expect(within(dialog).queryAllByRole("link")).toEqual([])
    // Nada se pide hasta pulsar «Previsualizar».
    expect(attachmentIds).toEqual([])
  })

  // FE-7 (F11c, cierre-pendientes) sustituye el href del gateway de AU-13: con el blob ya
  // cargado, el enlace lo descarga sin pedir nada (con la sesión vencida, el gateway daría
  // su JSON del 401 en la pestaña).
  it("AU-13, AU-20 y FE-7: sin showSaveFilePicker, con la vista previa abierta el enlace «Descargar» apunta a la URL del blob mostrada, con download = file_name", async () => {
    expect("showSaveFilePicker" in window).toBe(false)
    const { user, dialog } = await openAttachment(PDF_ABSENCE)

    await openPreview(user, dialog)

    const shown = within(dialog)
      .getByTitle("Comprobante: incapacidad-laura.pdf")
      .getAttribute("src")
    expect(createdUrls()).toContain(shown)
    const link = within(dialog).getByRole("link", { name: DOWNLOAD })
    expect(link).toHaveAttribute("href", shown)
    expect(link).toHaveAttribute("download", "incapacidad-laura.pdf")
  })

  it("AU-13 y AU-20: sin showSaveFilePicker, pulsar «Descargar» no crea blobs ni pide el adjunto por JavaScript: la descarga es la del navegador", async () => {
    expect("showSaveFilePicker" in window).toBe(false)
    const { user, dialog, attachmentIds } = await openAttachment(PDF_ABSENCE)
    await openPreview(user, dialog)
    // La vista previa ya usó su blob: se cuenta lo que pase a partir de aquí.
    expect(createObjectURL).toHaveBeenCalled()
    const urlsBefore = createObjectURL.mock.calls.length
    const requestsBefore = attachmentIds.length
    const link = within(dialog).getByRole("link", { name: DOWNLOAD })
    const navigation = trackNavigation()

    await user.click(link)
    // Una descarga por JavaScript pediría el adjunto después del clic: margen breve para
    // que, si existe, llegue a contarse.
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(navigation.preventedByApp).toBe(false)
    expect(createObjectURL).toHaveBeenCalledTimes(urlsBefore)
    expect(attachmentIds).toHaveLength(requestsBefore)
    expect(programmaticClicks).toEqual([])
  })

  it.each([
    { kind: "PNG", absence: PNG_ABSENCE, body: PNG, mime: "image/png" },
    { kind: "JPG", absence: JPG_ABSENCE, body: JPG, mime: "image/jpeg" },
  ])(
    "AU-14: con un $kind, «Previsualizar» pide GET /attachment y muestra un <img> con alt «Comprobante: {nombre}» y la URL del blob",
    async ({ absence, body, mime }) => {
      const { user, dialog, attachmentIds } = await openAttachment(
        absence,
        fileResponse(body, mime)
      )

      await openPreview(user, dialog)

      expect(new Set(attachmentIds)).toEqual(new Set([absence.id]))
      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      const image = within(dialog).getByRole("img", {
        name: `Comprobante: ${absence.attachment?.file_name}`,
      })
      expect(image.tagName).toBe("IMG")
      expect(createdUrls()).toContain(image.getAttribute("src"))
      expect(dialog.querySelector("iframe")).toBeNull()
    }
  )

  it("AU-14: con un PDF, «Previsualizar» pide GET /attachment y muestra un <iframe> con title «Comprobante: {nombre}» y la URL del blob", async () => {
    const { user, dialog, attachmentIds } = await openAttachment(PDF_ABSENCE)

    await openPreview(user, dialog)

    expect(new Set(attachmentIds)).toEqual(new Set([PDF_ABSENCE.id]))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    const frame = within(dialog).getByTitle(
      "Comprobante: incapacidad-laura.pdf"
    )
    expect(frame.tagName).toBe("IFRAME")
    expect(createdUrls()).toContain(frame.getAttribute("src"))
    expect(within(dialog).queryAllByRole("img")).toEqual([])
  })

  it("AU-14: mientras carga, el botón dice «Cargando vista previa…» y al terminar «Ocultar vista previa»", async () => {
    // El adjunto no responde hasta soltar la compuerta, así se ve la carga.
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    onTestFinished(() => release())
    const { user, dialog } = await openAttachment(PDF_ABSENCE, async () => {
      await gate
      return fileResponse(PDF, "application/pdf")()
    })

    await user.click(previewButton(dialog))

    expect(
      await within(dialog).findByRole("button", { name: LOADING_PREVIEW })
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: PREVIEW })).toBeNull()
    expect(within(dialog).queryByTitle(/^Comprobante:/)).toBeNull()

    release()

    expect(
      await within(dialog).findByRole("button", { name: HIDE_PREVIEW })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByTitle("Comprobante: incapacidad-laura.pdf")
    ).toBeInTheDocument()
  })

  it("Tipo no previsualizable: con image/gif la vista previa dice «No se puede previsualizar este tipo de archivo.» y ofrece el enlace «Descargar»", async () => {
    const { user, dialog } = await openAttachment(
      GIF_ABSENCE,
      fileResponse(PNG, "image/gif")
    )

    await user.click(previewButton(dialog))

    await waitFor(() => expect(dialog).toHaveTextContent(CANNOT_PREVIEW))
    const link = within(dialog).getByRole("link", { name: DOWNLOAD })
    expect(link.getAttribute("href")).toBe(attachmentUrl(GIF_ABSENCE.id))
    expect(within(dialog).queryAllByRole("img")).toEqual([])
    expect(dialog.querySelector("iframe")).toBeNull()
  })

  it("AU-15: «Ocultar vista previa» quita el contenido y el enlace «Descargar» y libera la URL del blob", async () => {
    const { user, dialog } = await openAttachment(
      PNG_ABSENCE,
      fileResponse(PNG, "image/png")
    )
    const hide = await openPreview(user, dialog)
    const name = "Comprobante: incapacidad-laura.png"
    const shown = within(dialog).getByRole("img", { name }).getAttribute("src")
    expect(createdUrls()).toContain(shown)
    // Con la vista previa a la vista, su URL sigue viva.
    expect(revokeObjectURL).not.toHaveBeenCalledWith(shown)

    await user.click(hide)

    expect(within(dialog).queryByRole("img", { name })).toBeNull()
    expect(downloadLinks(dialog)).toEqual([])
    expect(revokeObjectURL).toHaveBeenCalledWith(shown)
    expect(previewButton(dialog)).toBeInTheDocument()
  })

  it("AU-15: cerrar el popup con la vista previa abierta libera la URL del blob", async () => {
    const { user, dialog } = await openAttachment(PDF_ABSENCE)
    await openPreview(user, dialog)
    const shown = within(dialog)
      .getByTitle("Comprobante: incapacidad-laura.pdf")
      .getAttribute("src")
    expect(createdUrls()).toContain(shown)
    expect(revokeObjectURL).not.toHaveBeenCalledWith(shown)

    await user.click(within(dialog).getByRole("button", { name: CLOSE_DIALOG }))

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith(shown))
  })

  it.each([
    { kind: "un 500", respond: () => absenceError(500, "Error interno") },
    { kind: "un error de red", respond: () => HttpResponse.error() },
  ])(
    "AU-16: si la vista previa falla con $kind, aparece en el popup el role=alert «No se pudo cargar la vista previa. Intenta de nuevo.»",
    async ({ respond }) => {
      const { user, main, dialog, attachmentIds } = await openAttachment(
        PDF_ABSENCE,
        respond
      )

      await user.click(previewButton(dialog))

      await waitFor(() =>
        expect(alertsWithText(dialog, PREVIEW_ERROR)).toHaveLength(1)
      )
      expect(new Set(attachmentIds)).toEqual(new Set([PDF_ABSENCE.id]))
      expect(dialog).not.toHaveTextContent("Error interno")
      expect(within(dialog).queryByTitle(/^Comprobante:/)).toBeNull()
      expect(createObjectURL).not.toHaveBeenCalled()
      expect(main).not.toHaveTextContent(BOARD_ERROR)
    }
  )

  it("AU-17: sin comprobante solo aparece «Sin comprobante adjunto», sin «Previsualizar», sin «Descargar» y sin pedir el adjunto", async () => {
    mockAbsencesList()
    const requests = recordRequests()
    const { dialog } = await openDetail(COVERED_ABSENCE.crew_name)
    await waitForDetail(dialog, COVERED_ABSENCE.crew_name)

    expect(dialog).toHaveTextContent(NO_ATTACHMENT)
    expect(within(dialog).queryByRole("button", { name: PREVIEW })).toBeNull()
    expect(downloadLinks(dialog)).toEqual([])
    expect(
      requests.filter((request) => request.endsWith("/attachment"))
    ).toEqual([])
  })

  // Ampliación B: «Descargar» con «Guardar como» si existe showSaveFilePicker, y modos de
  // tamaño de la imagen y «Abrir en pestaña nueva» en la vista previa.
  describe("AU-18 a AU-22: «Guardar como» y calidad de la vista previa", () => {
    const SAVED = "Archivo guardado."
    const SAVE_ERROR = "No se pudo guardar el archivo. Intenta de nuevo."
    const ACTUAL_SIZE = "Ver tamaño real"
    const FIT_WIDTH = "Ajustar al ancho"
    const NEW_TAB = "Abrir en pestaña nueva"

    // Simula window.showSaveFilePicker (jsdom no lo tiene) y lo borra al terminar. Se
    // instala antes de abrir el popup: la app puede decidir enlace o botón al renderizar.
    const installSavePicker = (
      result?: { rejectWith: unknown } | { failWrite: unknown }
    ) => {
      const write = vi.fn()
      const close = vi.fn()
      if (result && "failWrite" in result)
        write.mockRejectedValue(result.failWrite)
      const createWritable = vi.fn().mockResolvedValue({ write, close })
      const picker = vi.fn()
      if (result && "rejectWith" in result)
        picker.mockRejectedValue(result.rejectWith)
      else picker.mockResolvedValue({ createWritable })
      Object.defineProperty(window, "showSaveFilePicker", {
        value: picker,
        configurable: true,
        writable: true,
      })
      onTestFinished(() => {
        Reflect.deleteProperty(window, "showSaveFilePicker")
      })
      return { picker, createWritable, write, close }
    }

    // Con el picker, «Descargar» puede ser enlace o botón (el contrato no fija el rol),
    // pero solo uno.
    const downloadControl = (dialog: HTMLElement) => {
      const controls = downloadLinks(dialog)
      expect(controls).toHaveLength(1)
      return controls[0]
    }

    // Pulsa «Descargar» y comprueba que no hubo navegación: o no es un <a>, o la app
    // canceló el clic.
    const clickDownload = async (user: User, dialog: HTMLElement) => {
      const control = downloadControl(dialog)
      const navigation = trackNavigation()
      await user.click(control)
      if (control.tagName === "A")
        expect(
          navigation.preventedByApp,
          "con showSaveFilePicker, el enlace «Descargar» no debe navegar"
        ).toBe(true)
    }

    // El texto «Archivo guardado.» es persistente: sin toast ni región viva.
    const savedTexts = (dialog: HTMLElement) =>
      within(dialog).queryAllByText(SAVED)

    it("AU-18: con showSaveFilePicker, «Descargar» lo llama una vez con suggestedName = file_name, escribe el blob (write y luego close) y muestra «Archivo guardado.»", async () => {
      const { picker, write, close } = installSavePicker()
      const { user, dialog } = await openAttachment(PDF_ABSENCE)
      await openPreview(user, dialog)

      await clickDownload(user, dialog)

      expect(await within(dialog).findByText(SAVED)).toBeInTheDocument()
      expect(picker).toHaveBeenCalledTimes(1)
      expect(picker).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: PDF_ABSENCE.attachment?.file_name,
        })
      )
      expect(write).toHaveBeenCalledTimes(1)
      expect(write).toHaveBeenCalledWith(expect.any(Blob))
      // El blob que se escribe es el archivo que cargó la vista previa.
      expect((write.mock.calls[0][0] as Blob).size).toBe(PDF.byteLength)
      expect(close).toHaveBeenCalledTimes(1)
      expect(write.mock.invocationCallOrder[0]).toBeLessThan(
        close.mock.invocationCallOrder[0]
      )
    })

    it("AU-18: la ventana «Guardar como» se abre en el mismo clic, antes de cualquier await (para no perder el gesto del usuario)", async () => {
      const { picker } = installSavePicker()
      const { user, dialog } = await openAttachment(PDF_ABSENCE)
      await openPreview(user, dialog)
      const control = downloadControl(dialog)
      // Este listener corre al final del mismo clic, después del de React (en su raíz).
      let callsDuringClick: number | null = null
      const duringClick = () => {
        callsDuringClick = picker.mock.calls.length
      }
      document.addEventListener("click", duringClick)
      onTestFinished(() => document.removeEventListener("click", duringClick))
      trackNavigation()

      await user.click(control)

      expect(callsDuringClick).toBe(1)
      await within(dialog).findByText(SAVED)
    })

    it("AU-18: guardar no navega, no crea blobs nuevos ni vuelve a pedir el adjunto, y «Archivo guardado.» no está en un toast ni en una región viva", async () => {
      installSavePicker()
      const { user, dialog, attachmentIds } = await openAttachment(PDF_ABSENCE)
      await openPreview(user, dialog)
      expect(createObjectURL).toHaveBeenCalled()
      const urlsBefore = createObjectURL.mock.calls.length
      const requestsBefore = attachmentIds.length

      await clickDownload(user, dialog)

      const saved = await within(dialog).findByText(SAVED)
      expect(createObjectURL).toHaveBeenCalledTimes(urlsBefore)
      expect(attachmentIds).toHaveLength(requestsBefore)
      expect(programmaticClicks).toEqual([])
      expect(
        saved.closest('[role="status"], [role="alert"], [aria-live]')
      ).toBeNull()
      expect(document.querySelector("[data-sonner-toast]")).toBeNull()
    })

    it("AU-19: si el usuario cancela «Guardar como» (AbortError), no aparece ni aviso ni «Archivo guardado.»", async () => {
      const { picker } = installSavePicker({
        rejectWith: new DOMException("x", "AbortError"),
      })
      const { user, dialog } = await openAttachment(PDF_ABSENCE)
      await openPreview(user, dialog)

      await clickDownload(user, dialog)

      // Primero se confirma que se intentó guardar; luego, margen para que el rechazo
      // llegue a procesarse.
      await waitFor(() => expect(picker).toHaveBeenCalledTimes(1))
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(within(dialog).queryAllByRole("alert")).toEqual([])
      expect(savedTexts(dialog)).toEqual([])
    })

    it.each([
      {
        kind: "la ventana «Guardar como» falla",
        result: { rejectWith: new DOMException("x", "NotAllowedError") },
      },
      {
        kind: "falla la escritura del archivo",
        result: { failWrite: new Error("x") },
      },
    ])(
      "AU-19: si $kind por otra razón, aparece en el popup el role=alert «No se pudo guardar el archivo. Intenta de nuevo.»",
      async ({ result }) => {
        const { picker } = installSavePicker(result)
        const { user, dialog } = await openAttachment(PDF_ABSENCE)
        await openPreview(user, dialog)

        await clickDownload(user, dialog)

        await waitFor(() =>
          expect(alertsWithText(dialog, SAVE_ERROR)).toHaveLength(1)
        )
        expect(picker).toHaveBeenCalledTimes(1)
        expect(savedTexts(dialog)).toEqual([])
      }
    )

    it("AU-21: con una imagen, «Ver tamaño real» pasa la imagen a data-zoom=actual y cambia a «Ajustar al ancho», que la devuelve a data-zoom=fit", async () => {
      const { user, dialog } = await openAttachment(
        PNG_ABSENCE,
        fileResponse(PNG, "image/png")
      )
      await openPreview(user, dialog)
      const name = "Comprobante: incapacidad-laura.png"
      expect(within(dialog).getByRole("img", { name })).toHaveAttribute(
        "data-zoom",
        "fit"
      )

      await user.click(
        within(dialog).getByRole("button", { name: ACTUAL_SIZE })
      )

      expect(within(dialog).getByRole("img", { name })).toHaveAttribute(
        "data-zoom",
        "actual"
      )
      expect(
        within(dialog).queryByRole("button", { name: ACTUAL_SIZE })
      ).toBeNull()

      await user.click(within(dialog).getByRole("button", { name: FIT_WIDTH }))

      expect(within(dialog).getByRole("img", { name })).toHaveAttribute(
        "data-zoom",
        "fit"
      )
      expect(
        within(dialog).getByRole("button", { name: ACTUAL_SIZE })
      ).toBeInTheDocument()
    })

    it("AU-21: con una imagen, «Abrir en pestaña nueva» es un enlace a la URL del blob mostrada, con target=_blank y rel con noopener", async () => {
      const { user, dialog } = await openAttachment(
        PNG_ABSENCE,
        fileResponse(PNG, "image/png")
      )
      await openPreview(user, dialog)
      const shown = within(dialog)
        .getByRole("img", { name: "Comprobante: incapacidad-laura.png" })
        .getAttribute("src")
      expect(createdUrls()).toContain(shown)

      const link = within(dialog).getByRole("link", { name: NEW_TAB })

      expect(link).toHaveAttribute("href", shown)
      expect(link).toHaveAttribute("target", "_blank")
      expect(link.getAttribute("rel")).toMatch(/\bnoopener\b/)
    })

    it("AU-22: con un PDF no aparece «Ver tamaño real», pero sí el enlace «Abrir en pestaña nueva» a la URL del blob, con target=_blank y rel con noopener", async () => {
      const { user, dialog } = await openAttachment(PDF_ABSENCE)
      await openPreview(user, dialog)
      const shown = within(dialog)
        .getByTitle("Comprobante: incapacidad-laura.pdf")
        .getAttribute("src")
      expect(createdUrls()).toContain(shown)

      const link = within(dialog).getByRole("link", { name: NEW_TAB })

      expect(link).toHaveAttribute("href", shown)
      expect(link).toHaveAttribute("target", "_blank")
      expect(link.getAttribute("rel")).toMatch(/\bnoopener\b/)
      expect(
        within(dialog).queryByRole("button", { name: ACTUAL_SIZE })
      ).toBeNull()
      expect(
        within(dialog).queryByRole("button", { name: FIT_WIDTH })
      ).toBeNull()
    })

    // FE-7 de cierre-pendientes: «Ver tamaño real» centra la imagen (F11a) y la descarga
    // sin blob pasa por apiClient, así un 401 cierra la sesión con su toast (F11c).
    describe("FE-7: tamaño real centrado y descarga con la sesión vencida", () => {
      const EXPIRED = "Tu sesión venció. Inicia sesión de nuevo."
      const IMAGE_NAME = "Comprobante: incapacidad-laura.png"
      // Nombre con tilde: se guarda tal cual, sin pasar por el Content-Disposition.
      const GIF_NAME = "comprobante-médico.gif"
      const ACCENTED_GIF = withAttachment(GIF_NAME, "image/gif")

      // jsdom no calcula el layout: el contenido mide 2000×1600 y el área visible
      // 500×400 (ejes distintos para detectar un cambio de eje). Centro: 750 y 600.
      const stubLayout = () => {
        vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(2000)
        vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(500)
        vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(1600)
        vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(400)
      }
      // El <img> es un nodo nuevo al cambiar de modo: se simula en el prototipo.
      const stubImageComplete = (complete: boolean) =>
        vi
          .spyOn(HTMLImageElement.prototype, "complete", "get")
          .mockReturnValue(complete)

      const openImageActual = async () => {
        const opened = await openAttachment(
          PNG_ABSENCE,
          fileResponse(PNG, "image/png")
        )
        await openPreview(opened.user, opened.dialog)
        await opened.user.click(
          within(opened.dialog).getByRole("button", { name: ACTUAL_SIZE })
        )
        const region = within(opened.dialog).getByRole("region", {
          name: "Comprobante a tamaño real",
        })
        return { ...opened, region }
      }

      it("F11a: si la imagen ya está cargada, «Ver tamaño real» centra el scroll del área en los dos ejes de inmediato", async () => {
        stubLayout()
        stubImageComplete(true)

        const { region } = await openImageActual()

        expect(region.scrollLeft).toBe(750)
        expect(region.scrollTop).toBe(600)
      })

      it("F11a: si la imagen aún no ha cargado, el scroll se centra cuando termina de cargar", async () => {
        stubLayout()
        stubImageComplete(false)

        const { region } = await openImageActual()
        expect(region.scrollLeft).toBe(0)
        expect(region.scrollTop).toBe(0)

        fireEvent.load(within(region).getByRole("img", { name: IMAGE_NAME }))

        expect(region.scrollLeft).toBe(750)
        expect(region.scrollTop).toBe(600)
      })

      it("F11a: una vez centrado, otro render (guardar el archivo) no vuelve a mover el scroll del usuario", async () => {
        installSavePicker()
        stubLayout()
        stubImageComplete(true)
        const { user, dialog, region } = await openImageActual()
        expect(region.scrollLeft).toBe(750)
        region.scrollLeft = 120
        region.scrollTop = 40

        await clickDownload(user, dialog)
        await within(dialog).findByText(SAVED)

        expect(region.scrollLeft).toBe(120)
        expect(region.scrollTop).toBe(40)
      })

      it("F11c: sin blob (tipo no previsualizable) y sin showSaveFilePicker, «Descargar» sigue siendo un enlace, pide el adjunto con apiClient y lo descarga como blob con el nombre de la ausencia", async () => {
        const clicks: { href: string; download: string }[] = []
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
          function (this: HTMLAnchorElement) {
            clicks.push({
              href: this.getAttribute("href") ?? "",
              download: this.download,
            })
          }
        )
        const { user, dialog, attachmentIds } = await openAttachment(
          ACCENTED_GIF,
          fileResponse(PNG, "image/gif")
        )
        await user.click(previewButton(dialog))
        await waitFor(() => expect(dialog).toHaveTextContent(CANNOT_PREVIEW))
        expect(attachmentIds).toEqual([])
        expect(createObjectURL).not.toHaveBeenCalled()
        const link = within(dialog).getByRole("link", { name: DOWNLOAD })
        const navigation = trackNavigation()

        await user.click(link)

        expect(navigation.preventedByApp).toBe(true)
        await waitFor(() => expect(clicks).toHaveLength(1))
        expect(attachmentIds).toEqual([ACCENTED_GIF.id])
        expect(createObjectURL).toHaveBeenCalledTimes(1)
        const blob = createObjectURL.mock.calls[0][0]
        expect(blob.size).toBe(PNG.byteLength)
        expect(clicks[0]).toEqual({
          href: createdUrls()[0],
          download: GIF_NAME,
        })
        await waitFor(() =>
          expect(revokeObjectURL).toHaveBeenCalledWith(createdUrls()[0])
        )
        expect(within(dialog).queryAllByRole("alert")).toEqual([])
      })

      it("F11c: con la sesión vencida, «Descargar» sin blob no navega al gateway: el 401 cierra la sesión con un único toast «Tu sesión venció…»", async () => {
        const { user, dialog, attachmentIds } = await openAttachment(
          ACCENTED_GIF,
          () => absenceError(401, "Token vencido")
        )
        await user.click(previewButton(dialog))
        await waitFor(() => expect(dialog).toHaveTextContent(CANNOT_PREVIEW))
        const navigation = trackNavigation()

        await user.click(within(dialog).getByRole("link", { name: DOWNLOAD }))

        expect(navigation.preventedByApp).toBe(true)
        await waitFor(() => expect(useAuthStore.getState().user).toBeNull())
        expect(await findToast(EXPIRED)).toHaveAttribute("data-type", "error")
        await new Promise((resolve) => setTimeout(resolve, 100))
        expect(queryAllToasts()).toHaveLength(1)
        expect(attachmentIds).toEqual([ACCENTED_GIF.id])
        expect(createObjectURL).not.toHaveBeenCalled()
        expect(programmaticClicks).toEqual([])
        expect(screen.queryByText("Token vencido")).toBeNull()
      })

      it("F11c: si la descarga sin blob falla (500), aparece en el popup el role=alert «No se pudo guardar el archivo. Intenta de nuevo.»", async () => {
        const { user, dialog } = await openAttachment(ACCENTED_GIF, () =>
          absenceError(500, "Error interno")
        )
        await user.click(previewButton(dialog))
        await waitFor(() => expect(dialog).toHaveTextContent(CANNOT_PREVIEW))
        trackNavigation()

        await user.click(within(dialog).getByRole("link", { name: DOWNLOAD }))

        await waitFor(() =>
          expect(alertsWithText(dialog, SAVE_ERROR)).toHaveLength(1)
        )
        expect(dialog).not.toHaveTextContent("Error interno")
        expect(programmaticClicks).toEqual([])
      })

      it("F11c: sin blob y con showSaveFilePicker, la ventana se abre en el mismo clic (antes de pedir el adjunto), sin extensiones vacías, y escribe el archivo pedido con apiClient", async () => {
        const { picker, write, close } = installSavePicker()
        const { user, dialog, attachmentIds } = await openAttachment(
          ACCENTED_GIF,
          fileResponse(PNG, "image/gif")
        )
        await user.click(previewButton(dialog))
        await waitFor(() => expect(dialog).toHaveTextContent(CANNOT_PREVIEW))
        let callsDuringClick: number | null = null
        const duringClick = () => {
          callsDuringClick = picker.mock.calls.length
        }
        document.addEventListener("click", duringClick)
        onTestFinished(() => document.removeEventListener("click", duringClick))

        await clickDownload(user, dialog)

        expect(callsDuringClick).toBe(1)
        expect(await within(dialog).findByText(SAVED)).toBeInTheDocument()
        const options = picker.mock.calls[0][0] as {
          suggestedName: string
          types?: { accept: Record<string, unknown[]> }[]
        }
        expect(options.suggestedName).toBe(GIF_NAME)
        const extensions = (options.types ?? []).flatMap((type) =>
          Object.values(type.accept).flat()
        )
        expect(
          extensions.every((extension) => typeof extension === "string")
        ).toBe(true)
        expect(attachmentIds).toEqual([ACCENTED_GIF.id])
        expect(write).toHaveBeenCalledTimes(1)
        expect((write.mock.calls[0][0] as Blob).size).toBe(PNG.byteLength)
        expect(close).toHaveBeenCalledTimes(1)
        expect(programmaticClicks).toEqual([])
      })
    })
  })
})

describe("AU-11: supervisor demo", () => {
  it("AU-11: el supervisor demo sigue viendo las ausencias de ejemplo, sin «Ver detalle» y sin pedir /api/crew/absences", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    renderRoute(PATHS.superVisor.ausencias)

    const main = await screen.findByRole("main")
    const pending = await within(main).findByRole("region", {
      name: `${PENDING} (7)`,
    })
    expect(
      within(pending).getByRole("article", { name: "AV-1288" })
    ).toBeInTheDocument()
    expect(
      within(main).queryAllByRole("button", { name: DETAIL })
    ).toHaveLength(0)
    expect(
      requests.filter((request) => request.includes(ABSENCES_URL))
    ).toEqual([])
  })
})
