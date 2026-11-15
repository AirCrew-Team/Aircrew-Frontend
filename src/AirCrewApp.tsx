import { Toaster } from "@/components/ui/sonner"
import AppRouter from "@/routes/AppRouter"

const AirCrewApp = () => (
  <>
    <AppRouter />
    <Toaster
      containerAriaLabel="Notificaciones"
      duration={4500}
      position="top-right"
      // Debajo del navbar (h-16 = 64 px), para no tapar el menú ni el perfil.
      offset={{ top: 80 }}
      mobileOffset={{ top: 72 }}
      richColors
    />
  </>
)

export default AirCrewApp
