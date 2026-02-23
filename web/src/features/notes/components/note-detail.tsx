import { useParams } from "react-router-dom"
import { useNote } from "@/features/notes/hooks/use-note"
import { NoteForm } from "./note-form"

export function NoteDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: note, isLoading } = useNote(id!)

  if (isLoading) {
    return <p className="text-muted-foreground">Loading note...</p>
  }

  if (!note) {
    return <p className="text-muted-foreground">Note not found.</p>
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Edit Note</h1>
      <NoteForm note={note} />
    </div>
  )
}
