import { describe, expect, it } from "vitest"

import { crewRequirement } from "@/modules/adminFlights/utils/crewRequirement"

// Puestos de la tripulación: las mismas reglas del backend (crewComplement.js), con el
// nombre del cargo «auxiliar de vuelo» en vez de «TCP».
describe("crewRequirement", () => {
  it("hasta 50 sillas: solo el Jefe de Cabina en la cabina", () => {
    expect(crewRequirement(50, 120)).toEqual({
      slots: 3,
      text: "Capitán · Primer Oficial · Jefe de Cabina",
    })
  })

  it("1 auxiliar de vuelo en singular y varios en plural", () => {
    expect(crewRequirement(76, 120).text).toBe(
      "Capitán · Primer Oficial · Jefe de Cabina · 1 auxiliar de vuelo"
    )
    expect(crewRequirement(194, 120).text).toBe(
      "Capitán · Primer Oficial · Jefe de Cabina · 3 auxiliares de vuelo"
    )
  })

  it("más de 8 h agrega el piloto de relevo", () => {
    expect(crewRequirement(281, 525)).toEqual({
      slots: 9,
      text: "Capitán · Primer Oficial · Piloto de relevo · Jefe de Cabina · 5 auxiliares de vuelo",
    })
  })
})
