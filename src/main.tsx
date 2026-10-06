import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import AirCrewApp from "./AirCrewApp"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AirCrewApp />
    </ThemeProvider>
  </StrictMode>
)
