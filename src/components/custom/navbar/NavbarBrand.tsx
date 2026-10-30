import { Link } from "react-router"

import { BRAND } from "@/App/utils/brand"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

import { focusRing } from "./navbar.styles"

const NavbarBrand = () => {
  return (
    <Link
      to="/"
      aria-label={`${BRAND.name}, ir al inicio`}
      className={cn("flex shrink-0 items-center gap-3 rounded-md", focusRing)}
    >
      <img
        src={BRAND.logoSrc}
        alt=""
        width={48}
        height={48}
        className="size-12 object-contain"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            typography.headlineSm,
            "leading-5 font-bold tracking-tight text-white"
          )}
        >
          {BRAND.name}
        </span>
        <span
          className={cn(
            typography.labelSm,
            "mt-0.5 font-medium text-white/70 uppercase"
          )}
        >
          {BRAND.tagline}
        </span>
      </span>
    </Link>
  )
}

export default NavbarBrand
