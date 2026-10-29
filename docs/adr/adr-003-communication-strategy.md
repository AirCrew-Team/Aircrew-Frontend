# ADR 003: Estrategia de Comunicación del Frontend

**Estado:** Aceptado

**Fecha:** 28 de octubre de 2026

**Autores:** Asley Torres Palacio, Samuel Arredondo Ospina y Johan David Taborda Arroyave

## Contexto

Los ADR 001 y 002 definieron cómo se organiza el frontend de AirCrew, una aplicación de página única en React con TypeScript (repositorio Aircrew-Frontend). Falta decidir cómo se comunica con el backend: qué tipo de comunicación usa, con qué tecnología y cómo se definen los contratos entre ambos lados.

Varias condiciones del proyecto influyen en esta decisión:

- El frontend solo se comunica con el API gateway (puerto 3000), que enruta cada petición `/api/<servicio>` a uno de los cinco servicios: flights, crew, recommendation, notification y admin. El navegador nunca llama directamente a un servicio.
- Dentro del backend, los servicios se comunican de forma síncrona por HTTP y sin bus de mensajes (ADR 002 del backend). Este ADR no cambia esa decisión: solo cubre el tramo entre el navegador y el gateway.
- La interfaz debe atender cuatro necesidades:
  1. **Operaciones habituales:** iniciar sesión, consultar vuelos y tripulantes, reportar una ausencia o aprobar un reemplazo.
  2. **Avisos al instante:** cuando se reporta una ausencia o cambia el estado de una propuesta, el usuario afectado debe verlo sin recargar la página. El escenario de calidad 2 exige que el aviso llegue en menos de 8 segundos.
  3. **Control operativo:** si un tripulante no confirma su asistencia al menos 5 horas antes del vuelo, el supervisor debe recibir una alerta para buscar un reemplazo.
  4. **Respuesta rápida:** el escenario de calidad 4 exige mostrar los 3 mejores candidatos en menos de 5 segundos.
- Hoy el frontend se entera de los cambios consultando en segundo plano: las propuestas pendientes cada 5 segundos con la vista abierta, la cobertura del día cada minuto y los catálogos cada 10 minutos, y la recarga se pausa cuando la pestaña no está visible.
- El backend está escrito en JavaScript, así que los tipos de la API solo existen en el frontend y pueden desalinearse (ADR 002).
- El sistema se despliega en Railway y el plazo del producto mínimo viable es finales de noviembre.

## Decisión

### 1. Tipo de comunicación

- **Del frontend al backend, asíncrona para el usuario:** cada petición viaja en segundo plano y la interfaz nunca se bloquea esperando la respuesta; mientras tanto, el usuario puede seguir trabajando en otras secciones. Cada llamada sigue el modelo de petición y respuesta.
- **Del backend al frontend, asíncrona por eventos:** el servidor avisa cuando algo cambia, sin que el frontend tenga que preguntar.

### 2. Tecnología

| Uso | Tecnología | Ejemplos |
| --- | --- | --- |
| Consultas y acciones del usuario | REST con JSON sobre HTTPS, con Axios y TanStack Query | Iniciar sesión, listar vuelos, reportar una ausencia, aprobar un reemplazo |
| Avisos del servidor | Server-Sent Events (SSE): un canal abierto por usuario que el gateway enruta al servicio notification | Ausencia reportada, propuesta actualizada, vuelo sin confirmar |
| Respaldo | Recarga periódica con TanStack Query | Mientras el canal de eventos no está disponible o se está reconectando |

Los eventos solo **avisan** que algo cambió: llevan el tipo de evento y los identificadores, no los datos completos. Al recibir uno, el frontend invalida la consulta correspondiente y vuelve a pedir los datos por REST, donde el gateway valida el rol. Quien no tiene la aplicación abierta recibe el aviso por correo, a través de Resend.

Catálogo inicial de eventos:

| Evento | Cuándo ocurre | Quién lo recibe | Qué hace el frontend |
| --- | --- | --- | --- |
| `ausencia.reportada` | Un tripulante reporta que no podrá presentarse | Supervisor y centro de control | Recarga las ausencias y muestra un aviso |
| `propuesta.asignada` | El supervisor envía la propuesta a un candidato | Tripulante candidato | Muestra la solicitud de cobertura |
| `propuesta.actualizada` | El candidato acepta o rechaza, o la propuesta vence | Supervisor | Recarga el estado de la propuesta |
| `vuelo.sin_confirmar` | Faltan 5 horas para el vuelo y un tripulante no ha confirmado | Supervisor | Muestra la alerta y marca el vuelo en riesgo |

La implementación va por etapas:

1. **Producto mínimo viable:** se mantiene la recarga periódica actual. Con 5 segundos entre consultas cumple el escenario 2 sin cambios en el backend.
2. **Después del producto mínimo viable:** notification expone el canal de eventos a través del gateway. Cuando está activo, la recarga de las propuestas pasa de 5 segundos a 1 minuto y queda solo como respaldo.

### 3. Contratos de comunicación

- **REST, con OpenAPI 3.1:** un archivo por servicio en la carpeta docs del backend, con las rutas, los parámetros, los cuerpos de petición y respuesta, los códigos de error y la seguridad de cada endpoint. El contrato se escribe y se revisa **antes** de programar el endpoint.
- **Eventos, con AsyncAPI 3.0:** un archivo para el canal de notification, con el nombre y los campos de cada evento del catálogo.
- **Uso en el frontend:** los tipos de TypeScript de `App/types` se generan desde los archivos OpenAPI en lugar de escribirse a mano, y los datos simulados de MSW siguen los mismos contratos. Así, el frontend puede avanzar antes de que el backend termine cada servicio, y un cambio en un contrato aparece como error de compilación al regenerar los tipos.
- **Cambios de contrato:** se proponen en un pull request del backend. Agregar campos opcionales no rompe a nadie; quitar o renombrar un campo, o cambiar su tipo, se avisa antes al frontend y se publica como una versión nueva del contrato.

## Buenas prácticas

- **Un solo punto de entrada:** todo pasa por el gateway. El navegador nunca llama directamente a un servicio, a la IA ni a Resend, y las claves de esos proveedores nunca llegan al frontend.
- **Sesión en una cookie httpOnly:** el navegador no permite agregar encabezados propios a un canal SSE, y poner el token en la dirección lo dejaría guardado en los registros. Por eso el JWT viaja en una cookie httpOnly, segura y enviada solo por HTTPS. El frontend y el gateway deben compartir un dominio propio (por ejemplo, `app.` y `api.` del mismo dominio), porque con dominios distintos el navegador trata la cookie como de terceros y puede bloquearla.
- **Formato común de errores:** todos los servicios responden los errores con el formato Problem Details (RFC 9457), que incluye el correlationId para rastrear en qué servicio falló la cadena.
- **correlationId en cada petición:** permite seguir una misma operación a través del gateway y de los servicios.
- **Tiempo máximo de espera:** 10 segundos en el cliente HTTP, más que la cadena de llamadas más larga del backend.
- **Reintentos solo en consultas:** las mutaciones no se reintentan solas. Además, reportar una ausencia o aprobar un reemplazo envía una clave única en el encabezado `Idempotency-Key`; si llega dos veces por un doble clic o por una falla de red, el backend la reconoce y no registra la operación dos veces.
- **Eventos sin datos personales:** como los eventos solo llevan identificadores, por el canal no viajan nombres, ubicaciones ni datos de contacto.
- **Latido y reconexión:** el canal SSE envía un latido cada 30 segundos, porque Railway cierra un canal que pasa 5 minutos sin datos y lo corta a los 15 minutos como máximo. El navegador reconecta solo y envía el identificador del último evento recibido, para que notification le reenvíe los que se perdió. Al reconectar, el frontend también recarga las consultas activas.
- **Listas paginadas y filtradas:** las listas grandes, como vuelos y tripulantes, se piden por páginas y con filtros, nunca completas.
- **Recarga solo con la pestaña visible:** la recarga periódica se pausa cuando la pestaña no está visible.

## Alternativas consideradas

- **Recarga periódica como mecanismo principal (short polling):** el frontend pregunta cada pocos segundos si hay cambios. Es lo que usa hoy y no requiere nada del backend, pero tiene tres problemas. Primero, el aviso puede tardar hasta un ciclo completo en llegar, y 5 segundos consumen buena parte del límite de 8 del escenario 2. Segundo, hace peticiones aunque no haya cambios: en la simulación de costos para Delta, las pantallas de supervisión generan el 24 % de las peticiones diarias. Tercero, gasta datos y batería en los teléfonos de los tripulantes. **Se descarta como mecanismo principal, pero se conserva para el producto mínimo viable y como respaldo.**
- **Long polling:** el servidor retiene cada petición hasta que hay un cambio. Reduce la demora, pero obliga a programar a mano la reconexión y la recuperación de eventos perdidos, que SSE ya trae resueltas en el navegador. **Descartada.**
- **WebSocket:** canal permanente en ambos sentidos. Es la mejor opción cuando el cliente también envía mensajes frecuentes, como en un chat, pero en AirCrew las acciones del usuario ya viajan por REST y el servidor solo necesita avisar. Además, el gateway tendría que manejar el cambio de protocolo, y la reconexión, los latidos y la autenticación habría que programarlos a mano. **Descartada; se reconsideraría si aparece una necesidad en ambos sentidos.**
- **SOAP, con contratos WSDL:** mensajes en XML con un sobre estándar, común en integraciones empresariales antiguas. Es pesado para una aplicación web que trabaja con JSON, el navegador no lo soporta de forma nativa y obliga a usar librerías adicionales sin aportar nada a este proyecto. **Descartada.**
- **GraphQL, con esquemas SDL:** permite que cada pantalla pida exactamente los campos que necesita. Sin embargo, exige un servidor GraphQL con resolvers que consulten a los cinco servicios, complica la caché frente a TanStack Query, que trabaja por recurso, y las necesidades de datos de cada pantalla ya son conocidas y estables. **Descartada.**
- **gRPC, con contratos .proto:** mensajes binarios sobre HTTP/2, muy eficientes entre servicios. Los navegadores no pueden llamarlo directamente: requiere gRPC-Web y un proxy intermedio, y el backend ya está construido con Express y REST. **Descartada para el frontend.**
- **Webhooks:** un servidor avisa a otro llamando a una dirección pública. Un navegador no tiene dirección pública, así que no puede recibirlos. **Descartados para el frontend;** en el backend sí pueden servir, por ejemplo para que Resend le informe a notification qué correos rebotaron.
- **Broker de mensajes hasta el navegador (por ejemplo, RabbitMQ):** el navegador no se conecta directamente a un broker, así que haría falta un puente adicional, y el ADR 002 del backend ya descartó los brokers para el producto mínimo viable. **Descartada.**

## Justificación

- **Cada necesidad con la herramienta más simple que la resuelve:** REST para lo que el usuario pide y SSE para lo que el servidor avisa, sin agregar servidores ni protocolos nuevos.
- **SSE funciona sobre HTTP normal:** pasa por el gateway y por Railway sin configuración especial, y Railway lo recomienda para avisos que van en un solo sentido. El navegador lo soporta de forma nativa, con reconexión automática.
- **Avisos al instante:** el evento llega en cuanto ocurre, en lugar de esperar hasta 5 segundos a la siguiente consulta, lo que deja margen para cumplir el escenario 2.
- **Coherencia con el backend:** no hay broker y notification, que ya es el servicio encargado de avisar, es quien mantiene el canal. Los servicios le siguen informando de los cambios por HTTP síncrono, como define el ADR 002 del backend.
- **Trabajo en paralelo con menos errores:** con los contratos definidos antes de programar, el frontend avanza con datos simulados mientras se construye cada servicio, y los tipos generados reducen el riesgo de desalineación del ADR 002.
- **Seguridad en un solo lugar:** el gateway valida la sesión y el rol en cada petición, y como los eventos no llevan datos, solo se ve lo que el rol permite pedir por REST.

## Consecuencias

**Ventajas:**

- La interfaz nunca se bloquea: si buscar un reemplazo toma unos segundos, el usuario sigue trabajando y un aviso le informa el resultado.
- Las ausencias, los cambios de las propuestas y los vuelos sin confirmar aparecen de inmediato en la pantalla de quien debe verlos.
- El frontend y el backend avanzan en paralelo sobre contratos acordados, y un cambio incompatible se detecta al compilar el frontend.
- Bajan las peticiones de las pantallas de supervisión, aunque el ahorro en dinero es pequeño: en la simulación para Delta serían unos US$4 al mes. El beneficio principal es la rapidez del aviso.

**Desventajas y cómo se controlan:**

- **Trabajo adicional en el backend:** notification debe mantener los canales abiertos y el gateway reenviarlos sin cortarlos. Mientras tanto, el producto mínimo viable sigue con la recarga periódica, así que el plazo no se ve afectado.
- **Conexiones abiertas en memoria:** cada canal ocupa memoria en notification, y Railway cobra por RAM. Por eso solo se abre un canal por usuario con la aplicación abierta, no uno por pantalla.
- **Varias réplicas de notification:** un evento que llega a una réplica debe alcanzar a los usuarios conectados a otra. Se puede resolver con LISTEN/NOTIFY de PostgreSQL, que ya forma parte de la arquitectura, sin agregar un broker.
- **Cortes del canal:** Railway lo cierra a los 15 minutos, y un teléfono puede perder la señal. El navegador reconecta solo y pide los eventos perdidos con el identificador del último recibido; para eso, notification debe guardar los eventos recientes durante un tiempo.
- **Claves de idempotencia:** el backend debe guardarlas durante un tiempo, por ejemplo 24 horas, para reconocer las operaciones repetidas.
- **Sesión en cookie:** el backend envía el JWT en una cookie httpOnly, así que el gateway debe permitir credenciales en CORS, y el frontend y el gateway deben publicarse bajo el mismo dominio propio para que el navegador no bloquee la cookie.
- **Servicio caído:** solo el módulo que depende de él muestra el error y el resto de la aplicación sigue funcionando, como define el ADR 001. Si el caído es notification, el frontend vuelve a la recarga periódica.
- **Disciplina con los contratos:** los archivos OpenAPI y AsyncAPI solo sirven si se mantienen al día; por eso cada cambio de un endpoint o de un evento se revisa junto con su contrato en el mismo pull request.

