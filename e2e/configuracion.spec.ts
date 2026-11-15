import { expect, test, type Page } from "@playwright/test"

import { CUENTAS, loginAs, type Rol } from "./support/auth.ts"
import { goToConfiguracion, waitForLoaded } from "./support/navigation.ts"

// E2E-08 (foto, también en móvil) y E2E-09 (contraseña). Textos de la spec
// configuracion-tripulante-supervisor y de src/tests/profile/ConfiguracionPage.*.test.tsx.
const H1: Record<Exclude<Rol, "admin">, string> = {
  tripulante: "Mi Perfil y Ajustes de Tripulante",
  supervisor: "Mi Perfil y Ajustes de Supervisor",
}
const INICIALES: Record<Exclude<Rol, "admin">, string> = {
  tripulante: "JP",
  supervisor: "CR",
}
// lastPasswordChangeDays de profile.data, antes de cambiar la contraseña.
const ULTIMO_CAMBIO: Record<Exclude<Rol, "admin">, string> = {
  tripulante: "Último cambio: hace 42 días",
  supervisor: "Último cambio: hace 18 días",
}

const ERROR_FORMATO = "Formato no válido. Sube una imagen PNG, JPG o WEBP."
const PERFIL_GUARDADO = "Perfil actualizado con éxito"

// PNG válido de 1×1 px, generado en la prueba (no hay archivos de prueba en el repo).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG_1X1 })
// Unos bytes con cabecera GIF: la app valida por el tipo MIME, no por el contenido.
const gif = {
  name: "animada.gif",
  mimeType: "image/gif",
  buffer: Buffer.from("GIF89a"),
}

const openConfiguracion = async (page: Page, rol: Exclude<Rol, "admin">) => {
  await loginAs(page, rol)
  await goToConfiguracion(page, rol)
  await expect(
    page.getByRole("heading", { level: 1, name: H1[rol] })
  ).toBeVisible()
  await waitForLoaded(page)
  return page.getByRole("main")
}

const toast = (page: Page, titulo: string) =>
  page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: titulo })

test.describe("E2E-08 Foto de perfil", () => {
  for (const rol of ["tripulante", "supervisor"] as const) {
    test(`E2E-08 con ${rol}: vista previa de un PNG, quitar vuelve a las iniciales, guardar mantiene la foto y un .gif da error @movil`, async ({
      page,
    }) => {
      const main = await openConfiguracion(page, rol)
      // I1: la <section> rotulada por el h2 con el nombre completo.
      const tarjeta = main.getByRole("region", { name: CUENTAS[rol].fullName })
      const subir = tarjeta.getByLabel("Subir Foto")
      const quitar = tarjeta.getByRole("button", {
        name: "Quitar foto de perfil",
      })
      const foto = tarjeta.getByRole("img", {
        name: `Foto de perfil de ${CUENTAS[rol].fullName}`,
      })
      const iniciales = tarjeta.getByText(INICIALES[rol], { exact: true })

      await expect(iniciales).toBeVisible()
      await expect(quitar).toBeDisabled()

      // Vista previa real (jsdom no la puede probar): la imagen carga y se ve.
      await subir.setInputFiles(png("foto.png"))
      await expect(foto).toBeVisible()
      await expect
        .poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0)
      await expect(iniciales).toHaveCount(0)
      await expect(quitar).toBeEnabled()

      await quitar.click()
      await expect(foto).toHaveCount(0)
      await expect(iniciales).toBeVisible()
      await expect(quitar).toBeDisabled()

      await subir.setInputFiles(png("otra.png"))
      await expect(foto).toBeVisible()
      await main.getByRole("button", { name: "Guardar Cambios" }).click()
      await expect(toast(page, PERFIL_GUARDADO)).toBeVisible()
      await expect(foto).toBeVisible()
      await expect
        .poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0)

      // El input tiene accept=".png,…", pero setInputFiles no lo aplica: llega el .gif.
      await subir.setInputFiles(gif)
      await expect(
        tarjeta.getByRole("alert").filter({ hasText: ERROR_FORMATO })
      ).toBeVisible()
      await expect(subir).toHaveAccessibleDescription(ERROR_FORMATO)
      // La foto guardada se conserva.
      await expect(foto).toBeVisible()
    })
  }
})

test.describe("E2E-09 Contraseña", () => {
  const abrirPanel = async (
    page: Page,
    rol: Exclude<Rol, "admin"> = "tripulante"
  ) => {
    const main = await openConfiguracion(page, rol)
    await main.getByRole("button", { name: "Cambiar contraseña" }).click()
    const panel = main.getByRole("group", { name: "Cambiar contraseña" })
    await expect(panel).toBeVisible()
    return { main, panel }
  }

  test("E2E-09 el ojo de «Contraseña Actual» muestra y oculta lo escrito sin moverse al pulsarlo", async ({
    page,
  }) => {
    const { panel } = await abrirPanel(page)
    const actual = panel.getByLabel("Contraseña Actual", { exact: true })
    // El nombre cambia (Mostrar ↔ Ocultar): regex para seguir al mismo botón.
    const ojo = panel.getByRole("button", { name: /contraseña actual$/i })

    await actual.fill("secreta-1")
    await expect(actual).toHaveAttribute("type", "password")
    await expect(ojo).toHaveAccessibleName("Mostrar contraseña actual")

    await ojo.scrollIntoViewIfNeeded()
    const antes = await ojo.boundingBox()
    expect(antes).not.toBeNull()
    await ojo.hover()
    await page.mouse.down()
    // Con el botón pulsado (:active): la animación quitada no debe desplazarlo. Se dejan
    // pasar dos frames y se espera a que acabe cualquier transición del botón, para medir
    // también donde terminaría una animación (en t=0 una transición aún no se ha movido).
    await ojo.evaluate(async (boton) => {
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      )
      await Promise.all(boton.getAnimations().map((a) => a.finished))
    })
    const pulsado = await ojo.boundingBox()
    await page.mouse.up()
    const despues = await ojo.boundingBox()
    expect(pulsado, "caja con el botón pulsado").toEqual(antes)
    expect(despues, "caja después del clic").toEqual(antes)

    await expect(actual).toHaveAttribute("type", "text")
    await expect(actual).toHaveValue("secreta-1")
    await expect(ojo).toHaveAccessibleName("Ocultar contraseña actual")
    await expect(ojo).toHaveAttribute("aria-pressed", "true")

    await ojo.click()
    await expect(actual).toHaveAttribute("type", "password")
    await expect(ojo).toHaveAccessibleName("Mostrar contraseña actual")
  })

  // Contraseña actual correcta (MOCK_CURRENT_PASSWORD de profile.data) y una nueva que
  // cumple las 5 reglas y es distinta de la actual.
  const cambiarContrasena = async (
    page: Page,
    rol: Exclude<Rol, "admin"> = "tripulante"
  ) => {
    const { main, panel } = await abrirPanel(page, rol)
    await expect(main.getByText(ULTIMO_CAMBIO[rol])).toBeVisible()
    await panel
      .getByLabel("Contraseña Actual", { exact: true })
      .fill("AirCrew2026!")
    await panel
      .getByLabel("Nueva Contraseña", { exact: true })
      .fill("Vuelo#2027ok")
    await panel
      .getByLabel("Confirmar Contraseña", { exact: true })
      .fill("Vuelo#2027ok")
    await panel.getByRole("button", { name: "Actualizar contraseña" }).click()
    return { main, panel }
  }

  test("E2E-09 con la contraseña actual correcta sale «Contraseña actualizada» y la etiqueta pasa a «Último cambio: hoy»", async ({
    page,
  }) => {
    const { main, panel } = await cambiarContrasena(page)

    const aviso = toast(page, "Contraseña actualizada")
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText(
      "Usa la nueva contraseña en tu próximo inicio de sesión."
    )
    await expect(panel).toBeHidden()
    await expect(main.getByText("Último cambio: hoy")).toBeVisible()
  })

  // FX-01 (spec fix-e2e-hallazgos) y CS-16 (spec configuracion-tripulante-supervisor): en
  // un navegador real el foco vuelve a «Cambiar contraseña» al cerrar el panel, tanto tras
  // el éxito (cierre desde onSuccess, fuera de un evento de React) como con «Cancelar».
  // jsdom no detectaba el fallo del éxito.
  for (const rol of ["tripulante", "supervisor"] as const) {
    test(`E2E-09 (CS-16, FX-01) con ${rol}: tras cambiar la contraseña, el foco vuelve a «Cambiar contraseña»`, async ({
      page,
    }) => {
      const { main, panel } = await cambiarContrasena(page, rol)

      await expect(main.getByText("Último cambio: hoy")).toBeVisible()
      await expect(panel).toBeHidden()
      await expect(
        main.getByRole("button", { name: "Cambiar contraseña" })
      ).toBeFocused()
    })

    test(`E2E-09 (FX-01) con ${rol}: tras «Cancelar», el panel se cierra y el foco vuelve a «Cambiar contraseña»`, async ({
      page,
    }) => {
      const { main, panel } = await abrirPanel(page, rol)
      await panel
        .getByLabel("Contraseña Actual", { exact: true })
        .fill("a-medias")

      await panel.getByRole("button", { name: "Cancelar" }).click()

      await expect(panel).toBeHidden()
      await expect(
        main.getByRole("button", { name: "Cambiar contraseña" })
      ).toBeFocused()
      // Cancelar no cambia la contraseña.
      await expect(main.getByText(ULTIMO_CAMBIO[rol])).toBeVisible()
    })
  }
})
