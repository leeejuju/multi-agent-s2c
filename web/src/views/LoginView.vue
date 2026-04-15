<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const router = useRouter()
const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = 'Please fill in all fields.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await authApi.login({
      username: username.value,
      password: password.value,
    })

    // Store token
    localStorage.setItem('access_token', response.access_token)
    localStorage.setItem('user', JSON.stringify(response.user))

    // Redirect to home
    router.push({ name: 'home' })
  } catch (error: any) {
    errorMessage.value = error.message || 'Login failed. Please check your credentials.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="header">
        <div class="logo-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h2 class="title">Welcome back</h2>
        <p class="subtitle">Log in to your account to continue</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-groups">
          <div class="form-group">
            <label for="username" class="label">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autocomplete="username"
              required
              v-model="username"
              class="input-field"
              placeholder="Your username"
            />
          </div>
          <div class="form-group">
            <label for="password" class="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              v-model="password"
              class="input-field"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="submit-container">
          <button
            type="submit"
            :disabled="isLoading"
            class="submit-button"
          >
            <span v-if="isLoading" class="loader-container">
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ isLoading ? 'Logging in...' : 'Log in' }}
          </button>
        </div>

        <div class="footer">
          <p class="footer-text">
            Don't have an account?
            <router-link :to="{ name: 'register' }" class="signup-link">
              Sign up
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.login-page {
  @apply min-h-screen flex items-center justify-center bg-[var(--claude-bg)] px-4 py-12;
}

.login-card {
  @apply w-full max-w-md space-y-8;
}

.header {
  @apply text-center;
}

.logo-box {
  @apply mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--claude-primary)] text-white shadow-sm mb-6;
}

.title {
  @apply text-4xl text-[var(--claude-text)] tracking-tight font-serif;
}

.subtitle {
  @apply mt-3 text-[var(--claude-muted)] font-medium;
}

.login-form {
  @apply mt-8 space-y-6;
}

.form-groups {
  @apply space-y-4;
}

.form-group {
  @apply flex flex-col;
}

.label {
  @apply block text-sm font-medium text-[var(--claude-text)] mb-1;
}

.input-field {
  @apply appearance-none block w-full px-4 py-3 border border-[var(--claude-border)] rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--claude-focus)] focus:border-transparent transition-all duration-200 bg-[var(--claude-input-bg)] text-[var(--claude-text)];
}

.error-message {
  @apply text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.submit-container {
  @apply w-full;
}

.submit-button {
  @apply relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[var(--claude-primary)] hover:bg-[var(--claude-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--claude-focus)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98];
}

.loader-container {
  @apply absolute left-0 inset-y-0 flex items-center pl-3;
}

.loader-container svg {
  @apply h-5 w-5 text-white;
}

.footer {
  @apply text-center;
}

.footer-text {
  @apply text-sm text-[var(--claude-muted)];
}

.signup-link {
  @apply font-semibold text-[var(--claude-primary)] hover:underline decoration-2 underline-offset-4;
}

.font-serif {
  font-family: Charter, 'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, Palatino, 'Book Antiqua', Georgia, serif;
}
</style>
