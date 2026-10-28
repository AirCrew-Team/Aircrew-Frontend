import { ROLES, type Role } from "@/App/types/auth.types"
import type { NavItem } from "@/App/types/navigation.types"

import { PATHS } from "./paths"

// Elementos del navbar para cada rol, en el orden en que se muestran.
export const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  [ROLES.TRIPULANTE]: [
    { label: "Inicio", to: PATHS.tripulante.inicio, end: true },
    { label: "Mis Vuelos", to: PATHS.tripulante.misVuelos },
    { label: "Certificaciones", to: PATHS.tripulante.certificaciones },
    { label: "Reportar Ausencia", to: PATHS.tripulante.reportarAusencia },
  ],
  [ROLES.SUPER_VISOR]: [
    { label: "Inicio", to: PATHS.superVisor.inicio, end: true },
    {
      label: "Solicitudes de Reemplazo",
      to: PATHS.superVisor.solicitudesReemplazo,
    },
    { label: "Tripulación", to: PATHS.superVisor.tripulacion },
    { label: "Ausencias", to: PATHS.superVisor.ausencias },
  ],
  [ROLES.SUPER_ADMIN]: [
    { label: "Inicio", to: PATHS.superAdmin.inicio, end: true },
    { label: "Usuarios", to: PATHS.superAdmin.usuarios },
    { label: "Reportes", to: PATHS.superAdmin.reportes },
  ],
}

// Página de inicio a la que se redirige a cada rol.
export const HOME_PATH_BY_ROLE: Record<Role, string> = {
  [ROLES.TRIPULANTE]: PATHS.tripulante.inicio,
  [ROLES.SUPER_VISOR]: PATHS.superVisor.inicio,
  [ROLES.SUPER_ADMIN]: PATHS.superAdmin.inicio,
}
