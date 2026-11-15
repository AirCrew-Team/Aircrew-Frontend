// La contraseña actual no coincide: el panel lo muestra en «Contraseña Actual» y lo
// enfoca. Lo lanza el changePassword de cada módulo (con la API, un 4xx del backend).
export class CurrentPasswordError extends Error {}
