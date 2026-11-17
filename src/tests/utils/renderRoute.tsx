import { StrictMode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { routes } from "@/routes/AppRouter"

// Monta las rutas reales de la app en memoria, empezando en `path`.
// Devuelve el router para comprobar la ruta final con router.state.location.pathname.
// StrictMode, igual que en main.tsx, para cubrir el doble efecto en desarrollo.
// Cada llamada usa un QueryClient nuevo (sin reintentos) para que la caché no pase de un test a otro.
// El Toaster va fuera del router, con las mismas props que en AirCrewApp, y necesita el
// ThemeProvider de main.tsx (useTheme lanza un error sin él).
export const renderRoute = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <RouterProvider router={router} />
          <Toaster
            containerAriaLabel="Notificaciones"
            duration={4500}
            position="top-right"
            richColors
          />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  return router
}
