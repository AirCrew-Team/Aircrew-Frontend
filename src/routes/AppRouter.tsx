import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { ROLES } from "@/App/types/auth.types"
import MainLayout from "@/layouts/MainLayout"
import LoginPage from "@/pages/LoginPage"
import NotFoundPage from "@/pages/NotFoundPage"
import SuperAdminInicioPage from "@/pages/superAdmin/InicioPage"
import ReportesPage from "@/pages/superAdmin/ReportesPage"
import UsuariosPage from "@/pages/superAdmin/UsuariosPage"
import AusenciasPage from "@/pages/superVisor/AusenciasPage"
import SuperVisorInicioPage from "@/pages/superVisor/InicioPage"
import SolicitudesReemplazoPage from "@/pages/superVisor/SolicitudesReemplazoPage"
import TripulacionPage from "@/pages/superVisor/TripulacionPage"
import CertificacionesPage from "@/pages/tripulante/CertificacionesPage"
import TripulanteInicioPage from "@/pages/tripulante/InicioPage"
import MisVuelosPage from "@/pages/tripulante/MisVuelosPage"
import ReportarAusenciaPage from "@/pages/tripulante/ReportarAusenciaPage"

import { PATHS } from "./paths"
import ProtectedRoute from "./ProtectedRoute"
import RootRedirect from "./RootRedirect"

// Cada rol tiene su grupo: protección por rol → diseño base → páginas.
const router = createBrowserRouter([
  { path: PATHS.root, element: <RootRedirect /> },
  { path: PATHS.login, element: <LoginPage /> },
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
          {
            path: PATHS.tripulante.reportarAusencia,
            element: <ReportarAusenciaPage />,
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
          { path: PATHS.superAdmin.usuarios, element: <UsuariosPage /> },
          { path: PATHS.superAdmin.reportes, element: <ReportesPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
])

const AppRouter = () => {
  return <RouterProvider router={router} />
}

export default AppRouter
