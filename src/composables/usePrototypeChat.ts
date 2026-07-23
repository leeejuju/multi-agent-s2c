import { computed, ref, watch } from "vue"

import type {
  PrototypeAttachment,
  PrototypeConversation,
  PrototypeMessage
} from "@/types/prototype"

const STORAGE_KEY = "opengpt.design.conversations.v1"

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeTitle = (content: string) => {
  const compact = content.replace(/\s+/g, " ").trim()
  if (!compact) return "含附件的新对话"
  return compact.length > 28 ? `${compact.slice(0, 28)}…` : compact
}

const readStoredConversations = (): PrototypeConversation[] => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is PrototypeConversation =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "title" in item &&
        "messages" in item &&
        Array.isArray(item.messages)
    )
  } catch {
    return []
  }
}

export const usePrototypeChat = () => {
  const conversations = ref<PrototypeConversation[]>(readStoredConversations())
  const activeConversationId = ref<string | null>(null)

  const activeConversation = computed(
    () =>
      conversations.value.find(
        (conversation) => conversation.id === activeConversationId.value
      ) ?? null
  )

  const messages = computed(() => activeConversation.value?.messages ?? [])

  watch(
    conversations,
    (value) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true }
  )

  const selectConversation = (conversationId: string | null) => {
    activeConversationId.value = conversations.value.some(
      (conversation) => conversation.id === conversationId
    )
      ? conversationId
      : null
  }

  const addMessage = (
    content: string,
    attachments: PrototypeAttachment[]
  ): string => {
    const now = new Date().toISOString()
    const message: PrototypeMessage = {
      id: makeId(),
      role: "user",
      content,
      createdAt: now,
      attachments
    }

    const current = activeConversation.value
    if (current) {
      current.messages.push(message)
      current.updatedAt = now
      conversations.value = [
        current,
        ...conversations.value.filter(
          (conversation) => conversation.id !== current.id
        )
      ]
      return current.id
    }

    const conversation: PrototypeConversation = {
      id: makeId(),
      title: normalizeTitle(content),
      updatedAt: now,
      messages: [message]
    }
    conversations.value.unshift(conversation)
    activeConversationId.value = conversation.id
    return conversation.id
  }

  const startNewConversation = () => {
    activeConversationId.value = null
  }

  return {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    addMessage,
    selectConversation,
    startNewConversation
  }
}
