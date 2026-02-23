export type NavItem = {
  label: string
  path: string
}

export const navigationItems: NavItem[] = [
  { label: "Dashboard", path: "/" },
  { label: "Search History", path: "/search-history" },
  { label: "Settings", path: "/settings" },
]
