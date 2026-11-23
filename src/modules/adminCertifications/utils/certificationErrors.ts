import { CertificationRequestError } from "@/App/actions/certifications/certifications.actions"

// Texto del error que ve el super admin: el del backend (400, 404, 409, 413 o 403) o,
// si no hay (red, 5xx), el genérico de la pantalla.
export const certificationErrorMessage = (error: unknown, fallback: string) =>
  error instanceof CertificationRequestError ? error.message : fallback

// 404: el tripulante ya no existe o ya no tenía certificación; hay que refrescar la lista.
export const isCertificationNotFound = (error: unknown) =>
  error instanceof CertificationRequestError && error.status === 404
