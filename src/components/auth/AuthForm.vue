<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { ArrowRight, CircleCheck, LockKeyhole, Mail } from "@lucide/vue"
import { RouterLink } from "vue-router"

type AuthMode = "login" | "register"

const props = defineProps<{
  mode: AuthMode
}>()

const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const errorMessage = ref("")
const previewMessage = ref("")
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isRegister = computed(() => props.mode === "register")
const title = computed(() =>
  isRegister.value ? "创建账号" : "欢迎回来",
)
const description = computed(() =>
  isRegister.value
    ? "使用邮箱注册 OpenGPT"
    : "使用邮箱登录 OpenGPT",
)
const submitLabel = computed(() => "继续")
const alternatePath = computed(() => (isRegister.value ? "/login" : "/register"))
const alternateLead = computed(() =>
  isRegister.value ? "已经有账号？" : "还没有账号？",
)
const alternateAction = computed(() => (isRegister.value ? "去登录" : "创建账号"))

function clearFeedback() {
  errorMessage.value = ""
  previewMessage.value = ""
}

function submitPreview() {
  clearFeedback()

  if (!emailPattern.test(email.value.trim())) {
    errorMessage.value = "请输入有效的邮箱地址。"
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = "密码至少需要 6 位。"
    return
  }

  if (isRegister.value && password.value !== confirmPassword.value) {
    errorMessage.value = "两次输入的密码不一致。"
    return
  }

  previewMessage.value = "界面验证完成，接口将在下一阶段接入。"
}

watch(
  () => props.mode,
  () => {
    email.value = ""
    password.value = ""
    confirmPassword.value = ""
    clearFeedback()
  },
)
</script>

<template>
  <section class="auth-form-panel" :aria-labelledby="`auth-${props.mode}-title`">
    <div class="auth-form-panel__heading">
      <h2 :id="`auth-${props.mode}-title`">{{ title }}</h2>
      <p class="auth-form-panel__description">{{ description }}</p>
    </div>

    <form class="auth-form" novalidate @submit.prevent="submitPreview">
      <label class="auth-form__field">
        <span>邮箱</span>
        <span class="auth-form__control">
          <Mail aria-hidden="true" :size="17" :stroke-width="1.7" />
          <input
            v-model="email"
            autocomplete="email"
            inputmode="email"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
            @input="clearFeedback"
          >
        </span>
      </label>

      <label class="auth-form__field">
        <span>密码</span>
        <span class="auth-form__control">
          <LockKeyhole aria-hidden="true" :size="17" :stroke-width="1.7" />
          <input
            v-model="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            name="password"
            placeholder="至少 6 位"
            required
            type="password"
            @input="clearFeedback"
          >
        </span>
      </label>

      <label v-if="isRegister" class="auth-form__field">
        <span>确认密码</span>
        <span class="auth-form__control">
          <LockKeyhole aria-hidden="true" :size="17" :stroke-width="1.7" />
          <input
            v-model="confirmPassword"
            autocomplete="new-password"
            name="confirmPassword"
            placeholder="再次输入密码"
            required
            type="password"
            @input="clearFeedback"
          >
        </span>
      </label>

      <p
        v-if="errorMessage"
        class="auth-form__feedback auth-form__feedback--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <p
        v-if="previewMessage"
        class="auth-form__feedback auth-form__feedback--preview"
        role="status"
      >
        <CircleCheck aria-hidden="true" :size="17" :stroke-width="1.8" />
        <span>{{ previewMessage }}</span>
      </p>

      <button class="auth-form__submit" type="submit">
        <span>{{ submitLabel }}</span>
        <ArrowRight aria-hidden="true" :size="18" :stroke-width="1.8" />
      </button>
    </form>

    <p class="auth-form-panel__alternate">
      <span>{{ alternateLead }}</span>
      <RouterLink :to="alternatePath">{{ alternateAction }}</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.auth-form-panel {
  width: min(100%, 27rem);
}

.auth-form-panel__heading {
  margin-bottom: 2.25rem;
}

.auth-form-panel h2 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(2rem, 5vw, 2.4rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.auth-form-panel__description {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.75;
}

.auth-form {
  display: grid;
  gap: 1.15rem;
}

.auth-form__field {
  display: grid;
  gap: 0.55rem;
  color: var(--ink);
  font-size: 0.76rem;
  font-weight: 600;
}

.auth-form__control {
  display: flex;
  min-height: 3.15rem;
  align-items: center;
  gap: 0.75rem;
  padding-inline: 0.95rem;
  border: 1px solid #d9d9d9;
  border-radius: 0.7rem;
  background: var(--surface-muted);
  color: var(--muted);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.auth-form__control:focus-within {
  border-color: var(--accent);
  background: var(--surface);
}

.auth-form__control input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
}

.auth-form__control input::placeholder {
  color: var(--muted);
  opacity: 0.72;
}

.auth-form__feedback {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.auth-form__feedback--error {
  color: var(--danger);
}

.auth-form__feedback--preview {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.85rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--ink);
}

.auth-form__feedback--preview svg {
  flex: 0 0 auto;
  margin-top: 0.08rem;
  color: var(--accent);
}

.auth-form__submit {
  display: flex;
  min-height: 3.15rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.2rem;
  padding-inline: 1.05rem;
  border: 0;
  border-radius: 0.7rem;
  background: var(--ink);
  color: var(--surface);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 650;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.auth-form__submit:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.auth-form__submit:focus-visible,
.auth-form-panel__alternate a:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

.auth-form-panel__alternate {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 1.5rem 0 0;
  color: var(--muted);
  font-size: 0.8rem;
}

.auth-form-panel__alternate a {
  border-radius: 0.25rem;
  color: var(--accent);
  font-weight: 650;
  text-underline-offset: 0.2rem;
}

@media (max-width: 520px) {
  .auth-form-panel {
    width: 100%;
  }

  .auth-form-panel__heading {
    margin-bottom: 1.75rem;
  }

  .auth-form__control,
  .auth-form__submit {
    min-height: 3.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-form__control,
  .auth-form__submit {
    transition: none;
  }
}
</style>
