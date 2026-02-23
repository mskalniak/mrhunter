import { QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/features/auth"
import { configureApi } from "@solomakers/shared"
import { supabase } from "@/lib/supabase"
import { AppRoutes } from "@/routes"

function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL
  if (configured) return configured
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`
  }
  return "http://localhost:3001"
}

configureApi({
  apiUrl: getApiUrl,
  authToken: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider supabase={supabase}>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
