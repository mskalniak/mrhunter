/**
 * Auth Feature — Public Exports
 *
 * This file controls what other parts of the app can import
 * from the auth feature. It keeps the feature's internal
 * structure private and provides a clean public API.
 */

export { AuthProvider, useAuth } from "./hooks/use-auth"
export { AuthGuard } from "./components/auth-guard"
export { LoginPage } from "./components/login-page"
export { useLogout } from "./hooks/use-logout"
