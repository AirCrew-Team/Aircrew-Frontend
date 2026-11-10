// Direcciones de la aplicación agrupadas por rol.
export const PATHS = {
  root: "/",
  login: "/login",
  // Común a los tres roles, sin prefijo.
  configuracion: "/configuracion",
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
    // Destinos de los botones de las tarjetas del Inicio del admin y del navbar.
    aeronaves: "/admin/aeronaves",
    certificaciones: "/admin/certificaciones",
  },
} as const
