# ADR 001: Selección de Estilo Arquitectónico

**Estado:** Aceptado

**Fecha:** 11 de octubre de 2026

**Autores:** Johan David Taborda Arroyave y Asley Torres Palacio

## Contexto

AirCrew es una aplicación web para la gestión de tripulaciones aéreas, desarrollada en React y TypeScript. Una sola aplicación atiende a cuatro roles a través de tres vistas: el administrador, el supervisor y el tripulante tienen cada uno su propia vista, y el centro de control de operaciones usa la vista del supervisor en modo de solo lectura. El frontend se comunica con el backend exclusivamente a través del API gateway.

Varias condiciones del proyecto influyen en cómo organizar el código:

- Las pantallas combinan información de varios microservicios. Por ejemplo, el inicio del supervisor reúne ausencias, propuestas de reemplazo y cobertura de vuelos.
- Algunas respuestas tardan varios segundos, porque el backend responde solo cuando termina toda su cadena de llamadas entre servicios.
- Si un servicio falla, la pantalla completa no debe caerse, en línea con el objetivo específico de que la falla de un módulo no interrumpa a los demás.
- La mantenibilidad es uno de los atributos de calidad del proyecto, y el equipo es pequeño y trabaja en paralelo.

## Decisión

Se selecciona una **arquitectura en capas**, complementada con una organización por **páginas y módulos**.

Las capas son:

1. **Presentación:** páginas y módulos. Cada pantalla es una página que solo compone módulos, y cada módulo es una sección completa que pide sus propios datos y maneja su carga y su error.
2. **Consultas:** definen qué datos pide cada módulo y cómo se guardan en caché, con TanStack Query.
3. **Acciones:** hacen las peticiones al backend. Es la única capa que se comunica con él.
4. **Cliente HTTP:** una única instancia configurada con la dirección del API gateway.

Cada capa solo usa a la siguiente, y ningún componente se comunica con el backend por fuera de ese camino.

## Alternativas consideradas

- **MVC (Modelo-Vista-Controlador):** separa responsabilidades, pero está pensado para aplicaciones en las que el servidor genera las vistas. En una SPA con React no hay un lugar natural para el controlador, y la lógica termina mezclada en los componentes. Además, no resuelve cómo dividir pantallas que combinan datos de varios servicios.
- **Micro-frontends:** dividir la interfaz en aplicaciones independientes, por ejemplo una por rol, encaja con un backend de microservicios. Sin embargo, es demasiado complejo para el tamaño del equipo, obliga a coordinar varias compilaciones y despliegues, y duplicaría código entre roles que ven información parecida.

Se elige la arquitectura en capas con páginas y módulos porque organiza a la vez las responsabilidades técnicas, mediante las capas, y las funcionalidades del sistema, mediante las páginas y los módulos, sin la complejidad de los micro-frontends.

## Justificación

- **Pantallas que combinan varios servicios:** como cada módulo pide sus propios datos, si un servicio falla solo su módulo muestra el error y el resto de la pantalla sigue funcionando.
- **Respuestas que tardan:** mientras una petición está en curso, solo el módulo que la hizo muestra su indicador de carga; el resto de la interfaz sigue disponible.
- **Mantenibilidad:** cada capa cambia por un motivo distinto. Un endpoint nuevo solo toca su acción, un rediseño solo la presentación y un cambio de gateway solo la configuración del cliente HTTP.
- **Bajo acoplamiento con el backend:** centralizar las peticiones en la capa de acciones y en un único cliente HTTP evita que los componentes dependan de la API.
- **Reutilización entre roles:** un módulo, como el resumen de un vuelo, se escribe una vez y lo usa cualquier rol que lo necesite. El centro de control reutiliza las páginas del supervisor, y cada módulo oculta lo que su rol no permite.
- **Trabajo en paralelo:** como cada módulo es independiente, varios integrantes pueden trabajar al mismo tiempo con menos conflictos al integrar.

## Consecuencias

**Ventajas:**

- Facilita el mantenimiento y la ampliación de la aplicación.
- Favorece la reutilización de módulos y componentes entre roles.
- Permite desarrollar y probar cada módulo de forma independiente.
- Aísla las fallas: un servicio caído solo afecta a los módulos que dependen de él.
- Reduce el acoplamiento entre la interfaz y el backend.

**Desventajas:**

- Requiere definir y respetar convenciones claras para organizar el código.
- Aumenta la cantidad inicial de carpetas y archivos.
- Exige controlar las dependencias entre capas y módulos; por ejemplo, un módulo no debe importar de la carpeta de otra página.
- Una pantalla hace varias peticiones independientes, una por módulo. Esto se compensa con la caché de TanStack Query, que evita pedir dos veces el mismo dato.
- Depende de acordar con el backend los contratos de cada endpoint.
