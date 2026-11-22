import { createBrowserRouter, type RouteObject } from "react-router"
import { RouterProvider } from "react-router/dom"

import { ROLES } from "@/App/types/auth.types"
import MainLayout from "@/layouts/MainLayout"
import LoginPage from "@/pages/LoginPage"
import NotFoundPage from "@/pages/NotFoundPage"
import SuperAdminInicioPage from "@/pages/superAdmin/InicioPage"
import ReportesPage from "@/pages/superAdmin/ReportesPage"
import AusenciasPage from "@/pages/superVisor/AusenciasPage"
import SuperVisorInicioPage from "@/pages/superVisor/InicioPage"
import ProgramacionPage from "@/pages/superVisor/ProgramacionPage"
import SolicitudesReemplazoPage from "@/pages/superVisor/SolicitudesReemplazoPage"
import TripulacionPage from "@/pages/superVisor/TripulacionPage"
import CertificacionesPage from "@/pages/tripulante/CertificacionesPage"
import TripulanteInicioPage from "@/pages/tripulante/InicioPage"
import MisVuelosPage from "@/pages/tripulante/MisVuelosPage"

import { PATHS } from "./paths"
import ProtectedRoute from "./ProtectedRoute"
import RootRedirect from "./RootRedirect"
import SessionGate from "./SessionGate"

// Cada rol tiene su grupo: protección por rol → diseño base → páginas.
// Las páginas comunes a los tres roles van en un grupo propio, sin prefijo de rol.
const appRoutes: RouteObject[] = [
  { path: PATHS.root, element: <RootRedirect /> },
  { path: PATHS.login, element: <LoginPage /> },
  // Públicas y en diferido: react-hook-form + zod, igual que /configuracion.
  {
    path: PATHS.activarCuenta,
    HydrateFallback: () => null,
    lazy: async () => ({
      Component: (await import("@/pages/ActivarCuentaPage")).default,
    }),
  },
  {
    path: PATHS.restablecerContrasena,
    HydrateFallback: () => null,
    lazy: async () => ({
      Component: (await import("@/pages/RestablecerContrasenaPage")).default,
    }),
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.TRIPULANTE]} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: PATHS.tripulante.inicio, element: <TripulanteInicioPage /> },
          { path: PATHS.tripulante.misVuelos, element: <MisVuelosPage /> },
          {
            path: PATHS.tripulante.certificaciones,
            element: <CertificacionesPage />,
          },
          // Carga diferida: react-hook-form + zod, igual que /configuracion.
          {
            path: PATHS.tripulante.reportarAusencia,
            HydrateFallback: () => null,
            lazy: async () => ({
              Component: (
                await import("@/pages/tripulante/ReportarAusenciaPage")
              ).default,
            }),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.SUPER_VISOR]} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: PATHS.superVisor.inicio, element: <SuperVisorInicioPage /> },
          {
            path: PATHS.superVisor.programacion,
            element: <ProgramacionPage />,
          },
          {
            path: PATHS.superVisor.solicitudesReemplazo,
            element: <SolicitudesReemplazoPage />,
          },
          { path: PATHS.superVisor.tripulacion, element: <TripulacionPage /> },
          { path: PATHS.superVisor.ausencias, element: <AusenciasPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: PATHS.superAdmin.inicio, element: <SuperAdminInicioPage /> },
          // Carga diferida: react-hook-form + zod, igual que /configuracion.
          {
            path: PATHS.superAdmin.usuarios,
            HydrateFallback: () => null,
            lazy: async () => ({
              Component: (await import("@/pages/superAdmin/UsuariosPage"))
                .default,
            }),
          },
          { path: PATHS.superAdmin.reportes, element: <ReportesPage /> },
          {
            path: PATHS.superAdmin.aeronaves,
            HydrateFallback: () => null,
            lazy: async () => ({
              Component: (await import("@/pages/superAdmin/AeronavesPage"))
                .default,
            }),
          },
          {
            path: PATHS.superAdmin.certificaciones,
            HydrateFallback: () => null,
            lazy: async () => ({
              Component: (
                await import("@/pages/superAdmin/CertificacionesPage")
              ).default,
            }),
          },
        ],
      },
    ],
  },
  {
    element: (
      <ProtectedRoute
        allowedRoles={[ROLES.TRIPULANTE, ROLES.SUPER_VISOR, ROLES.SUPER_ADMIN]}
      />
    ),
    children: [
      {
        element: <MainLayout />,
        children: [
          // Carga diferida: react-hook-form + zod + el módulo profile pesan más de ~30 kB gzip.
          // HydrateFallback vacío: al entrar directo por URL, el guard y el layout se pintan
          // mientras llega el chunk (sin él, React Router avisa y no pinta nada).
          {
            path: PATHS.configuracion,
            HydrateFallback: () => null,
            lazy: async () => ({
              Component: (await import("@/pages/ConfiguracionPage")).default,
            }),
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]

// SessionGate envuelve todas las rutas: restaura la sesión con /auth/me al arrancar.
// Se exporta para que los tests monten las rutas reales con createMemoryRouter.
export const routes: RouteObject[] = [
  { element: <SessionGate />, children: appRoutes },
]

const router = createBrowserRouter(routes)

const AppRouter = () => {
  return <RouterProvider router={router} />
}

export default AppRouter
