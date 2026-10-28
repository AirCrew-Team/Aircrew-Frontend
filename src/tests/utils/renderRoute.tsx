import { StrictMode } from "react"
import { render } from "@testing-library/react"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { routes } from "@/routes/AppRouter"

// Monta las rutas reales de la app en memoria, empezando en `path`.
// Devuelve el router para comprobar la ruta final con router.state.location.pathname.
// StrictMode, igual que en main.tsx, para cubrir el doble efecto en desarrollo.
export const renderRoute = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
  return router
}
