// Tipos de «Mi Perfil y Configuración» del super admin. Tripulante y supervisor tienen
// su propia pantalla (módulo profile).

// Notificación operacional que el usuario puede activar o desactivar.
export interface OperatorNotification {
  // Identificador estable, ej. "absenceAlerts".
  id: string
  // Ícono de la fila (ver NOTIFICATION_ICONS en el formulario).
  icon: "absence" | "fleet"
  title: string
  description: string
  enabled: boolean
}

export interface OperatorProfile {
  // ID operativo, ej. "OPS-8842".
  employeeCode: string
  fullName: string
  email: string
  // Celular en formato internacional (E.164), ej. "+14045550142".
  phone: string
  // Código de la residencia principal (ver getResidenceOptions), ej. "ATL".
  residence: string
  // Foto de perfil; null: se muestran las iniciales.
  photoUrl: string | null
  // Etiqueta bajo el nombre, ej. "Jefa de Operaciones".
  roleBadge: string
  // Línea de rol y nivel, ej. "Superadministrador • Nivel 4".
  roleLine: string
  // Base central, ej. "Atlanta (ATL)".
  base: string
  accountStatus: string
  // Credencial digital (tarjeta oscura).
  credential: { title: string; license: string }
  // Campo de solo lectura, ej. «Cargo / Departamento», con la nota de a quién pedir cambios.
  readOnlyField: { label: string; value: string; note: string }
  // Etiqueta del teléfono, ej. «Teléfono Móvil / Celular».
  phoneLabel: string
  security: {
    lastPasswordChangeDays: number
  }
  notifications: OperatorNotification[]
  // Textos del encabezado que cambian por rol.
  header: { subtitle: string; syncLabel: string }
}

// Datos que se envían al guardar el perfil (con la API, un PUT del perfil).
export interface UpdateOperatorProfileInput {
  fullName: string
  email: string
  phone: string
  residence: string
  // Estado de cada notificación, por su id.
  notifications: Record<string, boolean>
  // Foto nueva, null para quitarla o undefined para dejar la que había.
  photo?: File | null
}

// Opción de «País o Residencia Principal».
export interface ResidenceOption {
  code: string
  label: string
}
