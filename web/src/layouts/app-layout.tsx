/**
 * App Layout — Glassmorphism Dashboard
 *
 * Navbar: BEYOND+ / LIFE HARMONY branding, user avatar pill
 * Bottom nav: Dashboard, Add Habit, Settings
 * Background: same gradient + animated blobs as login page
 */

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LogOut,
  LayoutGrid,
  Plus,
  Settings,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/auth"
import { useLogout } from "@/features/auth"

export function AppLayout() {
  const { user } = useAuth()
  const logout = useLogout()
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate("/login")
        toast.success("Signed out")
      },
      onError: () => {
        toast.error("Failed to sign out")
      },
    })
  }

  const initial = user?.email?.charAt(0).toUpperCase() || "?"
  const displayEmail = user?.email || "User"

  return (
    <div className="app-shell">
      {/* Background */}
      <div className="app-bg">
        <div className="app-blob app-blob-1" />
        <div className="app-blob app-blob-2" />
        <div className="app-blob app-blob-3" />
      </div>

      {/* Top navbar */}
      <header className="app-navbar-wrapper">
        <nav className="app-navbar">
          {/* Left: Logo */}
          <Link to="/" className="app-brand-group">
            <div className="app-logo-icon">
              <div className="app-logo-diamond" />
              <div className="app-logo-inner" />
              <div className="app-logo-core" />
            </div>
            <div className="app-brand-text">
              <span className="app-brand-name">
                BEYOND<span className="app-brand-plus">+</span>
              </span>
              <span className="app-brand-sub">LIFE HARMONY</span>
            </div>
          </Link>

          {/* Right: Controls */}
          <div className="app-navbar-right">
            <button
              className="app-icon-btn"
              onClick={handleLogout}
              disabled={logout.isPending}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>

            <div className="app-user-pill">
              <div className="app-avatar">{initial}</div>
              <span className="app-user-name">{displayEmail}</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="app-bottom-nav">
        <div className="app-bottom-bar">
          <Link
            to="/"
            className={`app-bottom-btn ${location.pathname === "/" ? "app-bottom-btn-active" : ""}`}
          >
            <LayoutGrid size={22} />
          </Link>
          <button
            className="app-bottom-add"
            onClick={() => navigate("/add-habit")}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
          <button className="app-bottom-btn">
            <Settings size={22} />
          </button>
        </div>
      </nav>
    </div>
  )
}
