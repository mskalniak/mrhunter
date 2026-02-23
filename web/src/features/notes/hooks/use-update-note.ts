import { useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi } from "@/lib/mock-api"
import type { UpdateNoteInput } from "@/features/notes/types"

export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      notesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}
