# App/utils

Recursos compartidos por toda la aplicación.

- `fonts.ts`: módulo de efecto que registra las fuentes Inter y Space Grotesk. Se importa una vez en `main.tsx`.
- `typography.ts`: objeto `typography` con las clases de Tailwind de cada nivel de la escala tipográfica de `DESIGN.md` (`displayLg` … `labelSm`). Uso: `className={cn(typography.headlineMd, "text-brand-primary")}`.
- `icons.ts`: único punto de entrada de íconos. Reexporta los íconos de `lucide-react` con nombres semánticos (`NotificationsIcon`, `LogoutIcon`, …). Para agregar uno nuevo, reexpórtalo aquí.
- `brand.ts`: identidad de la marca (`BRAND.name`, `BRAND.tagline`, `BRAND.logoSrc`). El logo del navbar es `images/Logo1.png`; para cambiarlo, reemplaza el import.
- `images/`: imágenes de la marca, del Login (`Logotipo.png`, `LogoAC.png`, `Airplane.png`) y del Inicio del admin (`Logo1.png` en el navbar, `SuperA.jpg` en el banner). El favicon (`public/favicon.ico`) es el círculo del logo recortado, en 16, 24, 32 y 48 px.
