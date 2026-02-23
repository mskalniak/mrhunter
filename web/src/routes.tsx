/**
 * App Routes
 *
 * This file defines all the pages (routes) in the application.
 *
 * Route structure:
 * - /login → Login page (public, no auth required)
 * - / → Home page (protected by AuthGuard)
 * - /notes → Notes feature (protected by AuthGuard)
 *
 * The AuthGuard wrapper ensures that all routes inside it
 * require the user to be logged in. If not, they get
 * redirected to /login automatically.
 */

import { Route, Routes, Navigate } from "react-router-dom"
import { AppLayout } from "@/layouts/app-layout"
import { LoginPage, AuthGuard } from "@/features/auth"
import { useAuth } from "@/features/auth"
import { NotesRoutes } from "@/features/notes"
import { Dashboard, AddHabit, EditHabit } from "@/features/habits"

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-habit" element={<AddHabit />} />
          <Route path="/edit-habit/:id" element={<EditHabit />} />
          {NotesRoutes()}
        </Route>
      </Route>
    </Routes>
  )
}
