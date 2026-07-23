<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import ConversationSurface from "@/components/chat/ConversationSurface.vue"
import ConversationSearchDialog from "@/components/dialogs/ConversationSearchDialog.vue"
import PreviewInfoDialog from "@/components/dialogs/PreviewInfoDialog.vue"
import OpenGptShell from "@/components/layout/OpenGptShell.vue"
import OpenGptSidebar from "@/components/sidebar/OpenGptSidebar.vue"
import { usePrototypeChat } from "@/composables/usePrototypeChat"
import type { PrototypeAttachment } from "@/types/prototype"

const route = useRoute()
const router = useRouter()

const {
  conversations,
  activeConversationId,
  messages,
  addMessage,
  selectConversation,
  startNewConversation
} = usePrototypeChat()

const draft = ref("")
const attachments = ref<PrototypeAttachment[]>([])
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const searchDialogOpen = ref(false)
const previewInfoOpen = ref(false)
const isNarrowViewport = ref(false)

let viewportQuery: MediaQueryList | null = null

const isPreviewNoticeVisible = computed(() => messages.value.length > 0)
const headerSidebarCollapsed = computed(
  () => isNarrowViewport.value || sidebarCollapsed.value
)

const currentRouteConversationId = computed(() => {
  const value = route.params.conversationId

  return typeof value === "string" ? value : null
})

watch(
  currentRouteConversationId,
  (conversationId) => {
    selectConversation(conversationId)
  },
  { immediate: true }
)

const updateViewport = (event?: MediaQueryListEvent) => {
  isNarrowViewport.value = event?.matches ?? viewportQuery?.matches ?? false
  if (!isNarrowViewport.value) mobileSidebarOpen.value = false
}

onMounted(() => {
  viewportQuery = window.matchMedia("(max-width: 900px)")
  updateViewport()
  viewportQuery.addEventListener("change", updateViewport)
})

onBeforeUnmount(() => {
  viewportQuery?.removeEventListener("change", updateViewport)
})

const makeAttachmentId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const handleFilesSelected = (files: File[]) => {
  const existing = new Set(
    attachments.value.map(
      (attachment) => `${attachment.name}:${attachment.size}`
    )
  )

  const additions = files
    .filter((file) => !existing.has(`${file.name}:${file.size}`))
    .map((file) => ({
      id: makeAttachmentId(),
      name: file.name,
      size: file.size
    }))

  attachments.value = [...attachments.value, ...additions].slice(0, 8)
}

const removeAttachment = (attachmentId: string) => {
  attachments.value = attachments.value.filter(
    (attachment) => attachment.id !== attachmentId
  )
}

const submitLocalMessage = async () => {
  const content = draft.value.trim()
  if (!content && attachments.value.length === 0) return

  const conversationId = addMessage(content, [...attachments.value])
  draft.value = ""
  attachments.value = []

  if (route.params.conversationId !== conversationId) {
    await router.push({
      name: "conversation",
      params: { conversationId }
    })
  }
}

const openNewConversation = async () => {
  startNewConversation()
  draft.value = ""
  attachments.value = []
  mobileSidebarOpen.value = false
  await router.push({ name: "chat" })
}

const openConversation = async (conversationId: string) => {
  selectConversation(conversationId)
  mobileSidebarOpen.value = false
  await router.push({
    name: "conversation",
    params: { conversationId }
  })
}

const toggleSidebar = () => {
  if (isNarrowViewport.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
    return
  }
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <OpenGptShell
    :sidebar-collapsed="sidebarCollapsed"
    :mobile-sidebar-open="mobileSidebarOpen"
    @close-mobile="mobileSidebarOpen = false"
  >
    <template #sidebar>
      <OpenGptSidebar
        :conversations="conversations"
        :active-conversation-id="activeConversationId"
        :mobile-open="mobileSidebarOpen"
        @new-conversation="openNewConversation"
        @search="searchDialogOpen = true"
        @select-conversation="openConversation"
        @open-settings="previewInfoOpen = true"
        @close-mobile="mobileSidebarOpen = false"
      />
    </template>

    <ConversationSurface
      :messages="messages"
      :attachments="attachments"
      :draft="draft"
      :sidebar-collapsed="headerSidebarCollapsed"
      :is-preview-notice-visible="isPreviewNoticeVisible"
      @update:draft="draft = $event"
      @submit="submitLocalMessage"
      @files-selected="handleFilesSelected"
      @remove-attachment="removeAttachment"
      @toggle-sidebar="toggleSidebar"
      @new-conversation="openNewConversation"
    />
  </OpenGptShell>

  <ConversationSearchDialog
    :open="searchDialogOpen"
    :conversations="conversations"
    @close="searchDialogOpen = false"
    @select="openConversation"
  />

  <PreviewInfoDialog
    :open="previewInfoOpen"
    @close="previewInfoOpen = false"
  />
</template>
