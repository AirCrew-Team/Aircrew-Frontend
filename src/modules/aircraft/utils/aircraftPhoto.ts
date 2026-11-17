import fleetPhoto from "@/App/utils/images/Airplane.png"

// Foto que se muestra: la de la aeronave o, si no tiene, la imagen genérica de la flota.
export const aircraftPhotoSrc = (photoUrl: string | null) =>
  photoUrl ?? fleetPhoto
