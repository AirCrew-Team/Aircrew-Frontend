import { StrictMode } from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import UtcClock from "@/modules/home/components/UtcClock"

const CLOCK_FORMAT = /^\d{2}:\d{2}:\d{2}Z$/

const getTime = (container: HTMLElement) => {
  const time = container.querySelector("time")
  expect(time).not.toBeNull()
  return time as HTMLTimeElement
}

describe("UtcClock: hora UTC en vivo", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 09:05:07 UTC. En Bogotá (UTC-5) serían las 04:05:07: así se distingue UTC de la hora local.
    vi.setSystemTime(new Date("2026-10-28T09:05:07Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("HT-06: desde el primer render muestra la hora UTC actual en formato HH:MM:SSZ", () => {
    const { container } = render(<UtcClock />)

    const time = getTime(container)
    expect(time.textContent).toMatch(CLOCK_FORMAT)
    expect(time).toHaveTextContent("09:05:07Z")
  })

  it("HT-06: al avanzar 1 s el texto pasa al segundo siguiente", () => {
    const { container } = render(<UtcClock />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(getTime(container)).toHaveTextContent("09:05:08Z")

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(getTime(container)).toHaveTextContent("09:05:09Z")
  })

  it("HT-07: al desmontarse no deja ningún temporizador activo", () => {
    expect(vi.getTimerCount()).toBe(0)

    // StrictMode monta, desmonta y vuelve a montar: un intervalo sin limpiar se quedaría duplicado.
    const { unmount } = render(
      <StrictMode>
        <UtcClock />
      </StrictMode>
    )
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  it("HT-09: la hora va en un <time> y ni el reloj ni sus contenedores tienen aria-live", () => {
    const { container } = render(<UtcClock />)

    const time = getTime(container)
    for (
      let element: HTMLElement | null = time;
      element;
      element = element.parentElement
    ) {
      expect(element).not.toHaveAttribute("aria-live")
    }
  })
})
