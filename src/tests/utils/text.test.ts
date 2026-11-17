import { describe, expect, it } from "vitest"

import { initialsOf } from "@/App/utils/text"

// initialsOf: iniciales del primer nombre y del último apellido. Se extrajo a App/utils en
// su tercer uso (Recomendaciones, Ausencias y Tripulación).

describe("initialsOf", () => {
  it.each([
    ["Juan Pablo Navarro", "JN"],
    ["Laura Gómez", "LG"],
    ["Luis Fernando Arango", "LA"],
    ["Óscar Pineda", "ÓP"],
    ["Camila", "C"],
    ["", ""],
  ])("«%s» → «%s»", (fullName, expected) => {
    expect(initialsOf(fullName)).toBe(expected)
  })
})
