import { Route, Routes, Navigate } from "react-router-dom"
import { AppLayout } from "@/layouts/app-layout"
import { LoginPage, AuthGuard } from "@/features/auth"
import { useAuth } from "@/features/auth"
import { useIcp, Onboarding, OnboardingForm, LeadsDashboard, Settings, SearchHistory } from "@/features/leads"

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

function DashboardOrOnboarding() {
  const { data: icp, isLoading } = useIcp()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!icp) {
    return <Onboarding />
  }

  return <LeadsDashboard />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardOrOnboarding />} />
          <Route path="/onboarding/form" element={<OnboardingForm />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/search-history" element={<SearchHistory />} />
        </Route>
      </Route>
    </Routes>
  )
}
