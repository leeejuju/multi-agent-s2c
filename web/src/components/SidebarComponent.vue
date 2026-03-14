<script setup lang="ts">
import { ref } from "vue"
import { Home, LineChart, Settings } from "lucide-vue-next"

const activeMenu = ref("overview")

const menuItems = [
  { key: "overview", label: "首页概览", icon: Home },
  { key: "analysis", label: "数据分析", icon: LineChart },
  { key: "settings", label: "系统设置", icon: Settings },
]

const handleSelect = (key: string) => {
  activeMenu.value = key
}
</script>

<template>
  <aside class="sidebar glass-panel">
    <div class="sidebar-nav">
      <div v-for="item in menuItems" :key="item.key" class="nav-item group"
        :class="{ 'is-active': activeMenu === item.key }" @click="handleSelect(item.key)">
        <component :is="item.icon" :size="20" :stroke-width="2.5" />

        <!-- Tooltip Text -->
        <span class="tooltip-text">
          {{ item.label }}
        </span>
        <!-- Tooltip Arrow -->
        <span class="tooltip-arrow" />
      </div>
    </div>
  </aside>
</template>

<style>
@reference "tailwindcss";

.sidebar {
  @apply pointer-events-auto ml-6 my-auto flex w-14 flex-col items-center self-center rounded-[32px] py-6 transition-all duration-300;
}

.sidebar-nav {
  @apply flex w-full flex-col items-center gap-4;
}

.nav-item {
  @apply relative flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] text-slate-500 transition-all duration-200;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover {
  @apply bg-slate-100 text-slate-900 scale-105;
}

.nav-item.is-active {
  @apply bg-black text-white scale-105;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip-text {
  @apply pointer-events-none absolute left-full ml-3.5 whitespace-nowrap rounded-md bg-black px-2.5 py-1.5 text-xs text-white opacity-0 translate-x-[-10px] transition-all duration-200;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-arrow {
  @apply pointer-events-none absolute left-full ml-1.5 h-0 w-0 border-y-[4px] border-y-transparent border-r-[4px] border-r-black opacity-0 translate-x-[-10px] transition-all duration-200;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover .tooltip-text,
.nav-item:hover .tooltip-arrow {
  @apply opacity-100 translate-x-0;
}
</style>
