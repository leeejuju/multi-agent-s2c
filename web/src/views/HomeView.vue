<script setup lang="ts">
import SidebarComponent from "@/components/SidebarComponent.vue"
import GridCanvas from "@/components/GridCanvas.vue"
import DynamicIsland from "@/components/DynamicIsland.vue"
import AgentChatComponent from "@/components/AgentChatComponent.vue"
</script>

<template>
  <div
    class="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_8%_0%,#ffffff_0%,#f5f9ff_28%,transparent_52%),radial-gradient(circle_at_90%_12%,#eff6ff_0%,transparent_34%),#f4f7fb] text-slate-900">
    <div class="absolute inset-0 z-0">
      <GridCanvas />
    </div>

    <div class="relative z-10 flex h-full w-full pointer-events-none transition-all duration-300">
      <SidebarComponent />

      <div class="relative h-full flex-1 pointer-events-none">
        <div class="absolute inset-0 flex pointer-events-none">
          <main class="flex-1 p-4 lg:p-6 pointer-events-none">
            <DynamicIsland />
          </main>

          <AgentChatComponent />
        </div>
      </div>
    </div>
  </div>
</template>
