export type Note = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteInput = {
  title: string
  content: string
}

export type UpdateNoteInput = {
  title: string
  content: string
}
