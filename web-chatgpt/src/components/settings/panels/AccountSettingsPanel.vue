<script setup lang="ts">
import { RouterLink } from "vue-router"
</script>

<template>
  <section class="settings-panel" aria-labelledby="settings-account-title">
    <h3 id="settings-account-title" class="settings-panel__title">Account</h3>

    <div class="settings-list">
      <div class="settings-item">
        <span class="settings-item__label">Status</span>
        <span class="settings-item__value">Not logged in</span>
      </div>

      <div class="settings-item">
        <span class="settings-item__label">Account</span>
        <RouterLink class="settings-item__link" to="/login">Log in</RouterLink>
      </div>
    </div>
  </section>
</template>
