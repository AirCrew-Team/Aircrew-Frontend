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
        width={36}
        height={36}
        className="size-9 rounded-lg shadow-sm"
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
        <span className="mt-0.5 text-[10px] font-medium tracking-wider text-white/70 uppercase">
          {BRAND.tagline}
        </span>
      </span>
    </Link>
  )
}

export default NavbarBrand
