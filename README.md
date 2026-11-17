<div align="center">

<img src="src/App/utils/images/LogoAC.png" alt="Logo de AirCrew" width="220">

# AirCrew Frontend

Interfaz web para gestionar tripulaciones aéreas: tripulantes, supervisores y administradores coordinan vuelos, ausencias y reemplazos desde una sola aplicación.

[![CI](https://github.com/AirCrew-Team/Aircrew-Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/AirCrew-Team/Aircrew-Frontend/actions/workflows/ci.yml)
![Versión](https://img.shields.io/badge/versión-0.1.0-0b3a66)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

</div>

<!-- TODO: agregar captura -->
<p align="center">
  <img src="docs/assets/captura-pendiente.svg" alt="Captura de AirCrew (pendiente)" width="800">
</p>

## Tabla de contenido

- [¿Por qué?](#por-qué)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Inicio rápido](#inicio-rápido)
- [Uso](#uso)
- [Configuración](#configuración)
- [Arquitectura](#arquitectura)
- [Pruebas](#pruebas)
- [Hoja de ruta](#hoja-de-ruta)
- [Contribuir](#contribuir)
- [Licencia](#licencia)
- [Contacto](#contacto)

## ¿Por qué?

Cuando un tripulante no puede volar, encontrar un reemplazo suele depender de llamadas y hojas de cálculo, y cada minuto cuenta antes de la salida. AirCrew reúne en un solo lugar la programación, las ausencias, las certificaciones y los reemplazos, para que cada rol vea solo lo que necesita para actuar a tiempo.

## Funcionalidades

- **Una vista para cada rol.** Tripulante, supervisor y administrador entran por el mismo Login y cada uno ve su propio menú, así nadie se pierde entre opciones que no le corresponden.
- **Tripulaciones armadas sin errores.** El supervisor asigna la tripulación de cada vuelo de su base: solo ve a quien cumple las reglas (habilitación, descanso, horas, certificado médico) y puede pedir a la IA una sugerencia antes de confirmar.
- **Reemplazos más rápidos.** El supervisor ve quién de su base está de guardia y disponible, revisa los candidatos que propone el sistema, aprueba uno y sigue cada ausencia hasta que el reemplazo se confirma.
- **Ausencias sin papeleo.** El tripulante avisa al centro de control desde la app, con el motivo y el soporte médico, y quien lo cubra recibe la asignación en su Inicio.
- **Certificaciones al día.** Tripulantes y administradores ven qué licencias y exámenes vencen pronto, antes de que dejen a alguien sin poder volar.
- **Perfil propio.** Cada usuario actualiza sus datos de contacto, su foto, su contraseña y los avisos que quiere recibir.

## Stack tecnológico

| Área | Tecnologías |
| --- | --- |
| Base | ![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white) ![React Router](https://img.shields.io/badge/React_Router_8-CA4245?logo=reactrouter&logoColor=white) |
| Interfaz | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white) ![Lucide](https://img.shields.io/badge/Lucide-F56565?logo=lucide&logoColor=white) |
| Estado y datos | ![TanStack Query](https://img.shields.io/badge/TanStack_Query_5-FF4154?logo=reactquery&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand_5-443E38) ![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white) |
| Formularios | ![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?logo=reacthookform&logoColor=white) ![Zod](https://img.shields.io/badge/Zod_4-3E67B1?logo=zod&logoColor=white) |
| Pruebas y calidad | ![Vitest](https://img.shields.io/badge/Vitest_5-6E9F18?logo=vitest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?logo=testinglibrary&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=black) |

## Inicio rápido

**Requisitos**

- [Node.js](https://nodejs.org/) 22.22 o superior (el CI usa Node 24).
- [pnpm](https://pnpm.io/) 10.26, la versión fijada en `package.json`. Con Corepack se activa sola.

```bash
# 1. Clonar el repositorio
git clone https://github.com/AirCrew-Team/Aircrew-Frontend.git
cd Aircrew-Frontend

# 2. Activar pnpm (si no lo tienes) e instalar las dependencias
corepack enable
pnpm install

# 3. Crear el archivo de variables de entorno
cp .env.template .env

# 4. Levantar el servidor de desarrollo
pnpm dev
```

La app queda en <http://localhost:5173> (si el puerto está ocupado, Vite usa el siguiente libre).

> [!WARNING]
> El archivo `.env` es local y está en `.gitignore`. No lo subas al repositorio: el CI busca secretos con Gitleaks en cada push y pull request.

## Uso

La app arranca en el Login. Cada rol (tripulante, supervisor y administrador) ve su propio menú y sus propias pantallas.

Para recorrerla en desarrollo (`pnpm dev`), usa el selector **«Rol (dev)»** del Login: entra con el rol que elijas sin escribir credenciales y te deja cambiar de rol al instante. No se incluye en el build de producción.

> [!NOTE]
> Por ahora no hay backend conectado: las cuentas y todos los datos son simulados y viven en memoria, así que se reinician al recargar la página.

<details>
<summary>Generar y revisar el build de producción</summary>

```bash
pnpm build     # revisa los tipos con tsc y compila con Vite en dist/
pnpm preview   # sirve el build localmente
```

</details>

## Configuración

Las variables se leen desde `.env` (plantilla en [`.env.template`](.env.template)).

| Variable | Descripción | Por defecto | Obligatoria |
| --- | --- | --- | --- |
| `VITE_URL_API_BACKEND` | URL del API gateway que usa el cliente HTTP (`src/service/api-client.ts`). | — | Sí, cuando se conecte la API. Hoy la app funciona con datos simulados y no la usa. |

> [!TIP]
> Las variables con prefijo `VITE_` terminan dentro del bundle que descarga el navegador. Nunca guardes claves ni secretos en ellas.

## Arquitectura

Arquitectura en capas organizada por páginas y módulos. Cada página solo compone módulos, y cada módulo pide sus propios datos y maneja su carga y su error, para que la falla de uno no tumbe la pantalla.

```mermaid
flowchart LR
    P[Páginas] --> M[Módulos]
    M --> Q[Consultas<br/>TanStack Query]
    Q --> A[Acciones<br/>App/actions]
    A --> H[Cliente HTTP<br/>Axios]
    H --> G[(API gateway)]
```

```text
src/
├── App/            # Acciones (única capa que llama al backend), tipos por dominio y recursos compartidos
├── components/     # Componentes base de shadcn/ui (ui/) y componentes propios genéricos (custom/)
├── hooks/          # Hooks genéricos, como la detección de inactividad
├── layouts/        # Diseño base compartido por todos los roles (navbar + contenido)
├── lib/            # Utilidades de librerías externas
├── modules/        # Secciones de cada pantalla, agrupadas por página; lo común va en shared/
├── pages/          # Una página por pantalla, agrupadas por rol
├── routes/         # Rutas, navegación y protección por rol
├── service/        # Cliente HTTP configurado con la URL del gateway
├── stores/         # Estado del cliente con Zustand (sesión)
└── tests/          # Pruebas unitarias y de componentes (Vitest) y su configuración
e2e/                # Pruebas de extremo a extremo (Playwright) y sus ayudas
docs/
├── adr/            # Decisiones de arquitectura
└── assets/         # Imágenes del README
```

Las decisiones de diseño están documentadas en los ADR:

- [ADR 001: Selección de estilo arquitectónico](docs/adr/adr-001-architectural-style-selection.md)
- [ADR 002: Estructura interna del repositorio](docs/adr/adr-002-Internal-Structure-Repository.md)
- [ADR 003: Estrategia de comunicación del frontend](docs/adr/adr-003-communication-strategy.md)

## Pruebas

El proyecto tiene dos niveles de pruebas, y el CI ejecuta los dos en cada push y pull request.

| Nivel | Herramienta | Dónde | Qué cubre |
| --- | --- | --- | --- |
| Unitarias y de componentes | Vitest + Testing Library (jsdom) | `src/tests/` | Lógica, rutas por rol, estados de carga y error, formularios e interacciones de cada pantalla |
| De extremo a extremo (E2E) | Playwright (Chromium) | `e2e/` | Flujos completos en un navegador real, contra el build de producción, en escritorio y en un móvil emulado |

### Unitarias

```bash
pnpm test:run    # ejecuta todas las pruebas una vez
pnpm test        # modo watch
pnpm typecheck   # revisión de tipos
pnpm lint        # ESLint
```

> [!TIP]
> `pnpm test:run` oculta la consola de las pruebas que pasan. Para ver los avisos de React o React Router, usa `pnpm exec vitest run --silent=false`.

### De extremo a extremo (Playwright)

Prueban lo que jsdom no puede ver: el layout real, las vistas previas de imágenes, las animaciones y el foco, además de los flujos críticos de cada rol:

- login por rol, credenciales incorrectas y protección de rutas;
- aprobar un reemplazo (supervisor) y reportar una ausencia (tripulante);
- el scroll de Ausencias, que muestra exactamente 2 tarjetas completas por columna;
- filtros y búsqueda de Tripulación;
- armar y confirmar la tripulación de un vuelo en Programación (a mano y con la sugerencia de la IA);
- foto de perfil y cambio de contraseña en Configuración;
- el menú del navbar en móvil;
- una revisión automática de accesibilidad (WCAG 2.1 AA) con axe en las pantallas principales.

La primera vez, descarga el navegador:

```bash
pnpm exec playwright install chromium
```

Después:

```bash
pnpm test:e2e                          # compila la app, la sirve y ejecuta todas las pruebas
pnpm test:e2e:ui                       # modo interactivo para ver y depurar cada paso
pnpm exec playwright test --project=movil   # solo las pruebas del móvil emulado
pnpm exec playwright show-report       # abre el reporte HTML de la última ejecución
```

> [!NOTE]
> Playwright compila la app (`pnpm build`) y la sirve con `vite preview` en el puerto 4173 antes de probar; no hace falta tener `pnpm dev` abierto. Si una prueba falla, el reporte guarda la captura, el video y la traza del fallo. En el CI se sube como artefacto `playwright-report`.

## Hoja de ruta

- [x] Login con cuentas de prueba y recuperación de contraseña
- [x] Tripulante: Inicio, Mis Vuelos, Reportar Ausencia, Certificaciones y Configuración
- [x] Supervisor: Inicio, Programación, Recomendaciones, Ausencias, Tripulación y Configuración
- [ ] Tripulante: ver en «Mis Vuelos» las asignaciones que confirma el supervisor
- [x] Administrador: Inicio, Usuarios, Certificaciones y Configuración
- [ ] Administrador: Reportes y Aeronaves
- [ ] Conectar con el API gateway (capa `App/actions` y cliente HTTP)
- [x] Ejecutar las pruebas unitarias y E2E en el CI

## Contribuir

Las ramas salen de `develop` y vuelven a ella por pull request. Lee la [guía de contribución](CONTRIBUTING.md) antes de abrir uno.

## Licencia

> [!NOTE]
> El proyecto todavía no tiene una licencia definida. Mientras tanto, todos los derechos están reservados por sus autores.

## Contacto

Proyecto del equipo [AirCrew-Team](https://github.com/AirCrew-Team). Autores: Johan David Taborda Arroyave, Asley Torres Palacio y Samuel Arredondo Ospina.

Para reportar un error o proponer una mejora, abre un [issue](https://github.com/AirCrew-Team/Aircrew-Frontend/issues).
