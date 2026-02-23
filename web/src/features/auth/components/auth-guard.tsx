/**
 * AuthGuard Component
 *
 * A wrapper that protects routes from unauthenticated users.
 * If the user is not logged in, they get redirected to /login.
 * If they ARE logged in, the child routes render normally.
 *
 * Usage in routes:
 *   <Route element={<AuthGuard />}>
 *     <Route path="/notes" element={<NoteList />} />
 *   </Route>
 *
 * How it works:
 * - Uses the useAuth() hook to check login status
 * - While checking, shows a loading message
 * - If not logged in → redirect to /login
 * - If logged in → render the child routes via <Outlet />
 */

import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/features/auth/hooks/use-auth"

export function AuthGuard() {
  const { user, isLoading } = useAuth()

  // Still checking if the user is logged in (e.g. on page refresh)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Not logged in — send them to the login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in — render the protected content
  return <Outlet />
}
