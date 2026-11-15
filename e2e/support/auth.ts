import { expect, type Page } from "@playwright/test"

// Cuentas de prueba copiadas de src/modules/login/authService.ts (implementación demo).
// Solo viven en el código de pruebas: no se copian a la documentación.
export type Rol = "tripulante" | "supervisor" | "admin"

type Cuenta = {
  email: string
  password: string
  inicio: string
  // h1 del Inicio: «{displayName del store}, {saludo}».
  h1: string
  // Nombre corto del navbar (botón «Menú de perfil de …»).
  displayName: string
  // ROLE_LABELS del Login, en el toast «Bienvenido a AirCrew, {rol}.».
  rolLabel: string
  // Nombre completo del perfil (Configuración).
  fullName: string
}

export const CUENTAS: Record<Rol, Cuenta> = {
  tripulante: {
    email: "tripulante@gmail.com",
    password: "1234567",
    inicio: "/tripulante",
    h1: "Juan Pablo, Bienvenido a AirCrew",
    displayName: "Juan Pablo",
    rolLabel: "Tripulante",
    fullName: "Juan Pablo Navarro",
  },
  supervisor: {
    email: "supervisor@gmail.com",
    password: "1234567",
    inicio: "/supervisor",
    h1: "Camila Restrepo, Bienvenida a AirCrew",
    displayName: "Camila Restrepo",
    rolLabel: "Supervisor",
    fullName: "Camila Restrepo",
  },
  admin: {
    email: "admin@gmail.com",
    password: "1234567",
    inicio: "/admin",
    h1: "Admin AirCrew, Bienvenido a AirCrew",
    displayName: "Admin AirCrew",
    rolLabel: "Administrador",
    fullName: "Admin AirCrew",
  },
}

// Rellena el Login y lo envía, sin esperar el resultado.
export async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByRole("textbox", { name: "Correo" }).fill(email)
  // exact: el botón «Mostrar contraseña» también se nombra con la palabra.
  await page.getByLabel("Contraseña", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Iniciar sesión" }).click()
}

// Entra por el Login con la cuenta del rol y espera al Inicio con su h1.
// La sesión no se guarda al recargar: después de esto no se usa page.goto
// (sería volver a /login); se navega con el navbar o el menú de perfil.
export async function loginAs(page: Page, rol: Rol) {
  const cuenta = CUENTAS[rol]
  await submitLogin(page, cuenta.email, cuenta.password)
  await expect(page).toHaveURL(cuenta.inicio)
  await expect(
    page.getByRole("heading", { level: 1, name: cuenta.h1 })
  ).toBeVisible()
  // El toast de bienvenida (top-right, 4,5 s) tapa el botón del perfil y, en móvil, todo
  // el navbar. Si el ratón queda encima, sonner pausa el temporizador y el toast no se va:
  // se espera a que desaparezca antes de seguir, con el ratón aún en «Iniciar sesión».
  const bienvenida = page.getByText(
    `Bienvenido a AirCrew, ${cuenta.rolLabel}.`,
    { exact: true }
  )
  await expect(bienvenida).toBeVisible()
  await expect(bienvenida).toBeHidden({ timeout: 10_000 })
}
