import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreateNote } from "@/features/notes/hooks/use-create-note"
import { useUpdateNote } from "@/features/notes/hooks/use-update-note"
import type { Note } from "@/features/notes/types"

type NoteFormProps = {
  note?: Note
}

export function NoteForm({ note }: NoteFormProps) {
  const navigate = useNavigate()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const isEditing = !!note

  const [title, setTitle] = useState(note?.title ?? "")
  const [content, setContent] = useState(note?.content ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    const input = { title: title.trim(), content: content.trim() }

    if (isEditing) {
      updateNote.mutate(
        { id: note.id, input },
        {
          onSuccess: () => {
            toast.success("Note updated")
            navigate("/notes")
          },
          onError: () => toast.error("Failed to update note"),
        }
      )
    } else {
      createNote.mutate(input, {
        onSuccess: () => {
          toast.success("Note created")
          navigate("/notes")
        },
        onError: () => toast.error("Failed to create note"),
      })
    }
  }

  const isPending = createNote.isPending || updateNote.isPending

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
        />
      </div>
      <div>
        <label htmlFor="content" className="mb-1 block text-sm font-medium">
          Content
        </label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={8}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : isEditing ? "Update Note" : "Create Note"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/notes")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
