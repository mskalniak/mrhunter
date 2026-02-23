import { useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi } from "@/lib/mock-api"
import type { CreateNoteInput } from "@/features/notes/types"

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateNoteInput) => notesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}
