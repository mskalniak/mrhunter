import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LogOut, LayoutGrid, Settings } from "lucide-react"
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
      <div className="app-bg">
        <div className="app-blob app-blob-1" />
        <div className="app-blob app-blob-2" />
        <div className="app-blob app-blob-3" />
      </div>

      <header className="app-navbar-wrapper">
        <nav className="app-navbar">
          <Link to="/" className="app-brand-group">
            <div className="app-brand-text">
              <span className="app-brand-name">Cauliflower</span>
              <span className="app-brand-sub">Lead Intelligence</span>
            </div>
          </Link>

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

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-bottom-nav">
        <div className="app-bottom-bar">
          <Link
            to="/"
            className={`app-bottom-btn ${location.pathname === "/" ? "app-bottom-btn-active" : ""}`}
          >
            <LayoutGrid size={22} />
          </Link>
          <Link
            to="/settings"
            className={`app-bottom-btn ${location.pathname === "/settings" ? "app-bottom-btn-active" : ""}`}
          >
            <Settings size={22} />
          </Link>
        </div>
      </nav>
    </div>
  )
}
