import { ROLES, type Role } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"

export interface RouteCase {
  path: string
  role: Role
  // Nombre de la sección: base del título del documento y, si no hay `heading`, texto del h1.
  section: string
  // Texto del h1 cuando no coincide con la sección (HT-02: Inicio del tripulante).
  heading?: string
}

// Las 11 rutas protegidas de la spec (CA-01), cada una con el rol que puede verla.
export const ROUTE_CASES: RouteCase[] = [
  {
    path: PATHS.tripulante.inicio,
    role: ROLES.TRIPULANTE,
    section: "Inicio",
    heading: "Juan Pablo, Bienvenido a AirCrew",
  },
  {
    path: PATHS.tripulante.misVuelos,
    role: ROLES.TRIPULANTE,
    section: "Mis Vuelos",
  },
  {
    path: PATHS.tripulante.certificaciones,
    role: ROLES.TRIPULANTE,
    section: "Certificaciones",
  },
  {
    path: PATHS.tripulante.reportarAusencia,
    role: ROLES.TRIPULANTE,
    section: "Reportar Ausencia",
  },
  { path: PATHS.superVisor.inicio, role: ROLES.SUPER_VISOR, section: "Inicio" },
  {
    path: PATHS.superVisor.solicitudesReemplazo,
    role: ROLES.SUPER_VISOR,
    section: "Solicitudes de Reemplazo",
  },
  {
    path: PATHS.superVisor.tripulacion,
    role: ROLES.SUPER_VISOR,
    section: "Tripulación",
  },
  {
    path: PATHS.superVisor.ausencias,
    role: ROLES.SUPER_VISOR,
    section: "Ausencias",
  },
  { path: PATHS.superAdmin.inicio, role: ROLES.SUPER_ADMIN, section: "Inicio" },
  {
    path: PATHS.superAdmin.usuarios,
    role: ROLES.SUPER_ADMIN,
    section: "Usuarios",
  },
  {
    path: PATHS.superAdmin.reportes,
    role: ROLES.SUPER_ADMIN,
    section: "Reportes",
  },
]
