<template>
  <section class="conversation-empty-state" aria-labelledby="open-gpt-greeting">
    <h1 id="open-gpt-greeting">今天在想什么？</h1>
  </section>
</template>

<style scoped>
.conversation-empty-state {
  display: flex;
  width: min(100%, 760px);
  align-items: center;
  justify-content: center;
  padding: clamp(2rem, 8vh, 5rem) 1.25rem 7rem;
  text-align: center;
}

.conversation-empty-state h1 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.7rem, 4vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.25;
}
</style>
