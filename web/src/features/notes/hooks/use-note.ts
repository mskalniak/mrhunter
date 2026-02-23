import { useQuery } from "@tanstack/react-query"
import { notesApi } from "@/lib/mock-api"

export function useNote(id: string) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => notesApi.getById(id),
    enabled: !!id,
  })
}
