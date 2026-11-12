import { describe, expect, it } from "vitest"

// IS-02 (spec docs/specs/inicio-supervisor.md): los componentes compartidos del Inicio del
// admin y del supervisor viven en modules/shared/opsHome y no dependen de ninguna de las dos
// pantallas. import.meta.glob lee el código fuente en la transformación del test (?raw).

const sharedSources = import.meta.glob<string>(
  "/src/modules/shared/opsHome/**/*.{ts,tsx}",
  { query: "?raw", import: "default", eager: true }
)

const adminModuleCard = import.meta.glob(
  "/src/modules/adminHome/components/AdminModuleCard.tsx"
)

describe("Componentes compartidos del Inicio operativo (IS-02)", () => {
  it("IS-02 modules/shared/opsHome tiene al menos un archivo", () => {
    expect(Object.keys(sharedSources).length).toBeGreaterThan(0)
  })

  it("IS-02 ningún archivo de modules/shared/opsHome importa de adminHome ni de supervisorHome", () => {
    // Con alias (@/modules/adminHome) o con ruta relativa (../../adminHome/…).
    const forbidden = /from\s+["'][^"']*\b(adminHome|supervisorHome)\b/
    const offenders = Object.entries(sharedSources)
      .filter(
        ([, source]) =>
          source.includes("@/modules/adminHome") ||
          source.includes("@/modules/supervisorHome") ||
          forbidden.test(source)
      )
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })

  it("IS-02 adminHome/components/AdminModuleCard.tsx ya no existe", () => {
    expect(Object.keys(adminModuleCard)).toEqual([])
  })
})
