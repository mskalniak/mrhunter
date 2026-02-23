import type { Note, CreateNoteInput, UpdateNoteInput } from "@/features/notes/types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let notes: Note[] = [
  {
    id: "1",
    title: "Getting Started",
    content: "Welcome to SoloMakers! This is a sample note to demonstrate the Notes feature.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Adding Features",
    content: "Each feature is a self-contained module in the features/ folder. Create a new folder, add hooks, components, types, and routes.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

let nextId = 3

export const notesApi = {
  async getAll(): Promise<Note[]> {
    await delay(200)
    return [...notes]
  },

  async getById(id: string): Promise<Note> {
    await delay(200)
    const note = notes.find((n) => n.id === id)
    if (!note) throw new Error(`Note with id ${id} not found`)
    return { ...note }
  },

  async create(input: CreateNoteInput): Promise<Note> {
    await delay(200)
    const note: Note = {
      id: String(nextId++),
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    notes.push(note)
    return { ...note }
  },

  async update(id: string, input: UpdateNoteInput): Promise<Note> {
    await delay(200)
    const index = notes.findIndex((n) => n.id === id)
    if (index === -1) throw new Error(`Note with id ${id} not found`)
    notes[index] = {
      ...notes[index],
      ...input,
      updatedAt: new Date().toISOString(),
    }
    return { ...notes[index] }
  },

  async delete(id: string): Promise<void> {
    await delay(200)
    const index = notes.findIndex((n) => n.id === id)
    if (index === -1) throw new Error(`Note with id ${id} not found`)
    notes.splice(index, 1)
  },
}
