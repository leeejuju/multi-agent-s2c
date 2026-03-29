<!-- <template>
  <Transition name="slide-up">
    <div v-if="isOpen" class="model-popover">
      <div class="popover-inner">
        <div class="popover-header">
          <span>选择模型</span>
        </div>
        <div class="model-list">
          <div 
            v-for="model in models" 
            :key="model.id" 
            class="model-item"
            :class="{ active: currentModelId === model.id }"
            @click="selectModel(model.id)"
          >
            <div class="model-icon">
              <Bot :size="16" />
            </div>
            <div class="model-info">
              <span class="model-name">{{ model.name }}</span>
            </div>
            <Check v-if="currentModelId === model.id" :size="14" class="check-icon" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Bot, Check } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
  currentModelId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', id: string): void
}>()

const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-3.5', name: 'GPT-3.5' },
  { id: 'claude-3.5', name: 'Claude 3.5' },
  { id: 'deepseek', name: 'DeepSeek' }
]

const selectModel = (id: string) => {
  emit('select', id)
  emit('close')
}

// 点击外部关闭逻辑
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (props.isOpen && !target.closest('.model-selector-wrapper')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.model-popover {
  position: absolute;
  bottom: calc(100% + 8px); /* 弹出在按钮上方 */
  right: 0;
  z-index: 50;
  width: 180px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.popover-inner {
  display: flex;
  flex-direction: column;
}

.popover-header {
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.model-list {
  padding: 4px;
}

.model-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.model-item:hover {
  background: #f1f5f9;
}

.model-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.model-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.active .model-icon {
  color: #3b82f6;
}

.model-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.check-icon {
  flex-shrink: 0;
}

/* 动画效果 */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.2s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.95);
}
</style> -->
