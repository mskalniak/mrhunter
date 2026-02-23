import { Route, Routes, Navigate } from "react-router-dom"
import { AppLayout } from "@/layouts/app-layout"
import { LoginPage, AuthGuard } from "@/features/auth"
import { useAuth } from "@/features/auth"

function LoginRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Dashboard coming soon</div>} />
        </Route>
      </Route>
    </Routes>
  )
}
