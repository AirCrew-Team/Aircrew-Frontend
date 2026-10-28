import LoginPage from "@/pages/LoginPage"
import { Toaster } from "@/components/ui/sonner"

const AirCrewApp = () => (
  <>
    <LoginPage />
    <Toaster duration={4500} position="top-right" richColors />
  </>
)

export default AirCrewApp
