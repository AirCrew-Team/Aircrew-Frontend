// Cambio de contraseña: va en su propia petición (con la API, un POST aparte).
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
