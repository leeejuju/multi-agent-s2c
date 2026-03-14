<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

type GridNode = {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
}

const WORLD_WIDTH = 2400
const WORLD_HEIGHT = 1400
const WORLD_PADDING = 20
const GRID_SIZE = 24
const MIN_SCALE = 0.8
const MAX_SCALE = 1.2
const ZOOM_STEP = 0.08

const viewportRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const panX = ref(28)
const panY = ref(28)
const scale = ref(1)

const nodes = ref<GridNode[]>([
  { id: "agent-1", title: "Planner", x: 120, y: 120, width: 200, height: 96 },
  { id: "agent-2", title: "Executor", x: 384, y: 120, width: 200, height: 96 },
  { id: "agent-3", title: "Memory", x: 120, y: 288, width: 200, height: 96 },
])

const panState = ref({
  active: false,
  pointerId: -1,
  startClientX: 0,
  startClientY: 0,
  originPanX: 0,
  originPanY: 0,
})

const dragState = ref({
  active: false,
  pointerId: -1,
  nodeId: "",
  startClientX: 0,
  startClientY: 0,
  originNodeX: 0,
  originNodeY: 0,
})

const workspaceStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
}))

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

const findNodeById = (id: string) => nodes.value.find((node) => node.id === id)

const refreshViewport = () => {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }
  viewportWidth.value = rect.width
  viewportHeight.value = rect.height
  clampPanToBounds()
}

const clampPanToBounds = () => {
  const scaledWorldWidth = WORLD_WIDTH * scale.value
  const scaledWorldHeight = WORLD_HEIGHT * scale.value

  const minPanX = viewportWidth.value - scaledWorldWidth - WORLD_PADDING
  const maxPanX = WORLD_PADDING
  const minPanY = viewportHeight.value - scaledWorldHeight - WORLD_PADDING
  const maxPanY = WORLD_PADDING

  panX.value = clamp(panX.value, Math.min(minPanX, maxPanX), Math.max(minPanX, maxPanX))
  panY.value = clamp(panY.value, Math.min(minPanY, maxPanY), Math.max(minPanY, maxPanY))
}

const stopPan = (pointerId: number) => {
  if (!panState.value.active) {
    return
  }
  panState.value.active = false
  viewportRef.value?.releasePointerCapture(pointerId)
}

const stopNodeDrag = (pointerId: number) => {
  if (!dragState.value.active) {
    return
  }
  dragState.value.active = false
  dragState.value.nodeId = ""
  viewportRef.value?.releasePointerCapture(pointerId)
}

const onViewportPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }
  if ((event.target as HTMLElement | null)?.closest(".grid-node")) {
    return
  }
  if (!event.ctrlKey && !event.metaKey) {
    return
  }

  panState.value = {
    active: true,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originPanX: panX.value,
    originPanY: panY.value,
  }
  viewportRef.value?.setPointerCapture(event.pointerId)
}

const onNodePointerDown = (node: GridNode, event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  dragState.value = {
    active: true,
    pointerId: event.pointerId,
    nodeId: node.id,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originNodeX: node.x,
    originNodeY: node.y,
  }
  viewportRef.value?.setPointerCapture(event.pointerId)
}

const onViewportPointerMove = (event: PointerEvent) => {
  if (dragState.value.active && event.pointerId === dragState.value.pointerId) {
    const node = findNodeById(dragState.value.nodeId)
    if (!node) {
      return
    }

    const deltaWorldX = (event.clientX - dragState.value.startClientX) / scale.value
    const deltaWorldY = (event.clientY - dragState.value.startClientY) / scale.value

    const rawX = dragState.value.originNodeX + deltaWorldX
    const rawY = dragState.value.originNodeY + deltaWorldY
    const maxX = WORLD_WIDTH - node.width
    const maxY = WORLD_HEIGHT - node.height

    node.x = clamp(snapToGrid(rawX), 0, maxX)
    node.y = clamp(snapToGrid(rawY), 0, maxY)
    return
  }

  if (panState.value.active && event.pointerId === panState.value.pointerId) {
    const deltaX = event.clientX - panState.value.startClientX
    const deltaY = event.clientY - panState.value.startClientY
    panX.value = panState.value.originPanX + deltaX
    panY.value = panState.value.originPanY + deltaY
    clampPanToBounds()
  }
}

const onViewportPointerUp = (event: PointerEvent) => {
  if (dragState.value.active && event.pointerId === dragState.value.pointerId) {
    stopNodeDrag(event.pointerId)
    return
  }
  if (panState.value.active && event.pointerId === panState.value.pointerId) {
    stopPan(event.pointerId)
  }
}

const onViewportWheel = (event: WheelEvent) => {
  event.preventDefault()
  if (!viewportRef.value) {
    return
  }

  if (!event.ctrlKey && !event.metaKey) {
    panX.value -= event.deltaX
    panY.value -= event.deltaY
    clampPanToBounds()
    return
  }

  const oldScale = scale.value
  const direction = event.deltaY < 0 ? 1 : -1
  const nextScale = clamp(oldScale + direction * ZOOM_STEP, MIN_SCALE, MAX_SCALE)

  if (nextScale === oldScale) {
    return
  }

  const rect = viewportRef.value.getBoundingClientRect()
  const cursorX = event.clientX - rect.left
  const cursorY = event.clientY - rect.top
  const worldX = (cursorX - panX.value) / oldScale
  const worldY = (cursorY - panY.value) / oldScale

  scale.value = nextScale
  panX.value = cursorX - worldX * nextScale
  panY.value = cursorY - worldY * nextScale
  clampPanToBounds()
}

onMounted(() => {
  refreshViewport()
  window.addEventListener("resize", refreshViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", refreshViewport)
})
</script>

<template>
  <section ref="viewportRef" class="relative h-full w-full overflow-hidden bg-[#fdfbf7]"
    :class="{ 'cursor-grabbing': panState.active }" @pointerdown="onViewportPointerDown"
    @pointermove="onViewportPointerMove" @pointerup="onViewportPointerUp" @pointercancel="onViewportPointerUp"
    @wheel="onViewportWheel">
    <div
      class="absolute left-0 top-0 h-[1400px] w-[2400px] origin-top-left bg-[radial-gradient(circle,rgba(160,150,140,0.25)_1.5px,transparent_1.5px)] bg-[length:24px_24px]"
      :style="workspaceStyle">
      <div
        class="pointer-events-none absolute inset-0 rounded-[14px] border-2 border-dashed border-[rgba(160,150,140,0.2)]"
        aria-hidden="true" />

      <article v-for="node in nodes" :key="node.id"
        class="grid-node absolute flex select-none flex-col justify-center gap-[0.4rem] rounded-[16px] border border-black/5 bg-white/95 p-[1rem_1.2rem] backdrop-blur-xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,1),inset_0_0_0_1px_rgba(255,255,255,0.5)] transition-[box-shadow,transform] duration-200 before:absolute before:inset-y-0 before:left-0 before:w-[6px] before:rounded-l-[16px] before:bg-gradient-to-b before:from-[#4facfe] before:to-[#00f2fe] before:content-[''] hover:-translate-y-0.5 hover:shadow-[0_12px_20px_-4px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1),inset_0_0_0_1px_rgba(255,255,255,0.5)] active:translate-y-0 active:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] cursor-grab active:cursor-grabbing"
        :style="{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
        }" @pointerdown.stop="onNodePointerDown(node, $event)">
        <h4 class="m-0 pl-2 text-[1.05rem] font-bold text-slate-800">{{ node.title }}</h4>
        <p class="m-0 pl-2 text-[0.8rem] text-slate-500">{{ node.id }}</p>
      </article>
    </div>
  </section>
</template>
