import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { Dialog } from "@/components/custom/Dialog"
import { useIdleLogout } from "@/hooks/useIdleLogout"
import { cn } from "@/lib/utils"

const buttonClass = cn(
  typography.labelMd,
  "h-11 rounded-md px-4 font-semibold focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 lg:h-9"
)

// Aviso del cierre por inactividad (spec cierre-por-inactividad). Vive aquí el contador
// para que la cuenta atrás no vuelva a pintar el layout cada segundo. El Dialog queda
// siempre montado: al cerrarse con close() el navegador devuelve el foco.
const IdleWarningDialog = () => {
  const { secondsLeft, stay, logoutNow } = useIdleLogout()

  return (
    <Dialog
      role="alertdialog"
      isOpen={secondsLeft !== null}
      // Escape, la X y el fondo equivalen a «Seguir conectado».
      onClose={stay}
      title="¿Sigues ahí?"
      // Fija: el lector de pantalla la anuncia una vez, al abrirse.
      description="Tu sesión se cerrará en 30 segundos por inactividad."
    >
      <div className="flex flex-col gap-6">
        {/* Cuenta atrás visible, fuera de la descripción y sin región viva. */}
        <p className={typography.bodyMd}>
          Tiempo restante:{" "}
          <span className="font-semibold tabular-nums">
            0:{String(secondsLeft ?? 0).padStart(2, "0")}
          </span>
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={logoutNow}
            className={buttonClass}
          >
            Cerrar sesión
          </Button>
          <Button
            type="button"
            data-autofocus
            onClick={stay}
            className={buttonClass}
          >
            Seguir conectado
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default IdleWarningDialog
