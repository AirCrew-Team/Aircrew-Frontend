// Direcciones de la aplicación agrupadas por rol.
export const PATHS = {
  root: "/",
  login: "/login",
  tripulante: {
    inicio: "/tripulante",
    misVuelos: "/tripulante/mis-vuelos",
    certificaciones: "/tripulante/certificaciones",
    reportarAusencia: "/tripulante/reportar-ausencia",
  },
  superVisor: {
    inicio: "/supervisor",
    solicitudesReemplazo: "/supervisor/solicitudes-reemplazo",
    tripulacion: "/supervisor/tripulacion",
    ausencias: "/supervisor/ausencias",
  },
  superAdmin: {
    inicio: "/admin",
    usuarios: "/admin/usuarios",
    reportes: "/admin/reportes",
  },
} as const
