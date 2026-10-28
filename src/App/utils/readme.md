# App/utils

Recursos compartidos por toda la aplicación.

- `fonts.ts`: módulo de efecto que registra las fuentes Inter y Space Grotesk. Se importa una vez en `main.tsx`.
- `typography.ts`: objeto `typography` con las clases de Tailwind de cada nivel de la escala tipográfica de `DESIGN.md` (`displayLg` … `labelSm`). Uso: `className={cn(typography.headlineMd, "text-brand-primary")}`.
- `icons.ts`: único punto de entrada de íconos. Reexporta los íconos de `lucide-react` con nombres semánticos (`NotificationsIcon`, `LogoutIcon`, …). Para agregar uno nuevo, reexpórtalo aquí.
- `brand.ts`: identidad de la marca (`BRAND.name`, `BRAND.tagline`, `BRAND.logoSrc`). Para cambiar el logo, reemplaza el import del SVG.
- `assets/`: imágenes estáticas de la marca. `logo-placeholder.svg` es provisional hasta tener el logo definitivo.
