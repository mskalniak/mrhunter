import { Route } from "react-router-dom"
import { NoteList } from "./components/note-list"
import { NoteForm } from "./components/note-form"
import { NoteDetail } from "./components/note-detail"

export function NotesRoutes() {
  return (
    <>
      <Route path="/notes" element={<NoteList />} />
      <Route path="/notes/new" element={
        <div>
          <h1 className="mb-6 text-3xl font-bold">New Note</h1>
          <NoteForm />
        </div>
      } />
      <Route path="/notes/:id" element={<NoteDetail />} />
    </>
  )
}
