export type PrototypeAttachment = {
  id: string
  name: string
  size: number
}

export type PrototypeMessage = {
  id: string
  role: "user"
  content: string
  createdAt: string
  attachments: PrototypeAttachment[]
}

export type PrototypeConversation = {
  id: string
  title: string
  updatedAt: string
  messages: PrototypeMessage[]
}
