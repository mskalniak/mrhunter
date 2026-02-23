import { useQuery } from "@tanstack/react-query"
import { notesApi } from "@/lib/mock-api"

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: notesApi.getAll,
  })
}
