import { useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi } from "@/lib/mock-api"

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}
