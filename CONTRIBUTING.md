# Cómo contribuir

Gracias por ayudar a mejorar AirCrew. Esta guía resume cómo trabaja el equipo.

## Flujo de trabajo

1. Crea tu rama desde `develop` actualizada:
   - `feature/<nombre>` para funcionalidades nuevas, por ejemplo `feature/supervisor-crew`;
   - `fix/<nombre>` para correcciones.
2. Haz cambios pequeños y enfocados. No refactorices lo que no forma parte de tu tarea.
3. Abre un pull request hacia `develop`. Los cambios se integran con squash merge.

## Antes de abrir el pull request

Revisa que todo pase en local:

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
pnpm test:e2e
```

El CI ejecuta el escaneo de secretos (Gitleaks), el lint, las pruebas unitarias, el build y las pruebas E2E con Playwright en cada push y pull request a `main` y `develop`.

## Commits

Usa [Conventional Commits](https://www.conventionalcommits.org/es/) en inglés, como el historial del repositorio:

```text
feat: add supervisor crew screen
fix: connect login to the session
docs: redesign README
```

## Estilo de código

- Prettier: comillas dobles, sin punto y coma y 2 espacios. Ejecuta `pnpm format` o formatea solo tus archivos.
- Usa el alias `@/` para importar desde `src/` e `import type` para los tipos.
- Cada pantalla es una página en `src/pages/` que solo compone módulos de `src/modules/<página>/`. Un módulo no importa de la carpeta de otra página; lo que usan dos pantallas va en `src/modules/shared/`.
- Los íconos se importan solo desde `src/App/utils/icons.ts`.
- No instales dependencias nuevas sin acordarlo antes con el equipo.

## Pruebas

- Las pruebas unitarias van en `src/tests/` con Vitest y Testing Library.
- Los flujos completos en navegador real van en `e2e/` con Playwright. Úsalos solo para lo que jsdom no puede comprobar (layout, imágenes, animaciones) y para los flujos críticos; no repitas lo que ya cubren las unitarias.
- En la lógica (rutas por rol, hooks, utilidades, estados), escribe primero la prueba que falla y después el código.
- En los componentes, prueba el comportamiento que importa (qué se ve según el rol y las interacciones), sin snapshots masivos.

## Arquitectura

Antes de cambiar la estructura, lee los [ADR](docs/adr/) del proyecto.

## Seguridad

Nunca subas el archivo `.env` ni claves o tokens. Las variables `VITE_` terminan en el navegador, así que no deben contener secretos.
