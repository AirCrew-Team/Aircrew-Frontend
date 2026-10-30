import { Toaster } from "@/components/ui/sonner"
import AppRouter from "@/routes/AppRouter"

const AirCrewApp = () => (
  <>
    <AppRouter />
    <Toaster
      containerAriaLabel="Notificaciones"
      duration={4500}
      position="top-right"
      richColors
    />
  </>
)

export default AirCrewApp
