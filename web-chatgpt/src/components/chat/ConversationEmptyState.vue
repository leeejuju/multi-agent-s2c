<template>
  <section class="conversation-empty-state" aria-labelledby="open-gpt-greeting">
    <h1 id="open-gpt-greeting">What's on your mind today?</h1>
  </section>
</template>

<style scoped>
.conversation-empty-state {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 0 0 0.75rem;
  text-align: center;
}

.conversation-empty-state h1 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.75rem, 4vw, 2.15rem);
  font-weight: 550;
  letter-spacing: -0.03em;
  line-height: 1.25;
}
</style>
