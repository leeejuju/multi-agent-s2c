<script setup lang="ts">
import type { Component } from "vue"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import AgentView from "@/components/app-views/AgentView.vue"
import ImageView from "@/components/app-views/ImageView.vue"
import LibraryView from "@/components/app-views/LibraryView.vue"
import SandboxView from "@/components/app-views/SandboxView.vue"
import StaticView from "@/components/app-views/StaticView.vue"
import ConversationSurface from "@/components/chat/ConversationSurface.vue"
import ConversationSearchDialog from "@/components/dialogs/ConversationSearchDialog.vue"
import OpenGptShell from "@/components/layout/OpenGptShell.vue"
import SettingsDialog from "@/components/settings/SettingsDialog.vue"
import OpenGptSidebar from "@/components/sidebar/OpenGptSidebar.vue"
import { usePrototypeChat } from "@/composables/usePrototypeChat"
import type { AppViewId } from "@/types/navigation"
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
const settingsOpen = ref(false)
const isNarrowViewport = ref(false)
const activeAppView = ref<AppViewId | null>(null)

let viewportQuery: MediaQueryList | null = null

const appViewComponents: Record<AppViewId, Component> = {
  library: LibraryView,
  agent: AgentView,
  image: ImageView,
  static: StaticView,
  sandbox: SandboxView,
}

const isPreviewNoticeVisible = computed(() => messages.value.length > 0)
const headerSidebarCollapsed = computed(
  () => isNarrowViewport.value || sidebarCollapsed.value
)
const activeAppViewComponent = computed(() =>
  activeAppView.value ? appViewComponents[activeAppView.value] : null
)

const currentRouteConversationId = computed(() => {
  const value = route.params.conversationId

  return typeof value === "string" ? value : null
})

watch(
  currentRouteConversationId,
  (conversationId) => {
    activeAppView.value = null
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
  activeAppView.value = null
  startNewConversation()
  draft.value = ""
  attachments.value = []
  mobileSidebarOpen.value = false
  await router.push({ name: "chat" })
}

const openConversation = async (conversationId: string) => {
  activeAppView.value = null
  selectConversation(conversationId)
  mobileSidebarOpen.value = false
  await router.push({
    name: "conversation",
    params: { conversationId }
  })
}

const openAppView = async (appView: AppViewId) => {
  mobileSidebarOpen.value = false

  if (route.name !== "chat") {
    await router.push({ name: "chat" })
  }

  activeAppView.value = appView
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
        :active-conversation-id="
          activeAppView ? null : activeConversationId
        "
        :active-app-view="activeAppView"
        :mobile-open="mobileSidebarOpen"
        @new-conversation="openNewConversation"
        @search="searchDialogOpen = true"
        @select-app-view="openAppView"
        @select-conversation="openConversation"
        @open-settings="settingsOpen = true"
        @close-mobile="mobileSidebarOpen = false"
      />
    </template>

    <component
      :is="activeAppViewComponent"
      v-if="activeAppViewComponent"
      :sidebar-collapsed="headerSidebarCollapsed"
      @toggle-sidebar="toggleSidebar"
    />

    <ConversationSurface
      v-else
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

  <SettingsDialog
    :open="settingsOpen"
    @close="settingsOpen = false"
  />
</template>
