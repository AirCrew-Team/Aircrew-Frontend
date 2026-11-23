import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { logout as logoutRequest } from "@/App/actions/auth/auth.actions"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Spec cierre-por-inactividad: aviso a los 4:30 y cierre a los 5:00 sin actividad.
const WARNING_AFTER_MS = 270_000
const LOGOUT_AFTER_MS = 300_000

// Solo lo que hace la persona (los avisos en vivo y las recargas no cuentan). En captura,
// para atrapar también el scroll de cualquier elemento, que no burbujea.
const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const
const LISTENER_OPTIONS = { capture: true, passive: true }

// Las pestañas abiertas de la app se avisan por este canal. «logout»: cierre por
// inactividad (con su toast); «signout»: cierre deliberado de la persona (sin toast).
const CHANNEL_NAME = "aircrew-session"
type SessionMessage = { type: "activity" | "stay" | "logout" | "signout" }

// «Cerrar sesión» del navbar: las demás pestañas cierran en local y no vencen después
// por su cuenta (con su POST y su toast de inactividad) sobre una sesión nueva.
export const announceSignout = () => {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type: "signout" } satisfies SessionMessage)
  channel.close()
}

const IDLE_TOAST = "Tu sesión se cerró por inactividad."

// Igual que «Cerrar sesión» del navbar: la sesión del navegador se cierra aunque la
// llamada al backend falle.
const endSession = async () => {
  try {
    await logoutRequest()
  } catch {
    // Sin backend o con error, la sesión del navegador se cierra igual.
  }
  useAuthStore.getState().logout()
}

// Cierra la sesión tras 5 minutos sin actividad en ninguna pestaña. El vencimiento se
// calcula con la hora de la última actividad, no contando ticks, porque el navegador
// ralentiza los temporizadores de las pestañas en segundo plano. Montar una sola vez,
// con sesión. `secondsLeft` es la cuenta atrás del aviso (null: sin aviso).
export const useIdleLogout = () => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const lastActivityRef = useRef(0)
  // Ya se está cerrando la sesión: nada más debe avisar, cerrar ni llamar al backend.
  const closingRef = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const restart = useCallback(() => {
    lastActivityRef.current = Date.now()
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    lastActivityRef.current = Date.now()
    let lastPostAt = 0

    // Solo esta pestaña (la que vence) llama al backend; las demás cierran en local.
    const expire = async () => {
      closingRef.current = true
      setSecondsLeft(null)
      channel.postMessage({ type: "logout" } satisfies SessionMessage)
      const user = useAuthStore.getState().user
      if (!isDemoUser(user)) {
        try {
          await logoutRequest()
        } catch {
          // Sin backend o con error, la sesión del navegador se cierra igual.
        }
      }
      // Otra vía (el 401 global, `auth:expired`) pudo cerrarla mientras tanto, con su aviso.
      if (useAuthStore.getState().user === null) return
      useAuthStore.getState().logout()
      toast.info(IDLE_TOAST)
    }

    const check = () => {
      if (closingRef.current) return
      const idle = Date.now() - lastActivityRef.current
      if (idle >= LOGOUT_AFTER_MS) void expire()
      else if (idle >= WARNING_AFTER_MS)
        setSecondsLeft(Math.ceil((LOGOUT_AFTER_MS - idle) / 1000))
      else setSecondsLeft(null)
    }

    // Con el aviso abierto (o ya vencido el plazo del aviso) la actividad no cuenta: solo
    // «Seguir conectado» reinicia. Se publica como mucho una vez por segundo.
    const onActivity = () => {
      const now = Date.now()
      const warned = now - lastActivityRef.current >= WARNING_AFTER_MS
      if (closingRef.current || warned) return
      lastActivityRef.current = now
      if (now - lastPostAt < 1000) return
      lastPostAt = now
      channel.postMessage({ type: "activity" } satisfies SessionMessage)
    }

    // La actividad en otra pestaña también cierra el aviso de esta: si no, esta vencería
    // y cerraría la sesión de todas mientras la persona sigue trabajando en la otra.
    channel.onmessage = ({ data }: MessageEvent<SessionMessage>) => {
      if (closingRef.current) return
      if (data.type === "activity" || data.type === "stay") {
        restart()
        return
      }
      closingRef.current = true
      useAuthStore.getState().logout()
      if (data.type === "logout") toast.info(IDLE_TOAST)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check()
    }

    // Una pestaña recién abierta (o tras un login nuevo) sincroniza a las demás: si no,
    // una pestaña con el contador viejo cerraría la sesión que se acaba de abrir.
    channel.postMessage({ type: "activity" } satisfies SessionMessage)

    const interval = window.setInterval(check, 1000)
    document.addEventListener("visibilitychange", onVisibilityChange)
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, LISTENER_OPTIONS)
    }

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, onActivity, LISTENER_OPTIONS)
      }
      channel.close()
      if (channelRef.current === channel) channelRef.current = null
    }
  }, [restart])

  // «Seguir conectado», Escape, la X o el fondo del aviso.
  const stay = () => {
    if (closingRef.current) return
    restart()
    channelRef.current?.postMessage({ type: "stay" } satisfies SessionMessage)
  }

  // «Cerrar sesión» del aviso: decisión de la persona, sin el toast de inactividad.
  const logoutNow = () => {
    if (closingRef.current) return
    closingRef.current = true
    channelRef.current?.postMessage({
      type: "signout",
    } satisfies SessionMessage)
    void endSession()
  }

  return { secondsLeft, stay, logoutNow }
}
