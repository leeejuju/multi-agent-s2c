<script setup lang="ts">
import { ref } from "vue"
import { Orbit } from "lucide-vue-next"
const isCollapsed = ref(true)
defineProps({
  agents: {
    type: Array,
    default: () => [],
  },
  subtitle: {
    type: String,
    default: "拖拽工作流到此处",
  },
})
const toggleIsland = () => {
  isCollapsed.value = !isCollapsed.value
}

</script>

<template>
  <div class="island-wrapper">
    <header class="island glass-panel" @click="toggleIsland">
      <!-- Expanded content -->
      <div class="island-content" :class="{ visible: !isCollapsed }">
        <h1 class="island-title">灵动岛</h1>
        <p class="island-subtitle">拖拽工作流到此处</p>
      </div>

      <!-- Collapsed icon -->
      <div class="island-icon" :class="{ visible: isCollapsed }">
        <Orbit :size="24" :stroke-width="2" />
      </div>
    </header>
  </div>
</template>

<style scoped>
.island-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100px;
  margin-bottom: auto;
  pointer-events: none;
}

.island {
  pointer-events: auto;
  position: absolute;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;

  /* Default: collapsed circle */
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  padding: 0;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);

  /* Smooth transition for collapse without overshoot */
  transition:
    all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover => expand to capsule */
.island:hover {
  width: 480px;
  height: 100px;
  border-radius: 9999px;
  padding: 20px 32px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);

  /* Silky spring transition for expansion */
  transition:
    all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Shared fade layer base */
.island-content,
.island-icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.island-content {
  flex-direction: column;
}

/* Show when visible class is applied */
.island-content.visible,
.island-icon.visible {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0.1s;
}

/* Cross-fade on hover: hide icon, show content */
.island:hover .island-icon {
  opacity: 0 !important;
  pointer-events: none;
  transition-delay: 0s;
}

.island:hover .island-content {
  opacity: 1 !important;
  pointer-events: auto;
  transition-delay: 0.15s;
}

/* Typography */
.island-title {
  margin-bottom: 8px;
  font-size: 1.15rem;
  font-weight: 600;
  color: #0f172a;
}

.island-subtitle {
  font-size: 0.85rem;
  color: #475569;
}
</style>
