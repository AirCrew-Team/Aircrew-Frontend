# ADR 002: Estructura Interna del Repositorio

**Estado:** Aceptado

**Fecha:** 14 de octubre de 2026

**Autores:** Johan David Taborda Arroyave y Asley Torres Palacio

## Contexto

El ADR 001 definió el estilo arquitectónico del frontend: una arquitectura en capas organizada por páginas y módulos. Falta decidir cómo se organiza el código en tres niveles: dónde vive el frontend respecto al backend, qué patrón sigue el código por dentro y cómo se distribuyen las carpetas.

Varias condiciones del proyecto influyen en estas decisiones:

- El frontend (React con TypeScript) y el backend (Node.js con JavaScript, Express y PostgreSQL) usan lenguajes, herramientas, dependencias y procesos de compilación distintos.
- El equipo se divide por áreas: cada integrante trabaja principalmente en el frontend o en el backend.
- El frontend y el backend no comparten código: solo se comunican por HTTP a través del API gateway.
- Las reglas del negocio, como descartar candidatos o validar certificaciones y descansos, viven en el backend. El frontend presenta datos, envía las acciones del usuario y maneja la carga y los errores de cada sección.
- El plazo del producto mínimo viable es finales de noviembre.

## Decisión

### Nivel 1: repositorios

El proyecto usa una estrategia **multirepo**: el frontend y el backend están en repositorios separados dentro de la organización AirCrew-Team en GitHub, Aircrew-Frontend y Aircrew-Backend. Cada repositorio tiene su propio historial, sus propias ramas, su propia integración continua y su propio ciclo de despliegue. El único punto de unión entre ambos es el contrato de la API que expone el gateway.

### Nivel 2: patrón interno del código

El código del frontend sigue una **arquitectura en capas**, no hexagonal. Las dependencias van en un solo sentido, de arriba hacia abajo:

1. **Presentación:** páginas, módulos, diseños base y componentes.
2. **Consultas:** definen qué datos pide cada módulo y cómo se guardan en caché, con TanStack Query.
3. **Acciones:** hacen las peticiones al backend. Es la única capa que se comunica con él.
4. **Cliente HTTP:** una única instancia de Axios configurada con la dirección del gateway.

Ninguna capa conoce a las que están por encima de ella, y ningún componente salta capas para llamar directamente al backend.

### Nivel 3: estructura de carpetas

```
Aircrew-Frontend/
├── .github/workflows/   Integración continua: lint, compilación y escaneo de secretos
├── docs/
│   └── adr/             Registros de decisiones de arquitectura
└── src/
    ├── App/
    │   ├── actions/     Acciones, consultas y mutaciones de cada dominio
    │   ├── types/       Tipos de cada dominio y formato común de respuestas y errores
    │   └── utils/       Funciones auxiliares de la aplicación
    ├── components/
    │   ├── ui/          Componentes base de shadcn/ui
    │   └── custom/      Componentes propios: indicadores de carga, estados vacíos y errores de sección
    ├── hooks/           Hooks genéricos, como la detección de inactividad
    ├── layouts/         Un diseño base por vista: administrador, supervisor y tripulante
    ├── lib/             Utilidades de librerías externas
    ├── modules/         Secciones de pantalla agrupadas por página
    │   └── shared/      Secciones que usan varias páginas
    ├── pages/           Una página por pantalla, que solo compone módulos
    ├── routes/          Rutas, protección por rol y direcciones de la aplicación
    ├── service/         Cliente HTTP configurado con la dirección del gateway
    ├── stores/          Sesión y preferencias de la interfaz
    ├── tests/           Pruebas automatizadas
    └── AirCrewApp.tsx   Registra los proveedores globales de la aplicación
```

Cada capa del nivel 2 corresponde a un grupo de carpetas:

| Capa | Carpetas |
| --- | --- |
| Presentación | `pages`, `modules`, `layouts`, `components` |
| Consultas y acciones | `App/actions` |
| Cliente HTTP | `service` |
| Apoyo para todas las capas | `App/types`, `App/utils`, `hooks`, `lib`, `routes`, `stores` |

Reglas de organización:

- Las páginas solo componen módulos; cada módulo pide sus datos y maneja su carga y su error.
- El cliente HTTP solo se usa dentro de las acciones.
- Toda clave de consulta empieza por el nombre de su dominio.
- Un módulo nunca importa de la carpeta de otra página; lo compartido va en `modules/shared`.
- Los stores guardan solo estado del cliente; los datos del servidor viven en la caché de las consultas.

## Alternativas consideradas

- **Monorepo, con frontend y backend en un mismo repositorio (nivel 1):** permite cambiar ambos lados en un solo pull request. Sin embargo, mezcla lenguajes, herramientas y dependencias distintas, obliga a configurar la integración continua para que cada cambio solo ejecute las pruebas de su lado, y hace que el trabajo de un área afecte el historial y las ramas de la otra. Dentro del backend sí se usa un monorepo, porque sus seis servicios comparten herramientas e infraestructura; entre el frontend y el backend esa condición no se cumple.
- **Arquitectura hexagonal, de puertos y adaptadores (nivel 2):** aísla un núcleo de dominio de la infraestructura mediante interfaces (puertos) e implementaciones intercambiables (adaptadores). Es valiosa cuando hay mucha lógica de negocio que proteger o varias fuentes de datos que intercambiar, y en el frontend de AirCrew no se da ninguna de las dos: las reglas del negocio viven en el backend y la única fuente de datos es el gateway. Agregaría interfaces, adaptadores e inyección de dependencias sin un beneficio claro, y su principal ventaja, poder probar sin el backend real, ya se obtiene con MSW, que simula las respuestas de la API.
- **Organización por tipo de archivo (nivel 3):** carpetas planas de componentes, hooks y servicios para toda la aplicación. Es sencilla al inicio, pero a medida que crecen las pantallas mezcla en una misma carpeta código de vistas y roles distintos, y no deja ver qué secciones forman cada pantalla.

Se eligen el multirepo, las capas y la estructura por páginas y módulos porque separan lo que cambia por motivos distintos sin agregar herramientas ni conceptos que el proyecto todavía no necesita.

## Justificación

**Nivel 1: por qué multirepo**

- **Tecnologías distintas:** cada repositorio tiene solo las dependencias y herramientas que necesita.
- **Integración continua independiente:** un cambio en el frontend solo ejecuta el flujo del frontend, y lo mismo ocurre en el backend.
- **Despliegue independiente:** la aplicación web y los servicios se pueden publicar por separado, sin esperar al otro lado.
- **Trabajo por áreas:** cada área maneja sus ramas, sus pull requests y su protección de rama sin interferir con la otra.
- **Bajo acoplamiento:** como el único contrato es la API del gateway, el frontend no depende de cómo está organizado el backend por dentro.

**Nivel 2: por qué capas y no hexagonal**

- **Poca lógica de negocio en el frontend:** valida formularios, muestra datos y maneja la carga y los errores; las decisiones las toma el backend.
- **Aislamiento suficiente:** si cambia un endpoint, solo cambia su acción. La capa de acciones cumple el papel de un adaptador, sin la ceremonia de puertos e inyección de dependencias.
- **Simplicidad:** es más fácil de aprender y de seguir para un equipo pequeño con un plazo corto.
- **Encaje con las herramientas:** TanStack Query y Axios se usan de forma directa, cada una en su capa.

**Nivel 3: por qué esta estructura**

- **Ubicación predecible:** cada carpeta corresponde a una capa o a una responsabilidad, así que es fácil saber dónde va cada pieza de código.
- **Reflejo de la arquitectura:** agrupar los módulos por página sigue la organización por páginas y módulos del ADR 001; al abrir una página se ve qué secciones tiene la pantalla.
- **Separación de lo compartido:** `modules/shared` y `components/custom` evitan duplicar código entre roles.

## Consecuencias

**Ventajas:**

- Cada repositorio evoluciona, se prueba y se despliega a su propio ritmo.
- Un cambio en la API solo afecta a la capa de acciones del frontend.
- La estructura es predecible: cualquier integrante sabe dónde crear o buscar código.
- El patrón en capas es simple de mantener y de explicar.

**Desventajas:**

- Un cambio que afecta a ambos lados requiere dos pull requests coordinados, uno por repositorio.
- Los tipos de la API solo existen en el frontend, en `App/types`, porque el backend está escrito en JavaScript. Si el backend cambia la forma de una respuesta, nada lo detecta al compilar el frontend y los tipos pueden quedar desalineados. Se mitiga con los contratos documentados en la carpeta docs del backend y con los datos simulados de MSW, que siguen esos contratos.
- Las reglas de organización dependen de que el equipo las respete: nada impide por sí solo un import entre páginas o una llamada directa al cliente HTTP. Se pueden reforzar con reglas de importación en ESLint.