# App/utils

Recursos compartidos por toda la aplicación.

- `fonts.ts`: módulo de efecto que registra las fuentes Inter y Space Grotesk. Se importa una vez en `main.tsx`.
- `typography.ts`: objeto `typography` con las clases de Tailwind de cada nivel de la escala tipográfica de `DESIGN.md` (`displayLg` … `labelSm`). Uso: `className={cn(typography.headlineMd, "text-brand-primary")}`.
- `icons.ts`: único punto de entrada de íconos. Reexporta los íconos de `lucide-react` con nombres semánticos (`NotificationsIcon`, `LogoutIcon`, …). Para agregar uno nuevo, reexpórtalo aquí.
- `brand.ts`: identidad de la marca (`BRAND.name`, `BRAND.tagline`, `BRAND.logoSrc`). El logo es `images/Logotipo.png`; para cambiarlo, reemplaza el import.
- `images/`: imágenes de la marca y del Login (`Logotipo.png`, `LogoAC.png`, `Airplane.png`). El favicon (`public/favicon.ico`) es el círculo del logo recortado, en 16, 24, 32 y 48 px.
