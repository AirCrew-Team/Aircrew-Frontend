import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { queryAllToasts, queryToast, toastDescription } from "../utils/toasts"

// La ruta se carga con `lazy` (react-hook-form + zod): la primera espera de la pantalla
// lleva más margen que el segundo por defecto, por si el chunk se transforma en frío.
const LAZY = { timeout: 3000 }

// Validación (RA-06 a RA-09), envío correcto (RA-11) y «Volver al Inicio» (RA-13)
// con los datos simulados reales; submitAbsenceReport tarda unos 400 ms.

type DataFn = (...args: unknown[]) => Promise<unknown>

// Cada función de absences.data.ts se envuelve para registrar sus llamadas (con sus args).
// `real` guarda la función original para que un override pueda retrasarla y luego delegar.
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const absencesData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  real: {} as Record<string, DataFn>,
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/absences/data/absences.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      absencesData.real[name] = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          absencesData.calls.push({ name, args })
          return (absencesData.overrides[name] ?? absencesData.real[name])(
            ...args
          )
        },
      ]
    })
  )
})

const submitCalls = () =>
  absencesData.calls.filter((call) => call.name === "submitAbsenceReport")

const FIELD = {
  reason: "Motivo de la Ausencia",
  notes: "Observaciones Adicionales",
  attachment: "Soporte o Incapacidad Médica",
} as const

const SUBMIT = "Enviar Aviso a Despacho"
const SENDING = "Enviando aviso…"
const BACK_HOME = "Volver al Inicio"

const ERROR = {
  reasonRequired: "Selecciona el motivo de la ausencia.",
  attachmentRequired: "Adjunta el soporte médico de la incapacidad.",
  format: "Formato no admitido. Usa PDF, PNG o JPG.",
  size: "El archivo supera el máximo de 10 MB.",
} as const

const SUCCESS_TITLE = "Aviso enviado al supervisor"
const SUCCESS_DESCRIPTION =
  "Se buscará el mejor reemplazo para tu posición en el vuelo AV-8520 y el supervisor lo aprobará."
const SENT_TEXT = "Aviso enviado al supervisor para el vuelo AV-8520."
const NOTES = "Fiebre alta desde la madrugada."

const MAX_BYTES = 10 * 1024 * 1024

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"]), output'

const pdf = (name: string, size?: number) => {
  const file = new File(["%PDF-1.4"], name, { type: "application/pdf" })
  // Sin crear 10 MB reales: se redefine el tamaño que lee la validación.
  if (size !== undefined) Object.defineProperty(file, "size", { value: size })
  return file
}

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// El elemento más interno cuyo texto completo (normalizado) es `text`.
const getByFullText = (container: HTMLElement, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

// El envío simulado tarda ~400 ms: más margen que el segundo por defecto de waitFor.
const findSuccessToast = () =>
  waitFor(
    () => {
      const toast = queryToast(SUCCESS_TITLE)
      expect(toast, `debe aparecer un toast «${SUCCESS_TITLE}»`).not.toBeNull()
      return toast as HTMLElement
    },
    { timeout: 2000 }
  )

// Deja pasar la validación asíncrona y un posible envío antes de afirmar que no ocurrió.
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))

const getAttachmentInput = (container: HTMLElement) => {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input, 'F4 debe ser un <input type="file">').not.toBeNull()
  expect(input).toHaveAccessibleName(FIELD.attachment)
  return input as HTMLInputElement
}

const setup = async (options?: Parameters<typeof userEvent.setup>[0]) => {
  const user = userEvent.setup(options)
  const router = renderRoute(PATHS.tripulante.reportarAusencia)
  const main = await screen.findByRole("main")
  const form = await waitFor(() => {
    const element = main.querySelector("form")
    expect(element, "la pantalla debe tener un <form>").not.toBeNull()
    return element as HTMLFormElement
  }, LAZY)
  await waitFor(() => expect(form).toHaveTextContent("AV-8520"))
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  const scope = within(form)
  return {
    user,
    router,
    main,
    form,
    reason: scope.getByRole("combobox", { name: FIELD.reason }),
    notes: scope.getByRole("textbox", { name: FIELD.notes }),
    attachment: getAttachmentInput(form),
    submit: scope.getByRole("button", { name: SUBMIT }),
  }
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

afterEach(() => {
  absencesData.calls.length = 0
  absencesData.overrides = {}
})

describe("Reportar Ausencia: validación", () => {
  it("RA-06: enviar sin motivo muestra «Selecciona el motivo de la ausencia.» en línea, marca aria-invalid en el select, le da el foco y no sale ningún toast", async () => {
    const { user, reason, submit } = await setup()
    expect(reason).not.toHaveAttribute("aria-invalid", "true")

    await user.click(submit)

    expect(await screen.findByText(ERROR.reasonRequired)).toBeInTheDocument()
    expect(reason).toHaveAttribute("aria-invalid", "true")
    expect(reason).toHaveAccessibleDescription(
      expect.stringContaining(ERROR.reasonRequired)
    )
    await waitFor(() => expect(reason).toHaveFocus())
    expect(queryAllToasts()).toHaveLength(0)
    expect(submitCalls()).toHaveLength(0)
  })

  it("RA-07: con «Incapacidad médica repentina» y sin archivo, el envío muestra «Adjunta el soporte médico de la incapacidad.» y no sale ningún toast", async () => {
    const { user, reason, attachment, submit } = await setup()

    await user.selectOptions(reason, "incapacidad")
    await user.click(submit)

    expect(
      await screen.findByText(ERROR.attachmentRequired)
    ).toBeInTheDocument()
    expect(attachment).toHaveAttribute("aria-invalid", "true")
    expect(attachment).toHaveAccessibleDescription(
      expect.stringContaining(ERROR.attachmentRequired)
    )
    expect(queryAllToasts()).toHaveLength(0)
    expect(submitCalls()).toHaveLength(0)
  })

  it("RA-07 (F4): el input de archivo lleva aria-required=true solo con el motivo «incapacidad»", async () => {
    const { user, reason, attachment } = await setup()
    expect(attachment).not.toHaveAttribute("aria-required", "true")

    await user.selectOptions(reason, "incapacidad")
    await waitFor(() =>
      expect(attachment).toHaveAttribute("aria-required", "true")
    )

    await user.selectOptions(reason, "fatiga")
    await waitFor(() =>
      expect(attachment).not.toHaveAttribute("aria-required", "true")
    )
  })

  it("A11Y-AUS-3: tras el error de obligatorio con incapacidad, cambiar a «Fatiga» quita el error y el aria-invalid del archivo", async () => {
    const { user, reason, attachment, submit } = await setup()

    await user.selectOptions(reason, "incapacidad")
    await user.click(submit)
    expect(
      await screen.findByText(ERROR.attachmentRequired)
    ).toBeInTheDocument()

    await user.selectOptions(reason, "fatiga")

    await waitFor(() =>
      expect(screen.queryByText(ERROR.attachmentRequired)).toBeNull()
    )
    expect(attachment).not.toHaveAttribute("aria-invalid", "true")
  })

  it("RA-07: con «Fatiga operacional / RAC 212» y sin archivo, el envío sale bien", async () => {
    const { user, reason, submit } = await setup()

    await user.selectOptions(reason, "fatiga")
    await user.click(submit)

    await findSuccessToast()
    expect(screen.queryByText(ERROR.attachmentRequired)).toBeNull()
    expect(submitCalls()).toHaveLength(1)
    expect(submitCalls()[0].args[0]).toMatchObject({
      flightNumber: "AV-8520",
      reason: "fatiga",
      attachment: null,
    })
  })

  it("RA-08: al elegir un .txt aparece enseguida, sin enviar, «Formato no admitido. Usa PDF, PNG o JPG.» y el envío queda bloqueado", async () => {
    // Sin applyAccept, user-event descartaría el .txt por el atributo accept.
    const { user, main, reason, attachment, submit } = await setup({
      applyAccept: false,
    })
    await user.selectOptions(reason, "fatiga")

    await user.upload(
      attachment,
      new File(["hola"], "notas.txt", { type: "text/plain" })
    )

    expect(await screen.findByText(ERROR.format)).toBeInTheDocument()
    expect(attachment).toHaveAttribute("aria-invalid", "true")
    expect(attachment).toHaveAccessibleDescription(
      expect.stringContaining(ERROR.format)
    )
    // A11Y-AUS-1: se valida al elegir, sin mover el foco: el lector lo oye por el alert.
    expect(within(main).getByRole("alert")).toHaveTextContent(ERROR.format)

    await user.click(submit)
    await settle()

    expect(screen.getByText(ERROR.format)).toBeInTheDocument()
    expect(submitCalls()).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("RA-08: al elegir un PDF de más de 10 MB aparece «El archivo supera el máximo de 10 MB.» y el envío queda bloqueado", async () => {
    const { user, main, reason, attachment, submit } = await setup()
    await user.selectOptions(reason, "fatiga")

    await user.upload(attachment, pdf("incapacidad.pdf", MAX_BYTES + 1))

    expect(await screen.findByText(ERROR.size)).toBeInTheDocument()
    expect(attachment).toHaveAttribute("aria-invalid", "true")
    expect(within(main).getByRole("alert")).toHaveTextContent(ERROR.size)

    await user.click(submit)
    await settle()

    expect(screen.getByText(ERROR.size)).toBeInTheDocument()
    expect(submitCalls()).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("RA-08 (límite): un PDF de exactamente 10 MB es válido", async () => {
    const { user, form, attachment } = await setup()

    await user.upload(attachment, pdf("justo-10mb.pdf", MAX_BYTES))

    expect(await within(form).findByText("justo-10mb.pdf")).toBeInTheDocument()
    expect(screen.queryByText(ERROR.size)).toBeNull()
    expect(attachment).not.toHaveAttribute("aria-invalid", "true")
  })

  it("RA-09: al elegir un PDF válido se ve su nombre; «Quitar archivo {nombre}» lo quita y el nombre desaparece", async () => {
    const { user, form, attachment } = await setup()
    const file = pdf("soporte-medico.pdf")

    await user.upload(attachment, file)

    expect(await within(form).findByText(file.name)).toBeInTheDocument()
    const remove = within(form).getByRole("button", {
      name: `Quitar archivo ${file.name}`,
    })

    await user.click(remove)

    await waitFor(() => expect(within(form).queryByText(file.name)).toBeNull())
    expect(
      within(form).queryByRole("button", {
        name: `Quitar archivo ${file.name}`,
      })
    ).toBeNull()
  })
})

describe("Reportar Ausencia: envío correcto (RA-11)", () => {
  it("RA-11: durante el envío el botón dice «Enviando aviso…» y está deshabilitado; al terminar salen el toast exacto, los campos deshabilitados, el texto de enviado fuera de regiones vivas y el foco en «Volver al Inicio»", async () => {
    // El envío real espera a que el test lo libere: así se ve el estado «enviando» sin carreras.
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    absencesData.overrides.submitAbsenceReport = async (...args) => {
      await gate
      return absencesData.real.submitAbsenceReport(...args)
    }
    const { user, main, form, reason, notes, attachment, submit } =
      await setup()
    const file = pdf("soporte-medico.pdf")

    await user.selectOptions(reason, "incapacidad")
    await user.type(notes, NOTES)
    await user.upload(attachment, file)
    await within(form).findByText(file.name)
    await user.click(submit)

    const sending = await within(form).findByRole("button", { name: SENDING })
    // A11Y-AUS-2: aria-disabled y no disabled, para que el foco no caiga a <body>.
    expect(sending).toHaveAttribute("aria-disabled", "true")
    expect(sending).toHaveFocus()
    await user.click(sending)
    await settle()
    expect(submitCalls(), "un segundo clic no reenvía").toHaveLength(1)
    // Revisión: lo que se ve como enviado es lo que se envió.
    expect(reason).toBeDisabled()
    expect(notes).toBeDisabled()
    expect(within(form).queryByRole("button", { name: SUBMIT })).toBeNull()
    expect(queryAllToasts()).toHaveLength(0)

    release()

    const toast = await findSuccessToast()
    expect(toast).toHaveAttribute("data-type", "success")
    expect(toastDescription(toast)).toBe(SUCCESS_DESCRIPTION)
    expect(main).not.toContainElement(toast)

    expect(submitCalls()).toHaveLength(1)
    const input = submitCalls()[0].args[0] as Record<string, unknown>
    expect(input).toMatchObject({
      flightNumber: "AV-8520",
      reason: "incapacidad",
      notes: NOTES,
    })
    expect((input.attachment as File | null)?.name).toBe(file.name)

    // Estado persistente: campos deshabilitados (fieldset disabled), incluido «Quitar archivo».
    const scope = within(main)
    expect(scope.getByRole("combobox", { name: FIELD.reason })).toBeDisabled()
    expect(scope.getByRole("textbox", { name: FIELD.notes })).toBeDisabled()
    expect(getAttachmentInput(main)).toBeDisabled()
    expect(
      scope.getByRole("button", { name: `Quitar archivo ${file.name}` })
    ).toBeDisabled()

    // La fila de acciones se sustituye por el texto de enviado y «Volver al Inicio».
    const sent = getByFullText(main, SENT_TEXT)
    expect(
      sent.closest(LIVE_REGION),
      "el texto de enviado no debe estar dentro de una región viva"
    ).toBeNull()
    expect(scope.queryByRole("button", { name: SUBMIT })).toBeNull()
    expect(scope.queryByRole("button", { name: SENDING })).toBeNull()
    expect(scope.queryByRole("link", { name: "Cancelar" })).toBeNull()

    const back = scope.getByRole("link", { name: BACK_HOME })
    await waitFor(() => expect(back).toHaveFocus())
  })

  it("RA-13: tras enviar, «Volver al Inicio» lleva a /tripulante", async () => {
    const { user, router, main, reason, submit } = await setup()

    await user.selectOptions(reason, "fatiga")
    await user.click(submit)
    await findSuccessToast()

    const back = within(main).getByRole("link", { name: BACK_HOME })
    expect(back).toHaveAttribute("href", PATHS.tripulante.inicio)
    await user.click(back)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
    )
  })
})
